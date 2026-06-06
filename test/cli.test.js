import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCliArgs } from '../lib/cli.js';

test('parseCliArgs parses create with day, hook, and privacy', () => {
  const cmd = parseCliArgs(['create', '--day', '2', '--hook', 'Ship it', '--privacy', 'unlisted']);
  assert.deepEqual(cmd, {
    command: 'create',
    day: 2,
    hook: 'Ship it',
    privacy: 'unlisted',
    schedule: null,
    file: null,
  });
});

test('parseCliArgs defaults privacy to public', () => {
  const cmd = parseCliArgs(['create', '--day', '3', '--hook', 'X']);
  assert.equal(cmd.privacy, 'public');
});

test('parseCliArgs rejects unknown commands', () => {
  assert.throws(() => parseCliArgs(['golive']), /unknown command/i);
});

test('parseCliArgs rejects create without required day and hook', () => {
  assert.throws(() => parseCliArgs(['create']), /--day and --hook/);
});

test('parseCliArgs parses thumbnail with a file argument', () => {
  const cmd = parseCliArgs(['thumbnail', '--file', 'ep2.jpg']);
  assert.equal(cmd.command, 'thumbnail');
  assert.equal(cmd.file, 'ep2.jpg');
});
