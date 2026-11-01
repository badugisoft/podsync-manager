import { json, type RequestHandler } from '@sveltejs/kit';
import { calculateS3StorageUsage } from '$lib/server/episodes';

export const POST: RequestHandler = async () => {
  try {
    const stats = await calculateS3StorageUsage();
    return json({ ok: true, stats });
  } catch (e: unknown) {
    const error = e as Error;
    return json({ ok: false, code: error.message || 'ERR_S3_CALCULATE_FAILED' }, { status: 500 });
  }
};
