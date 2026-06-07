import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as broadcast from '../lib/broadcast.js';
const { buildBroadcastResource, buildCategoryUpdate, findUpcomingBoundBroadcast } = broadcast;

test('buildBroadcastResource composes an insert body with autoStart and autoStop enabled', () => {
  const r = buildBroadcastResource({
    title: 'T',
    description: 'D',
    scheduledStartTime: '2026-06-06T21:00:00Z',
    privacy: 'public',
  });
  assert.equal(r.snippet.title, 'T');
  assert.equal(r.snippet.description, 'D');
  assert.equal(r.snippet.scheduledStartTime, '2026-06-06T21:00:00Z');
  assert.equal(r.status.privacyStatus, 'public');
  assert.equal(r.contentDetails.enableAutoStart, true);
  assert.equal(r.contentDetails.enableAutoStop, true);
  // liveBroadcasts.update rejects contentDetails without monitorStream
  // ("The field enableMonitorStream is required") - found by the first smoke test.
  // Disabled: with autoStart the encoder feed goes straight live; no control-room preview leg.
  assert.equal(r.contentDetails.monitorStream.enableMonitorStream, false);
});

test('buildCategoryUpdate targets Science & Technology and re-sends title AND description (videos.update replaces the whole snippet)', () => {
  const u = buildCategoryUpdate({ videoId: 'abc123', title: 'T', description: 'D' });
  assert.equal(u.id, 'abc123');
  assert.equal(u.snippet.categoryId, '28');
  assert.equal(u.snippet.title, 'T');
  // Found live on Day 2: omitting description here wiped it from the live broadcast.
  assert.equal(u.snippet.description, 'D');
});

test('findUpcomingBoundBroadcast picks the upcoming broadcast bound to our stream', () => {
  const broadcasts = [
    { id: 'old', status: { lifeCycleStatus: 'complete' }, contentDetails: { boundStreamId: 's1' } },
    { id: 'other', status: { lifeCycleStatus: 'ready' }, contentDetails: { boundStreamId: 's2' } },
    { id: 'todays', status: { lifeCycleStatus: 'ready' }, contentDetails: { boundStreamId: 's1' } },
  ];
  assert.equal(findUpcomingBoundBroadcast(broadcasts, 's1').id, 'todays');
});

test('buildVerifyChecks fails the privacy check when the bound broadcast is not public (unlisted drift found live on Day 2)', () => {
  const bound = {
    contentDetails: { enableAutoStart: true },
    status: { privacyStatus: 'unlisted' },
  };
  const checks = broadcast.buildVerifyChecks({ streamId: 's1', bound });
  const privacyCheck = checks.find(([label]) => label.includes('public'));
  assert.ok(privacyCheck, 'verify must include a broadcast-is-public check');
  assert.equal(privacyCheck[1], false);
  // and the same broadcast passes once public
  bound.status.privacyStatus = 'public';
  const again = broadcast.buildVerifyChecks({ streamId: 's1', bound });
  assert.equal(again.find(([label]) => label.includes('public'))[1], true);
});

test('formatBroadcastLine shows lifecycle, privacy, title, and watch URL on one line', () => {
  const line = broadcast.formatBroadcastLine({
    id: 'abc123',
    snippet: { title: 'Episode' },
    status: { lifeCycleStatus: 'live', privacyStatus: 'unlisted' },
  });
  assert.ok(line.includes('live'), 'lifecycle visible');
  assert.ok(line.includes('unlisted'), 'privacy visible (the Day 2 lesson)');
  assert.ok(line.includes('Episode'));
  assert.ok(line.includes('https://youtu.be/abc123'));
});

test('formatCreateResult reports the privacy YouTube actually returned, with a warning when it is not public', () => {
  const ok = broadcast.formatCreateResult({
    title: 'Episode',
    watchUrl: 'https://youtu.be/abc123',
    privacy: 'public',
    updated: false,
  });
  assert.ok(ok.includes('Created'));
  assert.ok(ok.includes('public'), 'readback privacy is printed, not assumed');
  assert.ok(!ok.includes('WARNING'));

  const drifted = broadcast.formatCreateResult({
    title: 'Episode',
    watchUrl: 'https://youtu.be/abc123',
    privacy: 'unlisted',
    updated: true,
  });
  assert.ok(drifted.includes('Updated'));
  assert.ok(drifted.includes('WARNING'), 'non-public privacy must be loud');
  assert.ok(drifted.includes('unlisted'));
});

test('findUpcomingBoundBroadcast returns null when nothing upcoming is bound to our stream', () => {
  const broadcasts = [
    { id: 'done', status: { lifeCycleStatus: 'complete' }, contentDetails: { boundStreamId: 's1' } },
  ];
  assert.equal(findUpcomingBoundBroadcast(broadcasts, 's1'), null);
});
