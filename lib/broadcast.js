// Pure builders for YouTube Live API request bodies. No API calls here.
// Go-live verbs (liveBroadcasts.transition) are intentionally absent from this CLI.

const CATEGORY_SCIENCE_TECH = '28';

export function buildBroadcastResource({ title, description, scheduledStartTime, privacy }) {
  return {
    snippet: { title, description, scheduledStartTime },
    status: { privacyStatus: privacy },
    contentDetails: {
      enableAutoStart: true,
      enableAutoStop: true,
      // Required by liveBroadcasts.update (the API rejects contentDetails without it).
      // Disabled: autoStart means the encoder feed goes straight live; no preview leg.
      monitorStream: { enableMonitorStream: false },
    },
  };
}

// Idempotency: re-running prep must update today's broadcast, never duplicate it.
const UPCOMING = new Set(['created', 'ready', 'testing']);

export function findUpcomingBoundBroadcast(broadcasts, streamId) {
  return (
    broadcasts.find(
      (b) => UPCOMING.has(b.status.lifeCycleStatus) && b.contentDetails?.boundStreamId === streamId
    ) ?? null
  );
}

// Pure pre-flight checklist. The privacy check exists because visibility drifted
// to unlisted outside the code on Day 2 and four green checks said nothing.
export function buildVerifyChecks({ streamId, bound }) {
  return [
    ['token valid (API reachable)', true],
    ['named stream exists', Boolean(streamId)],
    ['upcoming broadcast bound', Boolean(bound)],
    ['autoStart enabled', Boolean(bound?.contentDetails?.enableAutoStart)],
    ['broadcast is public', bound?.status?.privacyStatus === 'public'],
  ];
}

// One status row: lifecycle + privacy visible at a glance (privacy was invisible
// in v0.1.0 output, which is how an unlisted live broadcast went unnoticed).
export function formatBroadcastLine(b) {
  return `${b.status.lifeCycleStatus.padEnd(9)} ${(b.status.privacyStatus ?? '?').padEnd(9)} ${b.snippet.title}  https://youtu.be/${b.id}`;
}

// Create/update report. `privacy` is what the API RETURNED, never what was sent:
// intent and result diverged on Day 2 and the output hid it.
export function formatCreateResult({ title, watchUrl, privacy, updated }) {
  const lines = [
    `${updated ? 'Updated' : 'Created'} (${privacy}): "${title}"`,
    `Watch URL: ${watchUrl}`,
  ];
  if (privacy !== 'public') {
    lines.push(`WARNING: broadcast privacy is ${privacy}, not public. Fix it in Studio before air.`);
  }
  return lines.join('\n');
}

// liveBroadcasts.insert ignores category; it is set afterwards via videos.update.
// videos.update REPLACES the whole snippet: title and description must both be
// re-sent or they are wiped (description loss found live on Day 2).
export function buildCategoryUpdate({ videoId, title, description }) {
  return {
    id: videoId,
    snippet: { categoryId: CATEGORY_SCIENCE_TECH, title, description },
  };
}
