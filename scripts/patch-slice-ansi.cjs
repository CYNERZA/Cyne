#!/usr/bin/env node

/**
 * Patches slice-ansi and @alcalzone/ansi-tokenize to work with ansi-styles v4
 * These packages incorrectly use ansiStyles.color.ansi() which doesn't exist in v4
 */

const fs = require('fs');
const path = require('path');

console.log('Patching ansi-styles compatibility issues...');

// Patch 1: slice-ansi
const sliceAnsiPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '.pnpm',
  'slice-ansi@7.1.2',
  'node_modules',
  'slice-ansi',
  'index.js'
);

if (fs.existsSync(sliceAnsiPath)) {
  let content = fs.readFileSync(sliceAnsiPath, 'utf8');
  
  // Replace the problematic lines
  const oldPattern = `const endCodesSet = new Set();
const endCodesMap = new Map();
for (const [start, end] of ansiStyles.codes) {
\tendCodesSet.add(ansiStyles.color.ansi(end));
\tendCodesMap.set(ansiStyles.color.ansi(start), ansiStyles.color.ansi(end));
}`;

  const newPattern = `// Compatibility fix for ansi-styles v4
const ansiCode = (code) => \`\\x1B[\${code}m\`;

const endCodesSet = new Set();
const endCodesMap = new Map();
for (const [start, end] of ansiStyles.codes) {
\tendCodesSet.add(ansiCode(end));
\tendCodesMap.set(ansiCode(start), ansiCode(end));
}`;

  if (content.includes('ansiStyles.color.ansi(end)')) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(sliceAnsiPath, content);
    console.log('✓ Patched slice-ansi');
  } else {
    console.log('✓ slice-ansi already patched');
  }
} else {
  console.log('⚠ slice-ansi not found (this is OK if not installed yet)');
}

// Patch 2: @alcalzone/ansi-tokenize
const ansiTokenizePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '.pnpm',
  '@alcalzone+ansi-tokenize@0.1.3',
  'node_modules',
  '@alcalzone',
  'ansi-tokenize',
  'build',
  'ansiCodes.js'
);

if (fs.existsSync(ansiTokenizePath)) {
  let content = fs.readFileSync(ansiTokenizePath, 'utf8');
  
  if (content.includes('ansiStyles.color.ansi(end)')) {
    // Add the compatibility fix at the top
    content = content.replace(
      'export const ESCAPES = new Set([27, 155]); // \\x1b and \\x9b',
      `export const ESCAPES = new Set([27, 155]); // \\x1b and \\x9b
// Compatibility fix for ansi-styles v4
const ansiCode = (code) => \`\\x1B[\${code}m\`;`
    );
    
    // Replace the problematic calls in the loop
    content = content.replace(
      /ansiStyles\.color\.ansi\(/g,
      'ansiCode('
    );
    
    fs.writeFileSync(ansiTokenizePath, content);
    console.log('✓ Patched @alcalzone/ansi-tokenize');
  } else {
    console.log('✓ @alcalzone/ansi-tokenize already patched');
  }
} else {
  console.log('⚠ @alcalzone/ansi-tokenize not found (this is OK if not installed yet)');
}

console.log('Patch complete!');
