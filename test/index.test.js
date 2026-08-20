'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SOURCE_PATH = path.join(__dirname, '..', 'index.html');
const source = fs.readFileSync(SOURCE_PATH, 'utf8');

function extractFunction(src, name) {
  const needle = `function ${name}(`;
  const start = src.indexOf(needle);
  if (start === -1) throw new Error(`could not find "${needle}" in index.html — extractFunction anchor is stale`);
  const braceStart = src.indexOf('{', start);
  let depth = 0;
  let i = braceStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  if (depth !== 0) throw new Error(`unbalanced braces extracting function ${name}`);
  return src.slice(start, i);
}

function extractLine(src, containedNeedle) {
  const idx = src.indexOf(containedNeedle);
  if (idx === -1) throw new Error(`could not find "${containedNeedle}" in index.html — extractLine anchor is stale`);
  const lineStart = src.lastIndexOf('\n', idx) + 1;
  let lineEnd = src.indexOf('\n', idx);
  if (lineEnd === -1) lineEnd = src.length;
  return src.slice(lineStart, lineEnd);
}

function extractBlock(src, containedNeedle, startToken, endNeedle) {
  const anchor = src.indexOf(containedNeedle);
  if (anchor === -1) throw new Error(`could not find "${containedNeedle}" in index.html — extractBlock anchor is stale`);
  const start = src.lastIndexOf(startToken, anchor);
  if (start === -1) throw new Error(`could not find "${startToken}" before anchor "${containedNeedle}"`);
  const end = src.indexOf(endNeedle, anchor);
  if (end === -1) throw new Error(`could not find "${endNeedle}" after anchor "${containedNeedle}"`);
  return src.slice(start, end + endNeedle.length);
}

function extractRange(src, startNeedle, endNeedleInclusive) {
  const start = src.indexOf(startNeedle);
  if (start === -1) throw new Error(`could not find "${startNeedle}" in index.html — extractRange anchor is stale`);
  const end = src.indexOf(endNeedleInclusive, start);
  if (end === -1) throw new Error(`could not find "${endNeedleInclusive}" after start`);
  return src.slice(start, end + endNeedleInclusive.length);
}

const escSrc = extractLine(source, 'const esc=');
const uidSrc = extractFunction(source, 'uid');
const saveSrc = extractFunction(source, 'save');
const calcStreakSrc = extractFunction(source, 'calcStreak');

const migrationSrc = extractBlock(
  source,
  "let v4=localStorage.getItem('fdMembers_v4');",
  'try{',
  '}catch(e){members=[];}'
);

const csvBuildSrc = extractRange(source, "let hdr=['Name','Phone'", "let blob=new Blob");

const alertsRenderSrc = extractRange(
  source,
  "alertEl.innerHTML=alerts.slice(0,8).map(a=>{",
  "}).join('');"
);

const searchEmptyStateSrc = extractRange(
  source,
  'table.innerHTML+=`<tr class="empty-row">',
  '}</td></tr>`;'
);

function esc(value) {
  const body = [escSrc, 'return esc(value);'].join('\n');
  const fn = new Function('value', body);
  return fn(value);
}

function makeLocalStorage(initial) {
  const store = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    dump() { return Object.fromEntries(store); },
  };
}

function runMigration(localStorage) {
  const body = [
    'let members = [];',
    uidSrc,
    saveSrc,
    'function toast(){}',
    migrationSrc,
    'return members;',
  ].join('\n');
  const fn = new Function('localStorage', body);
  return fn(localStorage);
}

function calcStreak(attendance, memberId) {
  const body = [calcStreakSrc, 'return calcStreak(memberId);'].join('\n');
  const fn = new Function('attendance', 'memberId', body);
  return fn(attendance, memberId);
}

