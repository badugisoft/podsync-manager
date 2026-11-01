import type { LayoutServerLoad } from './$types';
import { getPodsyncStatus } from '$lib/server/docker';
import { loadConfig, getConfigMTime } from '$lib/server/config';

export const load: LayoutServerLoad = async ({ locals }) => {
  const container = await getPodsyncStatus();
  const { config } = await loadConfig();
  const configMTime = await getConfigMTime();

  // 컨테이너 시작 시각과 설정 파일 수정 시각 비교
  let hasPendingChanges = false;
  if (container.uptime && configMTime > 0) {
    const startedAtMs = new Date(container.uptime).getTime();
    if (!isNaN(startedAtMs)) {
      // 컨테이너 시작 후 3초 이상 경과한 설정 파일 변경건 감지
      hasPendingChanges = configMTime > startedAtMs + 3000;
    }
  }

  return {
    user: locals.user,
    container,
    hasPendingChanges,
    hostname: config.server?.hostname || 'http://localhost:8080'
  };
};
