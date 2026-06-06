import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTitle, buildDescription } from '../lib/metadata.js';

test('buildTitle composes the standard episode title from day number and hook', () => {
  assert.equal(
    buildTitle({ day: 2, hook: 'Shipping the Stream-Arming CLI' }),
    'AI Engineering Live - Day 2: Shipping the Stream-Arming CLI | One-Hour Build Challenge'
  );
});

test('buildTitle rejects titles over YouTube\'s 100-char limit', () => {
  const hook = 'A'.repeat(80);
  assert.throws(() => buildTitle({ day: 2, hook }), /100/);
});

test('buildDescription includes positioning, today line, both CTAs, and hashtags', () => {
  const d = buildDescription({ day: 2, hook: 'Shipping the Stream-Arming CLI' });
  assert.match(d, /one-hour live build/i);
  assert.match(d, /Day 2: Shipping the Stream-Arming CLI/);
  assert.match(d, /https:\/\/github\.com\/erickcxc/);
  assert.match(d, /link in bio/);
  assert.match(d, /#AIEngineering/);
});

test('buildDescription and buildTitle contain no em dashes (brand rule)', () => {
  const d = buildDescription({ day: 2, hook: 'Ship it' });
  const t = buildTitle({ day: 2, hook: 'Ship it' });
  assert.ok(!d.includes('—'), 'description contains an em dash');
  assert.ok(!t.includes('—'), 'title contains an em dash');
});
