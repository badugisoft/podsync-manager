import { json, type RequestHandler } from '@sveltejs/kit';
import { parse } from 'smol-toml';
import { saveRawToml } from '$lib/server/config';

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const { rawToml } = await request.json();
    if (typeof rawToml !== 'string') {
      return json({ ok: false, error: '유효하지 않은 데이터 형식입니다.' }, { status: 400 });
    }

    // 1. TOML 유효성 검증
    try {
      parse(rawToml);
    } catch (parseErr: unknown) {
      const err = parseErr as Error;
      return json({ ok: false, error: `TOML 문법 오류: ${err.message}` }, { status: 400 });
    }

    // 2. 파일 저장
    await saveRawToml(rawToml);
    return json({ ok: true });
  } catch (err: unknown) {
    const error = err as Error;
    return json({ ok: false, error: error.message || '저장 실패' }, { status: 500 });
  }
};
