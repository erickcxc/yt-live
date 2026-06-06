#!/usr/bin/env node
// yt-live: arm a YouTube live broadcast. The go-live verb does not exist here;
// the operator presses Start Streaming in OBS (ADR-0006 / ADR-0008).

import { parseCliArgs } from '../lib/cli.js';
import { buildTitle, buildDescription } from '../lib/metadata.js';
import { buildBroadcastResource } from '../lib/broadcast.js';
import { auth, youtubeClient, ensureStream, upsertBroadcast, setThumbnail, findBoundUpcoming, verify, status } from '../lib/api.js';

const args = parseCliArgs(process.argv.slice(2));

if (args.command === 'auth') {
  await auth();
  process.exit(0);
}

const yt = await youtubeClient();

switch (args.command) {
  case 'stream-ensure': {
    const s = await ensureStream(yt);
    console.log(`${s.created ? 'Created' : 'Found'} named stream "${s.title}" (id: ${s.id})`);
    console.log('Operator: paste its key into OBS > Settings > Stream once, by hand.');
    break;
  }
  case 'create': {
    const { id: streamId } = await ensureStream(yt);
    const title = buildTitle(args);
    const resource = buildBroadcastResource({
      title,
      description: buildDescription(args),
      scheduledStartTime: args.schedule ?? new Date(Date.now() + 10 * 60_000).toISOString(),
      privacy: args.privacy,
    });
    const r = await upsertBroadcast(yt, { resource, streamId });
    if (args.file) await setThumbnail(yt, r.id, args.file);
    console.log(`${r.updated ? 'Updated' : 'Created'}: "${title}"`);
    console.log(`Watch URL: ${r.watchUrl}${args.file ? '\nThumbnail uploaded.' : ''}`);
    console.log('ARMED. Press Start Streaming in OBS to go live.');
    break;
  }
  case 'thumbnail': {
    if (!args.file) throw new Error('thumbnail requires --file');
    const { id: streamId } = await ensureStream(yt);
    const bound = await findBoundUpcoming(yt, streamId);
    if (!bound) throw new Error('No upcoming bound broadcast. Run create first.');
    await setThumbnail(yt, bound.id, args.file);
    console.log(`Thumbnail set on "${bound.snippet.title}".`);
    break;
  }
  case 'verify': {
    const { id: streamId } = await ensureStream(yt);
    process.exit((await verify(yt, streamId)) ? 0 : 1);
  }
  case 'status':
    await status(yt);
    break;
}
