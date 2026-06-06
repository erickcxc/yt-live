// Standard episode metadata (ADR-0007, dash style per brand rule: no em dashes).

const TITLE_MAX = 100;

const GITHUB_URL = 'https://github.com/erickcxc';

export function buildDescription({ day, hook }) {
  return [
    'Daily one-hour live build of production-grade agentic systems: agents, MCP servers, voice AI, orchestration. Built live, shipped to a public repo before the clock runs out. From Detroit, zero fluff.',
    '',
    `Today is Day ${day}: ${hook}.`,
    '',
    `Code's on GitHub: ${GITHUB_URL}`,
    'I build systems like this for businesses: link in bio.',
    '',
    '#AIEngineering #BuildInPublic #AgenticSystems #MCP #LiveCoding',
  ].join('\n');
}

export function buildTitle({ day, hook }) {
  const title = `AI Engineering Live - Day ${day}: ${hook} | One-Hour Build Challenge`;
  if (title.length > TITLE_MAX) {
    throw new Error(`Title is ${title.length} chars; YouTube's limit is ${TITLE_MAX}. Shorten the hook.`);
  }
  return title;
}
