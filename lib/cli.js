import { parseArgs } from 'node:util';

// Commands this CLI has. There is deliberately no go-live/transition command.
const COMMANDS = new Set(['auth', 'create', 'status', 'verify', 'thumbnail', 'stream-ensure']);

export function parseCliArgs(argv) {
  const [command, ...rest] = argv;
  if (!COMMANDS.has(command)) {
    throw new Error(`Unknown command: ${command ?? '(none)'}. Commands: ${[...COMMANDS].join(', ')}`);
  }

  const { values } = parseArgs({
    args: rest,
    options: {
      day: { type: 'string' },
      hook: { type: 'string' },
      privacy: { type: 'string', default: 'public' },
      schedule: { type: 'string' },
      file: { type: 'string' },
    },
  });

  if (command === 'create' && (!values.day || !values.hook)) {
    throw new Error('create requires --day and --hook');
  }

  return {
    command,
    day: values.day ? Number(values.day) : null,
    hook: values.hook ?? null,
    privacy: values.privacy,
    schedule: values.schedule ?? null,
    file: values.file ?? null,
  };
}
