// Runs Code.gs in Node against small fakes of the Apps Script services, so the backend can be checked without deploying.
// Run with: node --test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash, randomUUID} from 'node:crypto';
import vm from 'node:vm';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

function sharedBlock(src) {
  const m = src.match(/\/\* SHARED START[^\n]*\n([\s\S]*?)\/\* SHARED END \*\//);
  assert.ok(m, 'SHARED START / SHARED END markers are missing');
  return m[1];
}

function fakeSheet() {
  const cells = [];
  const cell = (r, c) => (cells[r] || [])[c] ?? '';
  const put = (r, c, v) => { (cells[r] ||= [])[c] = v; };
  return {
    cells,
    getLastRow: () => cells.length,
    getRange(a, c, nr, nc) {
      if (a === 'A:A') return {setNumberFormat() { return this; }};
      if (typeof a === 'string') {
        const r = +a.slice(1) - 1, col = a.charCodeAt(0) - 65;
        return {getValue: () => cell(r, col), setValue(v) { put(r, col, v); return this; }};
      }
      return {
        getValues: () => Array.from({length: nr}, (_, i) => Array.from({length: nc}, (_, j) => cell(a - 1 + i, c - 1 + j))),
        setValues(vals) { vals.forEach((row, i) => row.forEach((v, j) => put(a - 1 + i, c - 1 + j, v))); return this; },
        setFontWeight() { return this; },
      };
    },
    appendRow(row) { cells.push([...row]); },
    setFrozenRows() {},
  };
}

function loadBackend() {
  const sheets = {}, props = {};
  let now = 1_760_000_000_000;
  const ctx = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = fakeSheet())}),
      getUi() { throw new Error('Cannot call SpreadsheetApp.getUi() from this context.'); },
    },
    PropertiesService: {getScriptProperties: () => ({getProperty: k => props[k] ?? null, setProperty(k, v) { props[k] = v; }})},
    LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock() {}})},
    ContentService: {MimeType: {JSON: 'json'}, createTextOutput: s => ({json: JSON.parse(s), setMimeType() { return this; }})},
    HtmlService: {createHtmlOutput: h => ({html: h, setTitle() { return this; }, setWidth() { return this; }, setHeight() { return this; }})},
    Utilities: {
      getUuid: () => randomUUID(),
      DigestAlgorithm: {SHA_256: 'sha256'},
      // Apps Script returns signed bytes
      computeDigest: (alg, s) => [...createHash('sha256').update(s).digest()].map(b => (b > 127 ? b - 256 : b)),
      formatDate: d => d.toISOString().slice(0, 10),
    },
    Session: {getScriptTimeZone: () => 'Europe/London'},
    Logger: {log() {}},
    Date: class extends Date { static now() { return now; } },
  };
  vm.createContext(ctx);
  vm.runInContext(read('Code.gs'), ctx, {filename: 'Code.gs'});
  return {
    ctx, sheets, props,
    tick: ms => { now += ms; return now; },
    get: q => ctx.doGet({parameter: q}).json,
    post: body => ctx.doPost({postData: {contents: JSON.stringify(body)}}).json,
  };
}

const CFG = {names: {a: 'Blue', b: 'Orange'}, targets: {a: {water: 3000, protein: 120}, b: {water: 2500, protein: 90}}};
const addWater = (id, date, amt) => ({t: 'add', id, ts: 1, date, p: 'a', k: 'water', amt, tw: 3000, tp: 120});

test('shared scoring code is identical in index.html and Code.gs', () => {
  assert.equal(sharedBlock(read('Code.gs')), sharedBlock(read('index.html')));
});

test('refuses every request until Set up has made a key', () => {
  const b = loadBackend();
  const r = b.get({key: 'anything', since: '0'});
  assert.equal(r.ok, false);
  assert.match(r.error, /Set up/);
});

test('Set up makes a typeable key once and keeps it', () => {
  const b = loadBackend();
  const key = b.ctx.setup();
  assert.match(key, /^[a-z2-9]{5}(-[a-z2-9]{5}){3}$/);
  assert.doesNotMatch(key, /[01oli]/);
  assert.equal(b.ctx.setup(), key);
  assert.ok(b.sheets.Days && b.sheets.Config, 'Set up creates the Days and Config tabs');
});

