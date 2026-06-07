import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBroadcastResource, buildCategoryUpdate, findUpcomingBoundBroadcast } from '../lib/broadcast.js';

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

test('buildCategoryUpdate targets Science & Technology and re-sends the title (videos.update requirement)', () => {
  const u = buildCategoryUpdate({ videoId: 'abc123', title: 'T' });
  assert.equal(u.id, 'abc123');
  assert.equal(u.snippet.categoryId, '28');
  assert.equal(u.snippet.title, 'T');
});

test('findUpcomingBoundBroadcast picks the upcoming broadcast bound to our stream', () => {
  const broadcasts = [
    { id: 'old', status: { lifeCycleStatus: 'complete' }, contentDetails: { boundStreamId: 's1' } },
    { id: 'other', status: { lifeCycleStatus: 'ready' }, contentDetails: { boundStreamId: 's2' } },
    { id: 'todays', status: { lifeCycleStatus: 'ready' }, contentDetails: { boundStreamId: 's1' } },
  ];
  assert.equal(findUpcomingBoundBroadcast(broadcasts, 's1').id, 'todays');
});

test('findUpcomingBoundBroadcast returns null when nothing upcoming is bound to our stream', () => {
  const broadcasts = [
    { id: 'done', status: { lifeCycleStatus: 'complete' }, contentDetails: { boundStreamId: 's1' } },
  ];
  assert.equal(findUpcomingBoundBroadcast(broadcasts, 's1'), null);
});
