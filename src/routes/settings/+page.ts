import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('/api/config');
  const data = await res.json();

  return {
    config: data.config || {},
    rawToml: data.rawToml || '',
    configPath: '',
    hasBackup: data.hasBackup || false,
    envTokens: {
      youtube: '',
      vimeo: '',
      soundcloud: '',
      twitch: ''
    }
  };
};
