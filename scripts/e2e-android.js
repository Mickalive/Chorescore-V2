#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const apkPath = process.env.CHORESCORE_APK_PATH;
const packageName = process.env.CHORESCORE_E2E_PACKAGE || 'com.mickalive.chorescore';
const outputDir = process.env.CHORESCORE_E2E_OUTPUT || path.resolve('audit/android-e2e');
const resultPath = path.join(outputDir, 'result.json');

fs.mkdirSync(outputDir, { recursive: true });

const checkpoints = [];
const startedAt = new Date().toISOString();

function adb(args, options = {}) {
  return execFileSync('adb', args, {
    encoding: options.binary ? null : 'utf8',
    stdio: options.binary ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function shell(...args) {
  return adb(['shell', ...args]);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function decodeXml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function dumpUi() {
  try {
    shell('uiautomator', 'dump', '/sdcard/chorescore-window.xml');
  } catch (_) {
    // uiautomator can return a non-zero code while still writing the dump on some images.
  }
  const xml = adb(['exec-out', 'cat', '/sdcard/chorescore-window.xml']);
  const nodes = [];
  const nodeRegex = /<node\b([^>]*)\/?>(?:<\/node>)?/g;
  let match;
  while ((match = nodeRegex.exec(xml))) {
    const attrs = {};
    const attrRegex = /([\w-]+)="([^"]*)"/g;
    let attr;
    while ((attr = attrRegex.exec(match[1]))) attrs[attr[1]] = decodeXml(attr[2]);
    nodes.push(attrs);
  }
  return { xml, nodes };
}

function nodeLabel(node) {
  return [node['content-desc'] || '', node.text || ''].filter(Boolean).join(' | ');
}

function matchesLabel(node, label, exact = false) {
  const values = [node['content-desc'] || '', node.text || ''];
  return values.some((value) => exact ? value === label : value.includes(label));
}

function findNodes(label, exact = false) {
  return dumpUi().nodes.filter((node) => matchesLabel(node, label, exact));
}

function parseBounds(bounds) {
  const match = /^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/.exec(bounds || '');
  if (!match) throw new Error(`Invalid bounds: ${bounds}`);
  const [, x1, y1, x2, y2] = match.map(Number);
  return { x1, y1, x2, y2, x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) };
}

function swipeUp() {
  shell('input', 'swipe', '540', '1850', '540', '650', '350');
  sleep(350);
}

function swipeDown() {
  shell('input', 'swipe', '540', '650', '540', '1850', '350');
  sleep(350);
}

function findVisible(label, { exact = false, scroll = true, last = false } = {}) {
  for (let attempt = 0; attempt < (scroll ? 6 : 1); attempt += 1) {
    const nodes = findNodes(label, exact);
    if (nodes.length > 0) return last ? nodes[nodes.length - 1] : nodes[0];
    if (scroll) swipeUp();
  }
  throw new Error(`UI node not found: ${label}`);
}

function tapLabel(label, options = {}) {
  const node = findVisible(label, options);
  const { x, y } = parseBounds(node.bounds);
  shell('input', 'tap', String(x), String(y));
  sleep(options.waitMs || 500);
  return node;
}

function tapLeftOfText(label, pixels = 48) {
  const node = findVisible(label, { exact: true });
  const { x1, y } = parseBounds(node.bounds);
  shell('input', 'tap', String(Math.max(10, x1 - pixels)), String(y));
  sleep(500);
}

function tapBelowText(label, pixels = 65) {
  const node = findVisible(label, { exact: true });
  const { x, y2 } = parseBounds(node.bounds);
  shell('input', 'tap', String(x), String(y2 + pixels));
  sleep(250);
}

function inputText(value) {
  const encoded = value.replace(/ /g, '%s');
  shell('input', 'text', encoded);
  sleep(250);
}

function typeIntoLabel(label, value) {
  const node = findVisible(label, { exact: true });
  const { x, y } = parseBounds(node.bounds);
  shell('input', 'tap', String(x), String(y));
  sleep(150);
  inputText(value);
}

function pressBack() {
  shell('input', 'keyevent', 'KEYCODE_BACK');
  sleep(450);
}

function waitFor(label, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (findNodes(label, false).length > 0) return;
    sleep(300);
  }
  const { xml } = dumpUi();
  throw new Error(`Timed out waiting for "${label}". UI: ${xml.slice(0, 2500)}`);
}

function assertAbsent(label) {
  const matches = findNodes(label, false);
  if (matches.length > 0) {
    throw new Error(`Expected "${label}" to be absent but found ${matches.length} node(s)`);
  }
}

function screenshot(name) {
  const file = path.join(outputDir, `${String(checkpoints.length + 1).padStart(2, '0')}-${name}.png`);
  const png = adb(['exec-out', 'screencap', '-p'], { binary: true });
  fs.writeFileSync(file, png);
  checkpoints.push({ name, screenshot: path.basename(file), at: new Date().toISOString() });
}

