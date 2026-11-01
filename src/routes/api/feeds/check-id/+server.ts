import { json, type RequestHandler } from '@sveltejs/kit';
import { getFeed } from '$lib/server/config';

export const GET: RequestHandler = async ({ url }) => {
  const id = url.searchParams.get('id')?.trim().toLowerCase() || '';

  if (!id) {
    return json({ valid: false, exists: false, message: '피드 ID를 입력해주세요.' });
  }

  if (!/^[a-z0-9_]+$/.test(id)) {
    return json({ valid: false, exists: false, message: '영문 소문자, 숫자, 언더스코어(_)만 사용할 수 있습니다.' });
  }

  const existing = await getFeed(id);
  if (existing) {
    return json({ valid: false, exists: true, message: `'${id}'는 이미 사용 중인 피드 ID입니다.` });
  }

  return json({ valid: true, exists: false, message: `'${id}'는 사용 가능한 피드 ID입니다.` });
};
