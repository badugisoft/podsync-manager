import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Docker from 'dockerode';

import { markConfigAsApplied } from './config';

const containerName = process.env.PODSYNC_CONTAINER_NAME || 'podsync';

function resolveDockerSocketPath(): string {
  if (process.env.DOCKER_SOCKET) {
    return process.env.DOCKER_SOCKET;
  }

  const candidates = [
    path.join(os.homedir(), '.orbstack/run/docker.sock'),
    path.join(os.homedir(), '.docker/run/docker.sock'),
    '/var/run/docker.sock'
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // 권한 등의 문제로 확인 실패 시 패스
    }
  }

  return '/var/run/docker.sock';
}

let dockerInstance: Docker | null = null;

export function getDocker(): Docker {
  const socketPath = resolveDockerSocketPath();
  if (!dockerInstance) {
    dockerInstance = new Docker({ socketPath });
  }
  return dockerInstance;
}

export interface ContainerStatusInfo {
  name: string;
  status: 'running' | 'exited' | 'paused' | 'restarting' | 'not_found' | 'error';
  stateText?: string;
  uptime?: string;
  errorDetail?: string;
}

export async function getPodsyncEnv(): Promise<Record<string, string>> {
  try {
    const docker = getDocker();
    const container = docker.getContainer(containerName);
    const data = await container.inspect();
    const envList = data.Config.Env || [];
    const envMap: Record<string, string> = {};
    for (const item of envList) {
      const idx = item.indexOf('=');
      if (idx !== -1) {
        const key = item.substring(0, idx);
        const value = item.substring(idx + 1);
        envMap[key] = value;
      }
    }
    return envMap;
  } catch (error) {
    console.error(`[Docker Env Error] (${containerName}):`, error);
    return {};
  }
}

export async function getPodsyncStatus(): Promise<ContainerStatusInfo> {
  try {
    const docker = getDocker();
    const container = docker.getContainer(containerName);
    const data = await container.inspect();

    let status: ContainerStatusInfo['status'] = 'exited';
    if (data.State.Running) {
      status = 'running';
    } else if (data.State.Restarting) {
      status = 'restarting';
    } else if (data.State.Paused) {
      status = 'paused';
    }

    return {
      name: containerName,
      status,
      stateText: data.State.Status,
      uptime: data.State.StartedAt
    };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    console.error(`[Docker Status Error] (${containerName}):`, err.message || error);
    if (err.statusCode === 404) {
      return { name: containerName, status: 'not_found' };
    }
    return { name: containerName, status: 'error', errorDetail: err.message };
  }
}

export async function restartPodsync(): Promise<{ success: boolean; message?: string }> {
  try {
    const docker = getDocker();
    const container = docker.getContainer(containerName);
    await container.restart();
    await markConfigAsApplied();
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: err.message };
  }
}
