import { appendLog } from '@/lib/forms';

export const runtime = 'nodejs';

/** Visit / click activity log (replaces the WordPress "wvt" activity log). Stored in data/activity.jsonl */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    appendLog('activity.jsonl', { time: new Date().toISOString(), ip: req.headers.get('x-forwarded-for') || '', ...body });
  } catch { /* ignore bad beacons */ }
  return new Response(null, { status: 204 });
}