function currentActivity() {
  return shell('dumpsys', 'activity', 'activities');
}

function writeResult(status, error) {
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

function launchApp() {
  shell('am', 'force-stop', packageName);
  try {
    shell('monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1');
  } catch (_) {
    // monkey may emit warnings despite launching the app.
  }
  sleep(1200);
}

try {
  if (!apkPath || !fs.existsSync(apkPath)) throw new Error(`CHORESCORE_APK_PATH is missing or unreadable: ${apkPath}`);
  if (!/device/.test(adb(['get-state']))) throw new Error('No Android emulator/device available through adb');

  const packages = shell('pm', 'list', 'packages', packageName);
  if (!packages.includes(packageName)) {
    adb(['install', '-r', apkPath]);
  }

  // 1) Launch → canonical demo Premium fixture.
  launchApp();
  waitFor('Démonstration');
  screenshot('login');
  tapLabel('Démonstration', { exact: true });
  waitFor('Appartement démo');
  screenshot('demo-premium-root');
  assertAbsent('ChoreScore Premium');

  // 2) Household and exact three tabs.
  tapLabel('Appartement démo', { exact: true });
  waitFor('Ajouter une tâche');
  waitFor('Score');
  waitFor('To-do');
  waitFor('Vaisselle du soir');
  screenshot('household-add-premium');

  // 3) Add a 20-minute one-off entry performed by Alex for Sam.
  tapBelowText('Quoi ?', 62);
  inputText('TestE2E');
  tapLabel('Fait par: Alex', { exact: true });
  tapLabel('Fait pour: Sam', { exact: true });
  typeIntoLabel('Durée minutes', '20');
  pressBack(); // close number keyboard
  tapLabel('Valider', { exact: true });
  waitFor('TestE2E');
  screenshot('entry-created');

  // 4) Score updates and native system share opens.
  tapLabel('Score', { exact: true });
  waitFor('Équilibres');
  waitFor('Alex');
  waitFor('Sam');
  screenshot('score-updated');
  tapLabel('Partager les équilibres', { exact: true, scroll: true, waitMs: 1200 });
  const shareActivity = currentActivity();
  if (!/(ResolverActivity|ChooserActivity|IntentResolver|android\.intent\.action\.CHOOSER)/i.test(shareActivity)) {
    throw new Error('Native system share sheet did not become active');
  }
  screenshot('native-share-sheet');
  pressBack();

  // 5) Complete canonical Todo as Sam, 10 min, for Alex + Sam.
  tapLabel('To-do', { exact: true });
  waitFor('Sortir les cartons');
  screenshot('todo-premium');
  tapLeftOfText('Sortir les cartons', 48);
  waitFor('Tâche faite !');
  tapLabel('Fait par: Sam', { exact: true });
  typeIntoLabel('Durée minutes', '10');
  pressBack();
  tapLabel('Valider', { exact: true });
  waitFor('Terminées');
  screenshot('todo-completed');

  tapLabel('Ajouter une tâche', { exact: true });
  waitFor('Sortir les cartons');
  const completedEntryOccurrences = findNodes('Sortir les cartons', true).length;
  if (completedEntryOccurrences !== 1) {
    throw new Error(`Todo completion must create exactly one history entry; found ${completedEntryOccurrences}`);
  }
  screenshot('todo-entry-in-history');

  // 6) Switch to deterministic Free mode through explicitly test-labelled Options.
  pressBack();
  waitFor('Appartement démo');
  tapLabel('Options', { exact: true });
  waitFor('Mode de démonstration');
  tapLabel('Gratuit de démo', { exact: true, scroll: true });
  screenshot('demo-free-options');
  tapLabel('Retour', { exact: true });
  waitFor('Appartement démo');
  tapLabel('Appartement démo', { exact: true });

  tapLabel('To-do', { exact: true });
  waitFor('Planification Premium');
  waitFor('Découvrir Premium');
  screenshot('todo-free-contextual-upsell');

  tapLabel('Ajouter une tâche', { exact: true });
  waitFor('Nouveau mois 🌿');
  assertAbsent('Archive démo');
  screenshot('free-archive-hidden');

  // 7) Restore demo Premium and verify archived data returns.
  pressBack();
  waitFor('Appartement démo');
  tapLabel('Options', { exact: true });
  waitFor('Mode de démonstration');
  tapLabel('Premium de démo', { exact: true, scroll: true });
  screenshot('demo-premium-restored-options');
  tapLabel('Retour', { exact: true });
  waitFor('Appartement démo');
  tapLabel('Appartement démo', { exact: true });
  waitFor('Archive démo');
  screenshot('premium-archive-restored');

  writeResult('pass', null);
  console.log(`Android golden path PASS — evidence: ${outputDir}`);
} catch (error) {
  try { screenshot('failure'); } catch (_) {}
  writeResult('fail', error);
  console.error(error.stack || error);
  process.exit(1);
}
