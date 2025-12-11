#!/usr/bin/env node

import JavaScriptObfuscator from 'javascript-obfuscator';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const inputFile = process.argv[2] || 'cli.mjs';
const outputFile = process.argv[3] || 'cli.obfuscated.mjs';
const preset = process.argv[4] || 'balanced'; // options: light, balanced, heavy

console.log(`🔒 Obfuscating ${inputFile} with ${preset} preset...`);

// Preset configurations
const presets = {
  light: {
    // Minimal obfuscation - faster, smaller file
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    debugProtectionInterval: 0,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    ignoreImports: true,
    renameProperties: false,
    selfDefending: false,
    stringArray: true,
    stringArrayCallsTransform: false,
    stringArrayEncoding: [],
    stringArrayThreshold: 0.5,
    stringArrayWrappersChainedCalls: false,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    // Exclude strings with Unicode characters that break when obfuscated
    reservedStrings: [
      '\\\\u',     // Unicode escape sequences
      '[\\u0080-\\uffff]',  // Any string with high Unicode chars
      'À-Ö',      // Unicode range patterns in regex
      'Ø-ö',
      'ø-˿',
      'Ͱ-ͽ',
      'Ϳ-῿',
      '‌-‍',
      '⁰-↏',
      'Ⰰ-⿯',
      '、-퟿',
      '豈-﷏',
      'ﷰ-��'
    ],
    target: 'node'
  },

  balanced: {
    // Balanced obfuscation - good protection with reasonable size
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.3,
    debugProtection: false,
    debugProtectionInterval: 0,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    ignoreImports: true,
    renameProperties: false,
    selfDefending: true,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.6,
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
    target: 'node'
  },

  heavy: {
    // Maximum obfuscation - best protection but larger file
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.8,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.5,
    debugProtection: false,
    debugProtectionInterval: 0,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    ignoreImports: true,
    renameProperties: false,
    selfDefending: true,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['rc4', 'base64'],
    stringArrayThreshold: 0.8,
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
    target: 'node'
  }
};

// Common reserved names for all presets
const commonReservedNames = [
  'require',
  'exports',
  'module',
  'global',
  'process',
  'Buffer',
  '__dirname',
  '__filename',
  'console',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval'
];

try {
  // Read the built file
  const sourceCode = readFileSync(resolve(inputFile), 'utf8');

  // Get configuration for selected preset
  const config = presets[preset];
  if (!config) {
    throw new Error(`Unknown preset: ${preset}. Available: light, balanced, heavy`);
  }

  // Add reserved names to config
  config.reservedNames = commonReservedNames;

  // Obfuscate
  const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, config);

  // Write obfuscated code
  writeFileSync(resolve(outputFile), obfuscationResult.getObfuscatedCode());

  console.log(`✅ Obfuscated code written to ${outputFile}`);
  console.log(`📊 Original size: ${(sourceCode.length / 1024).toFixed(2)} KB`);
  console.log(`📊 Obfuscated size: ${(obfuscationResult.getObfuscatedCode().length / 1024).toFixed(2)} KB`);
  console.log(`📈 Size ratio: ${((obfuscationResult.getObfuscatedCode().length / sourceCode.length) * 100).toFixed(1)}%`);

} catch (error) {
  console.error('❌ Obfuscation failed:', error.message);
  process.exit(1);
}
