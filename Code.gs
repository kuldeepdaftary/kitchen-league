/**
 * Kitchen League backend.
 * Lives inside a Google Sheet in your Drive: Extensions > Apps Script, paste this whole file over the starter code, save.
 * 1. Reload the Sheet. A "Kitchen League" menu appears. Choose Kitchen League > Set up and allow access when Google asks.
 *    It makes your key and shows it, so you never edit this file. (Or pick "setup" in the editor and press Run: the key is in the log.)
 * 2. Deploy > New deployment > type "Web app". Execute as: Me. Who has access: Anyone. Copy the address ending in /exec.
 * 3. In Kitchen League > Settings > Google Drive sync, paste the address and the key, then Connect.
 * Updating this file later: paste the new version, save, then Deploy > Manage deployments > pencil > Version: New version > Deploy.
 * That keeps the same /exec address, so no device needs reconnecting. The key lives in Script Properties, so pasting never resets it.
 * The "Days" tab gets one row per day with both scores, so you can chart or pivot it in Sheets.
 * Don't edit the "Data" column by hand.
 */
// Only used if Set up has never made a key. Leave it alone unless you'd rather pick your own phrase.
var KEY = 'CHANGE-ME-to-a-long-random-phrase';
var VERSION = 2;

var DEFAULT_TARGETS = {a: {water: 3000, protein: 120}, b: {water: 2500, protein: 90}};

/* SHARED START (copied from index.html, keep identical) */
function blankDay(k){return{date:k,a:{water:0,protein:0,log:[]},b:{water:0,protein:0,log:[]},chores:{},seen:[]}}
function normDay(d,k){
  d=d&&typeof d==='object'?d:blankDay(k);
  ['a','b'].forEach(function(p){var x=d[p]=d[p]||{};x.water=+x.water||0;x.protein=+x.protein||0;x.log=Array.isArray(x.log)?x.log:[]});
  d.chores=d.chores&&typeof d.chores==='object'?d.chores:{};d.seen=Array.isArray(d.seen)?d.seen:[];d.date=k;return d;
}
function dayActive(d){if(!d)return false;return ['a','b'].some(function(p){return d[p]&&(d[p].water>0||d[p].protein>0)})||Object.keys(d.chores||{}).length>0}
function applyOp(d,o){
  if(o.id&&d.seen.indexOf(o.id)>=0)return d;
  if(o.t==='add'){var x=d[o.p];x[o.k]=(x[o.k]||0)+o.amt;x.log.push({k:o.k,a:o.amt,t:o.ts});if(x.log.length>40)x.log=x.log.slice(-40);if(o.tw){x.tw=o.tw;x.tp=o.tp}}
  else if(o.t==='undo'){var y=d[o.p],e=y.log.pop();if(e)y[e.k]=Math.max(0,(y[e.k]||0)-e.a)}
  else if(o.t==='claim'){if(o.by)d.chores[o.cid]={by:o.by,pts:o.pts,name:o.name,t:o.ts};else delete d.chores[o.cid]}
  else if(o.t==='clear'){var b=blankDay(d.date);d.a=b.a;d.b=b.b;d.chores={}}
  else if(o.t==='import'){if(!dayActive(d)&&o.day){var s=d.seen;d=normDay(JSON.parse(JSON.stringify(o.day)),d.date);d.seen=s}}
  if(o.id){d.seen.push(o.id);if(d.seen.length>80)d.seen=d.seen.slice(-80)}
  return d;
}
function scoreOf(d,p,t){
  var x=(d&&d[p])||{water:0,protein:0},hitW=x.water>=t.water,hitP=x.protein>=t.protein;
  var w=Math.round(Math.min(1,x.water/t.water)*15)+(hitW?5:0),pr=Math.round(Math.min(1,x.protein/t.protein)*15)+(hitP?5:0);
  var c=0,cn=0,ch=(d&&d.chores)||{};for(var id in ch){if(ch[id]&&ch[id].by===p){c+=ch[id].pts||0;cn++}}
  return{w:w,pr:pr,c:c,cn:cn,total:w+pr+c,hitW:hitW,hitP:hitP,water:x.water||0,protein:x.protein||0,t:t};
}
/* SHARED END */


