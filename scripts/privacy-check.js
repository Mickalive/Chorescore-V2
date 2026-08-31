#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'src/analytics/types.ts',
  'src/analytics/pipeline.ts',
  'src/analytics/gate.ts',
  'src/analytics/taxonomy.ts',
  'src/infrastructure/local/LocalResearchAnalyticsAdapter.ts',
  'docs/DATA_PRODUCT_PRIVACY.md',
];

const failures = [];
for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) {
    failures.push(`missing required privacy file: ${relative}`);
  }
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function extractInterface(source, name) {
  const marker = `export interface ${name}`;
  const start = source.indexOf(marker);
  if (start < 0) {
    failures.push(`missing interface ${name}`);
    return '';
  }
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  failures.push(`unterminated interface ${name}`);
  return '';
}

if (failures.length === 0) {
  const types = read('src/analytics/types.ts');
  const anonymousInterfaces = [
    'AnonymousTaskFact',
    'AnonymousHouseholdAggregate',
    'AnonymousCohortAggregate',
    'ResearchDataProduct',
    'DataProductProvenance',
  ];
  const forbiddenProperties = [
    'userId', 'accountId', 'memberId', 'householdId', 'membershipId',
    'entryId', 'persistentTaskId', 'todoId',
    'email', 'phone', 'oauthSubject', 'ipAddress', 'deviceId', 'advertisingId',
    'label', 'title', 'notes', 'name', 'displayName', 'householdName', 'memberName',
    'latitude', 'longitude', 'address', 'zipCode',
    'createdAt', 'occurredAt', 'completedAt',
  ];

  for (const interfaceName of anonymousInterfaces) {
    const block = extractInterface(types, interfaceName);
    for (const property of forbiddenProperties) {
      const propertyPattern = new RegExp(`(^|\\n)\\s*${property}\\??\\s*:`, 'm');
      if (propertyPattern.test(block)) {
        failures.push(`${interfaceName} contains forbidden release property ${property}`);
      }
    }
  }

  const product = extractInterface(types, 'ResearchDataProduct');
  const rawOperationalTypes = ['CompletedEntry', 'TodoItem', 'PersistentTask', 'User', 'Member', 'Household'];
  for (const typeName of rawOperationalTypes) {
    if (new RegExp(`\\b${typeName}\\b`).test(product)) {
      failures.push(`ResearchDataProduct references operational type ${typeName}`);
    }
  }

  const pipeline = read('src/analytics/pipeline.ts');
  const gate = read('src/analytics/gate.ts');
  const taxonomy = read('src/analytics/taxonomy.ts');
  if (!/PrivacyTransformPipeline/.test(pipeline)) failures.push('PrivacyTransformPipeline implementation missing');
  if (!/PrivacyReleaseGate/.test(gate)) failures.push('PrivacyReleaseGate implementation missing');
  if (!/TaskTaxonomy/.test(taxonomy)) failures.push('Task taxonomy implementation missing');
}

if (failures.length > 0) {
  console.error('Privacy release contract FAILED:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Static privacy release contract: OK');
console.log('Running focused privacy/backend regression tests...');

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(
  npx,
  [
    'jest',
    '__tests__/application/V2-06-acceptance.test.ts',
    '__tests__/application/V2-06-phase2-acceptance.test.ts',
    '__tests__/infrastructure/analytics.test.ts',
    '--runInBand',
  ],
  { cwd: root, stdio: 'inherit', env: process.env }
);

if (result.status !== 0) {
  console.error(`Focused privacy tests failed with exit code ${result.status}`);
  process.exit(result.status || 1);
}

console.log('Privacy release contract: PASS');
