#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const baseUrl = process.env.APPIUM_URL || 'http://127.0.0.1:4723';
const apkPath = process.env.CHORESCORE_APK_PATH;
const packageName = process.env.CHORESCORE_E2E_PACKAGE || 'com.chorescore.v2';
const outputDir = process.env.CHORESCORE_E2E_OUTPUT || path.resolve('audit/appium-e2e');
const resultPath = path.join(outputDir, 'result.json');
const startedAt = new Date().toISOString();
const checkpoints = [];
let sessionId = null;

fs.mkdirSync(outputDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(method, endpoint, body) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch (_) { payload = { value: text }; }
  }
  if (!response.ok || payload?.value?.error) {
    const message = payload?.value?.message || payload?.value?.error || text || `${method} ${endpoint} failed`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function javaString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function elementId(payload) {
  const value = payload?.value || {};
  return value['element-6066-11e4-a52e-4f735466cecf'] || value.ELEMENT;
}

async function findOnce(label) {
  const escaped = javaString(label);
  const selectors = [
    `new UiSelector().text("${escaped}")`,
    `new UiSelector().description("${escaped}")`,
  ];
  for (const selector of selectors) {
    try {
      const payload = await request('POST', `/session/${sessionId}/element`, {
        using: '-android uiautomator',
        value: selector,
      });
      const id = elementId(payload);
      if (id) return id;
    } catch (error) {
      if (!/no such element/i.test(String(error.message))) throw error;
    }
  }
  return null;
}

async function waitFor(label, timeoutMs = 15000) {
  const until = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < until) {
    try {
      const id = await findOnce(label);
      if (id) return id;
    } catch (error) {
      lastError = error;
    }
    await sleep(300);
  }
  if (lastError) throw lastError;
  throw new Error(`Timed out waiting for ${label}`);
}

async function click(label, timeoutMs = 15000) {
  const id = await waitFor(label, timeoutMs);
  await request('POST', `/session/${sessionId}/element/${id}/click`, {});
  await sleep(350);
}

async function clearAndType(label, value) {
  const id = await waitFor(label, 15000);
  await request('POST', `/session/${sessionId}/element/${id}/click`, {});
  await request('POST', `/session/${sessionId}/element/${id}/clear`, {});
  await request('POST', `/session/${sessionId}/element/${id}/value`, {
    text: value,
    value: [...value],
  });
  await sleep(300);
}

async function hideKeyboard() {
  try {
    await request('POST', `/session/${sessionId}/appium/device/hide_keyboard`, {});
  } catch (_) {
    // Keyboard may already be hidden; this must not invalidate the product test.
  }
  await sleep(250);
}

async function screenshot(name) {
  const payload = await request('GET', `/session/${sessionId}/screenshot`);
  const file = path.join(outputDir, `${String(checkpoints.length + 1).padStart(2, '0')}-${name}.png`);
  fs.writeFileSync(file, Buffer.from(payload.value, 'base64'));
  checkpoints.push({ name, screenshot: path.basename(file), at: new Date().toISOString() });
}

async function saveSource(name = 'failure-source.xml') {
  try {
    const payload = await request('GET', `/session/${sessionId}/source`);
    fs.writeFileSync(path.join(outputDir, name), String(payload.value || ''));
  } catch (_) {}
}

function writeResult(status, error = null) {
  fs.writeFileSync(resultPath, JSON.stringify({
    schemaVersion: 1,
    runner: 'appium-uiautomator2',
    status,
    packageName,
    apkPath,
    startedAt,
    finishedAt: new Date().toISOString(),
    checkpoints,
    error: error ? String(error.stack || error) : null,
  }, null, 2));
}

async function main() {
  if (!apkPath || !fs.existsSync(apkPath)) throw new Error(`Unreadable CHORESCORE_APK_PATH: ${apkPath}`);

  const created = await request('POST', '/session', {
    capabilities: {
      alwaysMatch: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:app': path.resolve(apkPath),
        'appium:appPackage': packageName,
        'appium:autoGrantPermissions': true,
        'appium:noReset': false,
        'appium:newCommandTimeout': 120,
      },
    },
  });
  sessionId = created?.value?.sessionId || created?.sessionId;
  if (!sessionId) throw new Error(`Appium did not return a session id: ${JSON.stringify(created)}`);

  await waitFor('Démonstration', 60000);
  await screenshot('login');
  await click('Démonstration');
  await waitFor('Appartement démo', 60000);
  await screenshot('demo-premium-root');
  await click('Appartement démo');
  await waitFor('Ajouter une tâche', 30000);
  await screenshot('household-add-premium');

  await clearAndType('Nom de la tâche', 'teste2e');
  await click('Fait par: Alex');
  await click('Fait pour: Sam');
  await clearAndType('Durée minutes', '20');
  await hideKeyboard();
  await click('Valider');
  await waitFor('teste2e', 15000);
  await screenshot('entry-created');

  await click('Score');
  await waitFor('Équilibres', 15000);
  await waitFor('Alex', 15000);
  await waitFor('Sam', 15000);
  await screenshot('score-updated');

  await click('To-do');
  await waitFor('Sortir les cartons', 15000);
  await screenshot('todo-visible');

  writeResult('pass');
  console.log(`Appium Android core golden path PASS — ${outputDir}`);
}

(async () => {
  try {
    await main();
  } catch (error) {
    if (sessionId) {
      try { await screenshot('failure'); } catch (_) {}
      await saveSource();
    }
    writeResult('fail', error);
    console.error(error.stack || error);
    process.exitCode = 1;
  } finally {
    if (sessionId) {
      try { await request('DELETE', `/session/${sessionId}`); } catch (_) {}
    }
  }
})();
