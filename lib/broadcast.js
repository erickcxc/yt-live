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

// liveBroadcasts.insert ignores category; it is set afterwards via videos.update.
// videos.update REPLACES the whole snippet: title and description must both be
// re-sent or they are wiped (description loss found live on Day 2).
export function buildCategoryUpdate({ videoId, title, description }) {
  return {
    id: videoId,
    snippet: { categoryId: CATEGORY_SCIENCE_TECH, title, description },
  };
}
