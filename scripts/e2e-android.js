#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const apkPath = process.env.CHORESCORE_APK_PATH;
function configuredAndroidPackage() {
  if (process.env.CHORESCORE_E2E_PACKAGE) return process.env.CHORESCORE_E2E_PACKAGE;
  const appConfigPath = path.resolve('app.json');
  const config = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
  const value = config?.expo?.android?.package;
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing expo.android.package in ${appConfigPath}`);
  }
  return value.trim();
}
const packageName = configuredAndroidPackage();
const outputDir = process.env.CHORESCORE_E2E_OUTPUT || path.resolve('audit/android-e2e');
const resultPath = path.join(outputDir, 'result.json');
const checkpoints = [];
const startedAt = new Date().toISOString();
fs.mkdirSync(outputDir, { recursive: true });

function adb(args, binary = false) {
  return execFileSync('adb', args, {
    encoding: binary ? null : 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function shell(...args) { return adb(['shell', ...args]); }
function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
function decode(value) {
  return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function dumpUi() {
  try { shell('uiautomator', 'dump', '/sdcard/chorescore-window.xml'); } catch (_) {}
  const xml = adb(['exec-out', 'cat', '/sdcard/chorescore-window.xml']);
  const nodes = [];
  for (const nodeMatch of xml.matchAll(/<node\b([^>]*)\/?>(?:<\/node>)?/g)) {
    const attrs = {};
    for (const attr of nodeMatch[1].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[attr[1]] = decode(attr[2]);
    nodes.push(attrs);
  }
  return { xml, nodes };
}
function nodeMatches(node, label, exact) {
  return [node['content-desc'] || '', node.text || ''].some((v) => exact ? v === label : v.includes(label));
}
function findNodes(label, exact = false) { return dumpUi().nodes.filter((n) => nodeMatches(n, label, exact)); }
function bounds(node) {
  const m = /^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/.exec(node.bounds || '');
  if (!m) throw new Error(`Invalid bounds for ${node.text || node['content-desc'] || 'node'}`);
  const [, x1, y1, x2, y2] = m.map(Number);
  return { x1, y1, x2, y2, x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) };
}
function swipeUp() { shell('input', 'swipe', '540', '1850', '540', '650', '350'); sleep(400); }
function swipeToTop() { for (let i = 0; i < 5; i += 1) { shell('input', 'swipe', '540', '600', '540', '1900', '250'); sleep(150); } }
function findVisible(label, { exact = false, scroll = true, last = false } = {}) {
  const attempts = scroll ? 7 : 1;
  for (let i = 0; i < attempts; i += 1) {
    const matches = findNodes(label, exact);
    if (matches.length) return last ? matches[matches.length - 1] : matches[0];
    if (scroll) swipeUp();
  }
  throw new Error(`UI node not found: ${label}`);
}
function tapNode(node, waitMs = 550) {
  const b = bounds(node);
  shell('input', 'tap', String(b.x), String(b.y));
  sleep(waitMs);
}
function tapLabel(label, options = {}) { const node = findVisible(label, options); tapNode(node, options.waitMs); return node; }
function tapLeftOf(label, px = 48) {
  const b = bounds(findVisible(label, { exact: true }));
  shell('input', 'tap', String(Math.max(10, b.x1 - px)), String(b.y)); sleep(550);
}
function tapBelow(label, px = 65) {
  const b = bounds(findVisible(label, { exact: true }));
  shell('input', 'tap', String(b.x), String(b.y2 + px)); sleep(250);
}
function inputText(value) { shell('input', 'text', value.replace(/ /g, '%s')); sleep(250); }
function typeInto(label, value) { tapNode(findVisible(label, { exact: true }), 150); inputText(value); }
function back() { shell('input', 'keyevent', 'KEYCODE_BACK'); sleep(500); }
function waitFor(label, timeoutMs = 10000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (findNodes(label).length) return;
    sleep(300);
  }
  throw new Error(`Timed out waiting for ${label}`);
}
function assertAbsent(label) {
  if (findNodes(label).length) throw new Error(`Expected ${label} to be absent`);
}
function screenshot(name) {
  const file = path.join(outputDir, `${String(checkpoints.length + 1).padStart(2, '0')}-${name}.png`);
  fs.writeFileSync(file, adb(['exec-out', 'screencap', '-p'], true));
  checkpoints.push({ name, screenshot: path.basename(file), at: new Date().toISOString() });
}
function writeResult(status, error = null) {
  fs.writeFileSync(resultPath, JSON.stringify({
    schemaVersion: 1,
    status,
    packageName,
    apkPath,
    startedAt,
    finishedAt: new Date().toISOString(),
    checkpoints,
    error: error ? String(error.stack || error) : null,
  }, null, 2));
}
function launch() {
  shell('am', 'force-stop', packageName);
  try { shell('monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1'); } catch (_) {}
  sleep(3000);
}
function openPersonalOptions() {
  swipeToTop();
  tapLabel('Options', { exact: true, scroll: true, last: true });
  waitFor('Options');
  findVisible('Mode de démonstration', { exact: true, scroll: true });
}

try {
  if (!apkPath || !fs.existsSync(apkPath)) throw new Error(`Unreadable CHORESCORE_APK_PATH: ${apkPath}`);
  if (!/device/.test(adb(['get-state']))) throw new Error('No adb device/emulator');
  if (!shell('pm', 'list', 'packages', packageName).includes(packageName)) adb(['install', '-r', apkPath]);

  // Re-enable network in case the smoke script disabled it
  try { shell('svc', 'wifi', 'enable'); } catch (_) {}
  try { shell('svc', 'data', 'enable'); } catch (_) {}
  sleep(1000);

  launch();
  waitFor('Démonstration', 60000);
  screenshot('login');
  tapLabel('Démonstration', { exact: true });
  waitFor('Appartement démo', 60000);
  screenshot('demo-premium-root');
  assertAbsent('ChoreScore Premium');

  tapLabel('Appartement démo', { exact: true });
  waitFor('Ajouter une tâche', 30000); waitFor('Score'); waitFor('To-do'); waitFor('Vaisselle du soir');
  screenshot('household-add-premium');

  tapBelow('Quoi ?', 62); inputText('TestE2E');
  tapLabel('Fait par: Alex', { exact: true });
  tapLabel('Fait pour: Sam', { exact: true });
  typeInto('Durée minutes', '20'); back();
  tapLabel('Valider', { exact: true }); waitFor('TestE2E');
  screenshot('entry-created');

  tapLabel('Score', { exact: true }); waitFor('Équilibres'); waitFor('Alex'); waitFor('Sam');
  screenshot('score-updated');
  tapLabel('Partager les équilibres', { exact: true, scroll: true, waitMs: 1300 });
  const activity = shell('dumpsys', 'activity', 'activities');
  if (!/(ResolverActivity|ChooserActivity|IntentResolver)/i.test(activity)) throw new Error('Native system share sheet did not open');
  screenshot('native-share-sheet'); back();

  tapLabel('To-do', { exact: true }); waitFor('Sortir les cartons'); screenshot('todo-premium');
  tapLeftOf('Sortir les cartons'); waitFor('Tâche faite !');
  tapLabel('Fait par: Sam', { exact: true });
  typeInto('Durée minutes', '10'); back();
  tapLabel('Valider', { exact: true }); waitFor('Terminées'); screenshot('todo-completed');

  tapLabel('Ajouter une tâche', { exact: true }); waitFor('Sortir les cartons');
  if (findNodes('Sortir les cartons', true).length !== 1) throw new Error('Todo completion did not create exactly one history entry');
  screenshot('todo-entry-in-history');

  back(); waitFor('Appartement démo');
  openPersonalOptions();
  tapLabel('Gratuit de démo', { exact: true, scroll: true }); screenshot('demo-free-options');
  tapLabel('Retour', { exact: true, scroll: true }); waitFor('Appartement démo');
  tapLabel('Appartement démo', { exact: true });

  tapLabel('To-do', { exact: true }); waitFor('Planification Premium'); waitFor('Découvrir Premium');
  screenshot('todo-free-contextual-upsell');
  tapLabel('Ajouter une tâche', { exact: true }); waitFor('Nouveau mois 🌿'); assertAbsent('Archive démo');
  screenshot('free-archive-hidden');

  back(); waitFor('Appartement démo');
  openPersonalOptions();
  tapLabel('Premium de démo', { exact: true, scroll: true }); screenshot('demo-premium-restored-options');
  tapLabel('Retour', { exact: true, scroll: true }); waitFor('Appartement démo');
  tapLabel('Appartement démo', { exact: true }); waitFor('Archive démo'); screenshot('premium-archive-restored');

  writeResult('pass');
  console.log(`Android golden path PASS — ${outputDir}`);
} catch (error) {
  try { screenshot('failure'); } catch (_) {}
  writeResult('fail', error);
  console.error(error.stack || error);
  process.exit(1);
}
