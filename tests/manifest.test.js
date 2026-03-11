'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

test('does not declare extension shortcut commands', () => {
  const manifest = readManifest();

  assert.equal('commands' in manifest, false);
});

test('declares extension icons for store publishing', () => {
  const manifest = readManifest();

  assert.deepEqual(manifest.icons, {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png'
  });

  assert.deepEqual(manifest.action.default_icon, {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png'
  });
});

test('icon files referenced by manifest exist', () => {
  const manifest = readManifest();
  const projectRoot = path.join(__dirname, '..');

  for (const iconPath of Object.values(manifest.icons)) {
    const absPath = path.join(projectRoot, iconPath);
    assert.equal(fs.existsSync(absPath), true, `missing icon file: ${iconPath}`);
  }
});

test('does not load shortcut helper before content script', () => {
  const manifest = readManifest();
  const contentEntry = manifest.content_scripts && manifest.content_scripts[0];

  assert.ok(contentEntry, 'content script entry should exist');
  assert.deepEqual(contentEntry.js, ['src/floating-button-position.js', 'src/content.js']);
});

test('declares storage permission for floating button persistence', () => {
  const manifest = readManifest();

  assert.ok(Array.isArray(manifest.permissions), 'permissions section should exist');
  assert.equal(manifest.permissions.includes('storage'), true);
});
