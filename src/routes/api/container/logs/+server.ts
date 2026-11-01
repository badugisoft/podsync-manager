import type { RequestHandler } from '@sveltejs/kit';
import { getDocker } from '$lib/server/docker';

const containerName = process.env.PODSYNC_CONTAINER_NAME || 'podsync';

export const GET: RequestHandler = async ({ url }) => {
  let logStream: NodeJS.ReadableStream | null = null;

  // 쿼리 파라미터로 tail 줄 수 수신 (기본: 100, 최대: 2000)
  const tailParam = url.searchParams.get('tail');
  const tail = tailParam ? Math.min(Math.max(10, parseInt(tailParam, 10) || 100), 2000) : 100;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const docker = getDocker();
        const container = docker.getContainer(containerName);

        // 지정한 tail 줄 수 가져오고 이후 로그를 follow
        logStream = (await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
          tail,
          timestamps: true
        })) as unknown as NodeJS.ReadableStream;

        let buffer = Buffer.alloc(0);

        logStream.on('data', (chunk: Buffer) => {
          buffer = Buffer.concat([buffer, chunk]);

          // 도커 멀티플렉스 스트림 헤더 (8바이트: [type:1, 0, 0, 0, size:4])
          while (buffer.length >= 8) {
            const payloadSize = buffer.readUInt32BE(4);
            const totalFrameSize = 8 + payloadSize;

            if (buffer.length < totalFrameSize) {
              // 아직 전체 프레임이 다 도착하지 않음
              break;
            }

            // 페이로드 추출
            const payload = buffer.subarray(8, totalFrameSize).toString('utf-8');
            buffer = buffer.subarray(totalFrameSize);

            const lines = payload.split(/\r?\n/);
            for (const line of lines) {
              if (line.trim()) {
                controller.enqueue(`data: ${JSON.stringify(line)}\n\n`);
              }
            }
          }

          // 만약 헤더 없는 일반 스트림인 경우 대비 (안전장치)
          if (buffer.length > 65536) {
            const rawText = buffer.toString('utf-8');
            buffer = Buffer.alloc(0);
            const lines = rawText.split(/\r?\n/);
            for (const line of lines) {
              if (line.trim()) {
                controller.enqueue(`data: ${JSON.stringify(line)}\n\n`);
              }
            }
          }
        });

        logStream.on('end', () => {
          if (buffer.length > 0) {
            const lines = buffer.toString('utf-8').split(/\r?\n/);
            for (const line of lines) {
              if (line.trim()) {
                controller.enqueue(`data: ${JSON.stringify(line)}\n\n`);
              }
            }
          }
          controller.close();
        });

        logStream.on('error', (err) => {
          controller.enqueue(`data: ${JSON.stringify(`[Stream Error] ${err.message}`)}\n\n`);
          controller.close();
        });
      } catch (err: unknown) {
        const error = err as Error;
        controller.enqueue(`data: ${JSON.stringify(`[Docker Error] ${error.message}`)}\n\n`);
        controller.close();
      }
    },
    cancel() {
      if (logStream && 'destroy' in logStream && typeof logStream.destroy === 'function') {
        logStream.destroy();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
};