test('a wrong key is refused', () => {
  const b = loadBackend();
  b.ctx.setup();
  assert.equal(b.get({key: 'nope', since: '0'}).ok, false);
  assert.equal(b.post({key: 'nope', ops: [addWater('x', '2026-10-25', 250)]}).ok, false);
});

test('opening the address in a browser shows a page, not an error', () => {
  const b = loadBackend();
  assert.match(b.ctx.doGet({parameter: {}}).html, /online/);
});

test('saves ops, writes a readable row and syncs the day back', () => {
  const b = loadBackend(), key = b.ctx.setup(), date = '2026-10-25';
  const r = b.post({key, config: CFG, ops: [
    addWater('o1', date, 3000),
    {t: 'claim', id: 'o2', ts: 2, date, cid: 'dishes', by: 'b', pts: 10, name: 'Load or empty dishwasher'},
  ]});
  assert.equal(r.ok, true);
  assert.equal(r.days[date].a.water, 3000);

  const [header, row] = b.sheets.Days.cells;
  assert.equal(header[3], 'Blue points');
  assert.equal(row[0], date);
  assert.equal(row[3], 20, 'water target hit: 15 + 5 bonus');
  assert.equal(row[4], 10, 'one chore worth 10');
  assert.equal(row[11], 'Blue');

  const g = b.get({key, since: '0'});
  assert.equal(g.ok, true);
  assert.deepEqual(g.config.names, CFG.names);
  assert.equal(g.days[date].chores.dishes.by, 'b');
});

test('a repeatable chore scores every go, and taking one off removes only that go', () => {
  const b = loadBackend(), key = b.ctx.setup(), date = '2026-10-25';
  const go = (id, cid, by) => ({t: 'claim', id, ts: 1, date, cid, by, pts: 8, name: 'Milk Pumping'});
  b.post({key, config: CFG, ops: [go('r1', 'pump~1', 'b'), go('r2', 'pump~2', 'b'), go('r3', 'pump~3', 'b')]});
  let row = b.sheets.Days.cells[1];
  assert.equal(row[4], 24, 'three goes at 8 points');
  assert.equal(row[10], 3, 'counted as three chores');
  b.post({key, ops: [{t: 'claim', id: 'r4', ts: 2, date, cid: 'pump~2', by: null}]});
  row = b.sheets.Days.cells[1];
  assert.equal(row[4], 16);
  assert.deepEqual(Object.keys(b.get({key, since: '0'}).days[date].chores).sort(), ['pump~1', 'pump~3']);
});

test('an op that arrives twice is applied once', () => {
  const b = loadBackend(), key = b.ctx.setup(), date = '2026-10-25';
  b.post({key, ops: [addWater('same', date, 500)]});
  b.post({key, ops: [addWater('same', date, 500)]});
  assert.equal(b.get({key, since: '0'}).days[date].a.water, 500);
});

test('a poll only returns days saved after its since time', () => {
  const b = loadBackend(), key = b.ctx.setup();
  const first = b.post({key, ops: [addWater('d1', '2026-10-24', 250)]}).now;
  b.tick(5000);
  b.post({key, ops: [addWater('d2', '2026-10-25', 250)]});
  assert.deepEqual(Object.keys(b.get({key, since: String(first)}).days), ['2026-10-25']);
  assert.deepEqual(Object.keys(b.get({key, since: '0'}).days).sort(), ['2026-10-24', '2026-10-25']);
});

test('the clock is read before the rows, so a save during a read is not skipped', () => {
  const b = loadBackend(), key = b.ctx.setup();
  // A save lands just after doGet has read the rows, so this poll misses it and the next poll must catch it
  const origRead = b.ctx.readDays_;
  b.ctx.readDays_ = since => { const days = origRead(since); b.tick(10); b.post({key, ops: [addWater('mid', '2026-10-25', 250)]}); return days; };
  const poll = b.get({key, since: '0'});
  b.ctx.readDays_ = origRead;
  assert.deepEqual(Object.keys(poll.days), []);
  assert.deepEqual(Object.keys(b.get({key, since: String(poll.now)}).days), ['2026-10-25']);
});