function dayKey(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function buildCsv(members) {
  const body = [csvBuildSrc, 'return csv;'].join('\n');
  const fn = new Function('members', body);
  return fn(members);
}

function renderAlertsHtml(alerts) {
  const body = [
    escSrc,
    "let alertEl = { innerHTML: '' };",
    alertsRenderSrc,
    'return alertEl.innerHTML;',
  ].join('\n');
  const fn = new Function('alerts', body);
  return fn(alerts);
}

function renderSearchEmptyState(search, filteredLength) {
  const body = [
    escSrc,
    "let table = { innerHTML: '' };",
    `let filtered = { length: ${JSON.stringify(filteredLength)} };`,
    'if (!filtered.length) {',
    searchEmptyStateSrc,
    '}',
    'return table.innerHTML;',
  ].join('\n');
  const fn = new Function('search', body);
  return fn(search);
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('esc() escapes all five HTML-significant characters', () => {
  assert.equal(esc(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});

test('esc() neutralizes a script tag', () => {
  const out = esc('<script>alert(1)</script>');
  assert.equal(out, '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.ok(!out.includes('<script>'));
});

test('esc() leaves plain text untouched', () => {
  assert.equal(esc('Ramesh Kumar'), 'Ramesh Kumar');
});

test('esc() treats null and undefined as empty string, not the literal word', () => {
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
});

test('esc() preserves falsy-but-real values like 0 (uses ?? not ||)', () => {
  assert.equal(esc(0), '0');
  assert.equal(esc(''), '');
});

test('migration: fresh install with nothing in localStorage yields no members and does not throw', () => {
  const ls = makeLocalStorage({});
  const members = runMigration(ls);
  assert.deepEqual(members, []);
});

test('migration: fdMembers_v4 present is used as-is, no migration triggered', () => {
  const v4 = [{ id: 'a1', name: 'Priya', history: [{ action: 'join' }] }];
  const ls = makeLocalStorage({ fdMembers_v4: JSON.stringify(v4) });
  const members = runMigration(ls);
  assert.deepEqual(members, v4);
  assert.equal(ls.getItem('fdMembers_v4'), JSON.stringify(v4));
});

test('migration: legacy gymMembers_v3 members get an id and a synthetic join history entry', () => {
  const legacy = [{ name: 'Arjun', phone: '9999999999', plan: 90, fee: 3000, joinDate: '2026-01-01T00:00:00.000Z', expiry: '2026-04-01T00:00:00.000Z' }];
  const ls = makeLocalStorage({ gymMembers_v3: JSON.stringify(legacy) });
  const members = runMigration(ls);
  assert.equal(members.length, 1);
  assert.ok(typeof members[0].id === 'string' && members[0].id.length > 0);
  assert.equal(members[0].history.length, 1);
  assert.equal(members[0].history[0].action, 'join');
  assert.equal(members[0].history[0].plan, 90);
  assert.equal(members[0].history[0].fee, 3000);
});

test('migration: legacy gymMembers_v2 members are migrated the same way as v3', () => {
  const legacy = [{ name: 'Sana', phone: '8888888888', plan: 30, fee: 1200 }];
  const ls = makeLocalStorage({ gymMembers_v2: JSON.stringify(legacy) });
  const members = runMigration(ls);
  assert.equal(members.length, 1);
  assert.equal(members[0].name, 'Sana');
  assert.equal(members[0].history[0].action, 'join');
});

test('migration: when both v2 and v3 exist, v3 wins over v2', () => {
  const v3 = [{ name: 'FromV3' }];
  const v2 = [{ name: 'FromV2' }];
  const ls = makeLocalStorage({ gymMembers_v3: JSON.stringify(v3), gymMembers_v2: JSON.stringify(v2) });
  const members = runMigration(ls);
  assert.equal(members.length, 1);
  assert.equal(members[0].name, 'FromV3');
});

test('migration: a legacy member that already has id and history keeps them instead of generating new ones', () => {
  const legacy = [{ id: 'keep-me', name: 'Old', history: [{ action: 'join', plan: 365 }] }];
  const ls = makeLocalStorage({ gymMembers_v3: JSON.stringify(legacy) });
  const members = runMigration(ls);
  assert.equal(members[0].id, 'keep-me');
  assert.equal(members[0].history[0].plan, 365);
});

test('migration: migrating writes the result back to fdMembers_v4 (save() runs)', () => {
  const legacy = [{ name: 'Vikram' }];
  const ls = makeLocalStorage({ gymMembers_v3: JSON.stringify(legacy) });
  const members = runMigration(ls);
  assert.equal(ls.getItem('fdMembers_v4'), JSON.stringify(members));
});

test('migration: corrupt fdMembers_v4 JSON is caught and falls back to an empty list, not a crash', () => {
  const ls = makeLocalStorage({ fdMembers_v4: '{not valid json' });
  const members = runMigration(ls);
  assert.deepEqual(members, []);
});

test('calcStreak: three consecutive check-ins including today is a streak of 3', () => {
  const attendance = {
    [dayKey(0)]: { m1: true },
    [dayKey(1)]: { m1: true },
    [dayKey(2)]: { m1: true },
  };
  assert.equal(calcStreak(attendance, 'm1'), 3);
});

test('calcStreak: no check-ins at all is a streak of 0', () => {
  assert.equal(calcStreak({}, 'm1'), 0);
});

test('calcStreak: not checked in today yet does not reset an existing streak', () => {
  const attendance = {
    [dayKey(1)]: { m1: true },
    [dayKey(2)]: { m1: true },
  };
  assert.equal(calcStreak(attendance, 'm1'), 2);
});

test('calcStreak: a gap before today breaks the streak at the gap', () => {
  const attendance = {
    [dayKey(1)]: { m1: true },
    [dayKey(2)]: { m1: true },
    [dayKey(4)]: { m1: true },
  };
  assert.equal(calcStreak(attendance, 'm1'), 2);
});

test('calcStreak: another member checked in does not count toward this member streak', () => {
  const attendance = { [dayKey(0)]: { someoneElse: true } };
  assert.equal(calcStreak(attendance, 'm1'), 0);
});

test('CSV export: header row matches the twelve documented columns', () => {
  const csv = buildCsv([]);
  assert.equal(csv, '"Name","Phone","Email","Gender","DOB","Category","Plan","Paid","Expiry","Join Date","Total Fee","Note"');
});

test('CSV export: a comma inside a name stays inside its quoted field', () => {
  const csv = buildCsv([{ name: 'Doe, John', phone: '9000000000', expiry: '2026-01-01T00:00:00.000Z' }]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[1].startsWith('"Doe, John","9000000000"'));
});

test('CSV export: a double quote inside a field is doubled per CSV convention', () => {
  const csv = buildCsv([{ name: 'Suspicious "Nickname" Guy', phone: '9000000001', expiry: '2026-01-01T00:00:00.000Z' }]);
  assert.ok(csv.includes('"Suspicious ""Nickname"" Guy"'));
});

test('CSV export: a newline inside a note stays inside its quoted field, not HTML-escaped', () => {
  const csv = buildCsv([{ name: 'Wraps', phone: '9000000002', expiry: '2026-01-01T00:00:00.000Z', note: 'line one\nline two' }]);
  assert.ok(csv.includes('"line one\nline two"'));
});

test('CSV export: fields are quote-escaped, not HTML-escaped — angle brackets pass through unchanged', () => {
  const csv = buildCsv([{ name: '<b>Bold</b>', phone: '9000000003', expiry: '2026-01-01T00:00:00.000Z' }]);
  assert.ok(csv.includes('"<b>Bold</b>"'));
});

test('CSV export: total fee sums every history entry, not just the latest one', () => {
  const csv = buildCsv([{
    name: 'Renewed', phone: '9000000004', expiry: '2026-01-01T00:00:00.000Z',
    history: [{ fee: 1200 }, { fee: 1200 }, { fee: 1500 }],
  }]);
  assert.ok(csv.includes('"3900"'));
});

test('security regression: a member name with a script tag cannot break out of the dashboard alert markup', () => {
  const html = renderAlertsHtml([{ type: 'pay', text: '<img src=x onerror=alert(1)> — payment pending' }]);
  assert.ok(!html.includes('<img'), 'raw <img must not reach the DOM unescaped');
  assert.ok(html.includes('&lt;img'));
});

test('security regression: the members search box cannot inject markup into the "no results" message', () => {
  const html = renderSearchEmptyState('<img src=x onerror=alert(1)>', 0);
  assert.ok(!html.includes('<img src=x'), 'raw search text must not reach the DOM unescaped');
  assert.ok(html.includes('&lt;img'));
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok  - ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL - ${name}`);
    console.log(`     ${err.message}`);
  }
}

console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed > 0) process.exit(1);
