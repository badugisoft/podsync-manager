import { json, type RequestHandler } from '@sveltejs/kit';
import { rollbackToBackup } from '$lib/server/config';

export const POST: RequestHandler = async () => {
  const success = await rollbackToBackup();
  if (success) {
    return json({ ok: true });
  } else {
    return json({ ok: false, error: '복원할 수 있는 백업 파일(.bak)이 없습니다.' }, { status: 400 });
  }
};