/* ---------- set up: menu, key ---------- */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Kitchen League')
    .addItem('Set up', 'setup')
    .addItem('Make a new key', 'resetKey')
    .addToUi();
}

function setup() {
  var key = key_();
  if (!key) {
    key = newKey_();
    PropertiesService.getScriptProperties().setProperty('KEY', key);
  }
  sheet_('Days');
  sheet_('Config');
  showSetup_(key);
  return key;
}

function resetKey() {
  var ui = ui_();
  if (ui && ui.alert('Make a new key?', 'Every connected device stops syncing until you connect it again with the new key.', ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  var key = newKey_();
  PropertiesService.getScriptProperties().setProperty('KEY', key);
  showSetup_(key);
}

function ui_() {
  try { return SpreadsheetApp.getUi(); } catch (e) { return null; } // null when run from the editor
}

function showSetup_(key) {
  Logger.log('Kitchen League key: ' + key);
  var ui = ui_();
  if (!ui) return;
  var html = HtmlService.createHtmlOutput(
    '<div style="font:15px/1.5 -apple-system,\'Segoe UI\',Roboto,sans-serif;color:#14171E">' +
    '<p style="margin:0 0 6px;font-weight:600">Your key</p>' +
    '<input readonly value="' + key + '" onclick="this.select()" style="width:100%;font:600 20px ui-monospace,Menlo,monospace;padding:10px;border:1.5px solid #D8DCE4;border-radius:10px;box-sizing:border-box">' +
    '<ol style="padding-left:20px;margin:14px 0 0">' +
    '<li>Back in Apps Script, choose <b>Deploy &gt; New deployment</b>. Type <b>Web app</b>, Execute as <b>Me</b>, Who has access <b>Anyone</b>, then Deploy. Already deployed? <b>Deploy &gt; Manage deployments</b> shows the address.</li>' +
    '<li>Copy the Web app address that ends in <b>/exec</b>.</li>' +
    '<li>In Kitchen League open <b>Settings &gt; Google Drive sync</b>, paste the address and this key, and press Connect.</li>' +
    '<li>To add the iPad, open Settings on the first device: it shows a pairing code to scan and a link to send.</li>' +
    '</ol></div>').setWidth(480).setHeight(420);
  ui.showModalDialog(html, 'Kitchen League set up');
}

// 20 characters from an alphabet without look-alikes (no 0/o, 1/l/i), grouped in fives so it can be typed
function newKey_() {
  var abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid());
  var s = '';
  for (var i = 0; i < 20; i++) s += abc.charAt((bytes[i] + 256) % abc.length) + (i % 5 === 4 && i < 19 ? '-' : '');
  return s;
}

function key_() {
  var k = PropertiesService.getScriptProperties().getProperty('KEY');
  if (k) return k;
  return KEY && KEY.indexOf('CHANGE-ME') !== 0 ? KEY : '';
}

function checkKey_(k) {
  var want = key_();
  if (!want) return {ok: false, error: 'The sheet has no key yet. In the Google Sheet, choose Kitchen League > Set up.'};
  if (String(k || '').trim() !== want) return {ok: false, error: 'That key does not match. Kitchen League > Set up in the Google Sheet shows the right one.'};
  return null;
}


/* ---------- web app ---------- */

function doGet(e) {
  var p = (e && e.parameter) || {};
  // Opening the /exec address in a browser: say hello instead of an error
  if (!('key' in p)) {
    return HtmlService.createHtmlOutput('<p style="font:16px/1.5 sans-serif">The Kitchen League sheet is online. Paste this page\'s address into Kitchen League &gt; Settings &gt; Google Drive sync.</p>').setTitle('Kitchen League');
  }
  var bad = checkKey_(p.key);
  if (bad) return out_(bad);
  // Read the clock before the rows: a save that lands mid-read is then newer than "now" and comes back on the next poll
  var now = Date.now();
  var since = Number(p.since) || 0;
  return out_({ok: true, v: VERSION, config: getConfig_(), days: readDays_(since), now: now});
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ok: false, error: 'Bad request'}); }
  var bad = checkKey_(body.key);
  if (bad) return out_(bad);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return out_({ok: false, error: 'The sheet is busy. Trying again shortly.'});
  try {
    var cfg = body.config ? setConfig_(body.config) : getConfig_();
    var rows = dayRows_();
    var touched = {};
    (body.ops || []).forEach(function (o) {
      if (!o || !o.date || !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) return;
      var d = touched[o.date] || (rows[o.date] ? rows[o.date].data : null);
      d = normDay(d, o.date);
      touched[o.date] = applyOp(d, o);
    });
    var now = Date.now();
    writeDays_(touched, rows, cfg, now);
    return out_({ok: true, v: VERSION, config: cfg, days: touched, now: now});
  } finally {
    lock.releaseLock();
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}


