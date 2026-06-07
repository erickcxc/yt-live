// Thin googleapis edge. No business logic here; pure builders/selectors live in
// metadata.js and broadcast.js (unit-tested). This file is covered by the Phase-2
// integration smoke test against an unlisted broadcast.
//
// SAFETY:
// - liveBroadcasts.transition is NOT called anywhere in this codebase. Go-live is
//   the operator pressing Start Streaming in OBS (autoStart does the rest).
// - liveStreams responses carry ingestion keys (cdn.ingestionInfo). Nothing in this
//   module returns or logs that object; only ids and titles leave this boundary.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { google } from 'googleapis';
import { findUpcomingBoundBroadcast, buildCategoryUpdate } from './broadcast.js';

const CONFIG_DIR = join(homedir(), '.config', 'yt-live');
const CLIENT_PATH = join(CONFIG_DIR, 'oauth-client.json');
const TOKEN_PATH = join(CONFIG_DIR, 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/youtube'];

async function oauthClient() {
  const raw = JSON.parse(await readFile(CLIENT_PATH, 'utf8'));
  const c = raw.installed ?? raw.web;
  return new google.auth.OAuth2(c.client_id, c.client_secret, 'http://127.0.0.1:8765');
}

// One-time interactive consent. Prints a URL for the operator; never prints tokens.
export async function auth() {
  const client = await oauthClient();
  const url = client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
  console.log('Open this URL in your browser and approve access:\n\n' + url + '\n');

  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const c = new URL(req.url, 'http://127.0.0.1:8765').searchParams.get('code');
      res.end(c ? 'yt-live: authorized. You can close this tab.' : 'yt-live: no code received.');
      if (c) {
        server.close();
        resolve(c);
      }
    });
    server.on('error', reject);
    server.listen(8765, '127.0.0.1');
  });

  const { tokens } = await client.getToken(code);
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await writeFile(TOKEN_PATH, JSON.stringify(tokens), { mode: 0o600 });
  console.log('Token stored in ~/.config/yt-live/ (referenced by path, never displayed).');
}

export async function youtubeClient() {
  const client = await oauthClient();
  client.setCredentials(JSON.parse(await readFile(TOKEN_PATH, 'utf8')));
  return google.youtube({ version: 'v3', auth: client });
}

// Create-or-get the named reusable stream. Returns id + title ONLY.
export async function ensureStream(yt, title = 'AI BY ERICK rig key') {
  const { data } = await yt.liveStreams.list({ part: ['snippet'], mine: true, maxResults: 50 });
  const existing = (data.items ?? []).find((s) => s.snippet.title === title);
  if (existing) return { id: existing.id, title, created: false };

  const { data: created } = await yt.liveStreams.insert({
    part: ['snippet', 'cdn'],
    requestBody: {
      snippet: { title },
      cdn: { ingestionType: 'rtmp', resolution: '1080p', frameRate: '60fps' },
    },
  });
  return { id: created.id, title, created: true };
}

async function listMyBroadcasts(yt) {
  const { data } = await yt.liveBroadcasts.list({
    part: ['snippet', 'status', 'contentDetails'],
    mine: true,
    maxResults: 25,
  });
  return data.items ?? [];
}

// Idempotent create-or-update of today's broadcast, bound to the named stream.
export async function upsertBroadcast(yt, { resource, streamId }) {
  const existing = findUpcomingBoundBroadcast(await listMyBroadcasts(yt), streamId);

  let id;
  if (existing) {
    id = existing.id;
    await yt.liveBroadcasts.update({
      part: ['snippet', 'status', 'contentDetails'],
      requestBody: { id, ...resource },
    });
  } else {
    const { data: created } = await yt.liveBroadcasts.insert({
      part: ['snippet', 'status', 'contentDetails'],
      requestBody: resource,
    });
    id = created.id;
    await yt.liveBroadcasts.bind({ id, part: ['id'], streamId });
  }

  await yt.videos.update({
    part: ['snippet'],
    requestBody: buildCategoryUpdate({
      videoId: id,
      title: resource.snippet.title,
      description: resource.snippet.description,
    }),
  });

  return { id, updated: Boolean(existing), watchUrl: `https://youtu.be/${id}` };
}

export async function findBoundUpcoming(yt, streamId) {
  return findUpcomingBoundBroadcast(await listMyBroadcasts(yt), streamId);
}

export async function setThumbnail(yt, videoId, file) {
  const { createReadStream } = await import('node:fs');
  await yt.thumbnails.set({ videoId, media: { body: createReadStream(file) } });
}

// Read-only pre-flight. Prints a checklist; exit code 0 only if armed.
export async function verify(yt, streamId) {
  const broadcasts = await listMyBroadcasts(yt);
  const bound = findUpcomingBoundBroadcast(broadcasts, streamId);
  const checks = [
    ['token valid (API reachable)', true],
    ['named stream exists', Boolean(streamId)],
    ['upcoming broadcast bound', Boolean(bound)],
    ['autoStart enabled', Boolean(bound?.contentDetails?.enableAutoStart)],
  ];
  for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (bound) console.log(`\nArmed: "${bound.snippet.title}" -> https://youtu.be/${bound.id}`);
  return checks.every(([, ok]) => ok);
}

export async function status(yt) {
  for (const b of await listMyBroadcasts(yt)) {
    console.log(`${b.status.lifeCycleStatus.padEnd(9)} ${b.snippet.title}  https://youtu.be/${b.id}`);
  }
}
