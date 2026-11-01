import { json, type RequestHandler } from '@sveltejs/kit';
import { restartPodsync } from '$lib/server/docker';

export const POST: RequestHandler = async () => {
  const result = await restartPodsync();
  if (result.success) {
    return json({ ok: true });
  } else {
    return json({ ok: false, error: result.message || '컨테이너 재시작에 실패했습니다.' }, { status: 500 });
  }
};