/* ---------- sheet storage ---------- */

function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function getConfig_() {
  var v = sheet_('Config').getRange('A1').getValue();
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return null; }
}

function setConfig_(c) {
  var sh = sheet_('Config');
  sh.getRange('A1').setValue(JSON.stringify(c));
  sh.getRange('A2').setValue('Settings for Kitchen League. Change them in the app, not here.');
  return c;
}

function dateText_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v);
}

function dayRows_() {
  var sh = sheet_('Days'), last = sh.getLastRow(), map = {};
  if (last < 2) return map;
  var vals = sh.getRange(2, 1, last - 1, 3).getValues();
  vals.forEach(function (r, i) {
    var k = dateText_(r[0]);
    if (!k) return;
    var data = null;
    try { data = JSON.parse(r[2]); } catch (e) {}
    map[k] = {row: i + 2, updated: Number(r[1]) || 0, data: data};
  });
  return map;
}

function readDays_(since) {
  var rows = dayRows_(), out = {};
  Object.keys(rows).forEach(function (k) {
    if (rows[k].updated > since && rows[k].data) out[k] = rows[k].data;
  });
  return out;
}

function writeDays_(touched, rows, cfg, now) {
  var sh = sheet_('Days');
  var names = (cfg && cfg.names) || {a: 'Player one', b: 'Player two'};
  var header = ['Date', 'Updated', 'Data', names.a + ' points', names.b + ' points',
    names.a + ' water (ml)', names.a + ' protein (g)', names.b + ' water (ml)', names.b + ' protein (g)',
    names.a + ' chores', names.b + ' chores', 'Winner'];
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.getRange('A:A').setNumberFormat('@');
  Object.keys(touched).sort().forEach(function (k) {
    var d = touched[k];
    var t = function (p) {
      var x = d[p] || {};
      if (x.tw) return {water: x.tw, protein: x.tp};
      return (cfg && cfg.targets && cfg.targets[p]) || DEFAULT_TARGETS[p];
    };
    var sa = scoreOf(d, 'a', t('a')), sb = scoreOf(d, 'b', t('b'));
    var winner = sa.total > sb.total ? names.a : sb.total > sa.total ? names.b : 'Tie';
    var row = [k, now, JSON.stringify(d), sa.total, sb.total, sa.water, sa.protein, sb.water, sb.protein, sa.cn, sb.cn, winner];
    if (rows[k]) sh.getRange(rows[k].row, 1, 1, row.length).setValues([row]);
    else { sh.appendRow(row); rows[k] = {row: sh.getLastRow(), updated: now, data: d}; }
  });
}
