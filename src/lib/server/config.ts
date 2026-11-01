import fs from 'node:fs/promises';
import path from 'node:path';
import { parse, stringify } from 'smol-toml';
import type { PodsyncConfig, FeedConfig } from '$lib/types/config';

export function getConfigPath(): string {
  if (process.env.PODSYNC_CONFIG_PATH) {
    return process.env.PODSYNC_CONFIG_PATH;
  }
  // 프로덕션 컨테이너 환경의 기본 디렉터리 경로 (/app/config)
  if (process.env.NODE_ENV === 'production') {
    return '/app/config/config.toml';
  }
  // 로컬 개발 환경용 기본 후보 경로
  const localHostPath = '/Users/badugiss/work/badugiss/docker-mini26/services/podsync/config/config.toml';
  return localHostPath;
}

/**
 * 설정 파일을 안전하게 디스크에 저장합니다.
 * 1. 기본: 임시 파일(.tmp)을 생성한 후 fs.rename을 통한 원자적(Atomic) 교체 수행.
 * 2. Fallback: Docker 단일 파일 마운트 환경 등으로 인해 rename 시 EXDEV, EBUSY, EPERM 에러가 발생하는 경우,
 *    마운트 포인트(inode)를 유지하면서 기존 파일에 직접 덮어쓰기(In-place write)로 안전하게 자동 전환합니다.
 */
async function writeConfigFile(filePath: string, content: string): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  try {
    await fs.writeFile(tmpPath, content, 'utf-8');
    await fs.rename(tmpPath, filePath);
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'EXDEV' || error.code === 'EBUSY' || error.code === 'EPERM') {
      await fs.writeFile(filePath, content, 'utf-8');
      await fs.unlink(tmpPath).catch(() => {});
    } else {
      throw err;
    }
  }
}

export async function loadConfig(): Promise<{ config: PodsyncConfig; rawToml: string; path: string }> {
  const filePath = getConfigPath();
  try {
    const rawToml = await fs.readFile(filePath, 'utf-8');
    const parsed = parse(rawToml) as unknown as PodsyncConfig;
    return {
      config: parsed,
      rawToml,
      path: filePath
    };
  } catch (error) {
    // 파일이 없거나 읽기 실패 시 기본 템플릿 반환
    const fallbackConfig: PodsyncConfig = {
      server: { port: 8080, hostname: 'http://localhost:8080' },
      storage: { type: 'local' },
      feeds: {}
    };
    return {
      config: fallbackConfig,
      rawToml: stringify(fallbackConfig as Record<string, unknown>),
      path: filePath
    };
  }
}

export async function saveConfig(newConfig: PodsyncConfig): Promise<void> {
  const filePath = getConfigPath();
  const dir = path.dirname(filePath);

  // 디렉터리 존재 보장
  await fs.mkdir(dir, { recursive: true });

  // 1. 기존 정상 파일 백업 (.bak)
  try {
    await fs.copyFile(filePath, `${filePath}.bak`);
  } catch {
    // 기존 파일이 없을 수 있으므로 무시
  }

  // 2. TOML 직렬화
  const tomlString = stringify(newConfig as Record<string, unknown>);

  // 3. 임시 파일(.tmp) 작성 후 원자적 교체 (단일 파일 마운트 시 in-place 덮어쓰기 자동 fallback)
  await writeConfigFile(filePath, tomlString);
}

export async function getConfigMTime(): Promise<number> {
  const filePath = getConfigPath();
  try {
    const stat = await fs.stat(filePath);
    return stat.mtimeMs;
  } catch {
    return 0;
  }
}

export async function hasBackupConfig(): Promise<boolean> {
  const filePath = getConfigPath();
  try {
    await fs.access(`${filePath}.bak`);
    return true;
  } catch {
    return false;
  }
}

export async function getAppliedConfigToml(): Promise<string> {
  const filePath = getConfigPath();
  const appliedPath = `${filePath}.applied`;
  try {
    return await fs.readFile(appliedPath, 'utf-8');
  } catch {
    // applied 파일이 아직 없으면 현재 config.toml을 기준으로 복사하여 초기화
    try {
      const current = await fs.readFile(filePath, 'utf-8');
      await fs.writeFile(appliedPath, current, 'utf-8');
      return current;
    } catch {
      return '';
    }
  }
}

export async function markConfigAsApplied(): Promise<void> {
  const filePath = getConfigPath();
  const appliedPath = `${filePath}.applied`;
  try {
    await fs.copyFile(filePath, appliedPath);
  } catch {}
}

export async function rollbackToBackup(): Promise<boolean> {
  const filePath = getConfigPath();
  const backupPath = `${filePath}.bak`;
  try {
    await fs.copyFile(backupPath, filePath);
    return true;
  } catch {
    return false;
  }
}

export async function saveRawToml(rawToml: string): Promise<void> {
  const filePath = getConfigPath();
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  // 1. 최초 수정 전이라면 기존 상태를 .applied로 보존 (컨테이너 실행 기준점 보존)
  const appliedPath = `${filePath}.applied`;
  try {
    await fs.access(appliedPath);
  } catch {
    try {
      await fs.copyFile(filePath, appliedPath);
    } catch {}
  }

  // 2. 직전 백업 보존
  try {
    await fs.copyFile(filePath, `${filePath}.bak`);
  } catch {}

  // 3. 임시 파일(.tmp) 작성 후 원자적 교체 (단일 파일 마운트 시 in-place 덮어쓰기 자동 fallback)
  await writeConfigFile(filePath, rawToml);
}

export async function getFeed(feedId: string): Promise<FeedConfig | null> {
  const { config } = await loadConfig();
  if (config.feeds && config.feeds[feedId]) {
    return config.feeds[feedId];
  }
  return null;
}

export async function upsertFeed(feedId: string, feed: FeedConfig): Promise<void> {
  const { config } = await loadConfig();
  if (!config.feeds) {
    config.feeds = {};
  }
  config.feeds[feedId] = feed;
  await saveConfig(config);
}

export async function deleteFeed(feedId: string): Promise<void> {
  const { config } = await loadConfig();
  if (config.feeds && config.feeds[feedId]) {
    delete config.feeds[feedId];
    await saveConfig(config);
  }
}
