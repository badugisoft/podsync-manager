import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyCredentials, createSessionToken, SESSION_COOKIE_NAME } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, '/');
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const formData = await request.formData();
    const username = formData.get('username')?.toString() || '';
    const password = formData.get('password')?.toString() || '';

    if (!username || !password) {
      return fail(400, { error: '아이디와 비밀번호를 모두 입력해주세요.' });
    }

    if (!verifyCredentials(username, password)) {
      return fail(401, { error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = createSessionToken(username);
    cookies.set(SESSION_COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 7 // 7일
    });

    const redirectTo = url.searchParams.get('redirectTo') || '/';
    throw redirect(303, redirectTo);
  }
};
