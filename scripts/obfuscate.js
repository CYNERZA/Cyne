#!/usr/bin/env node

import JavaScriptObfuscator from 'javascript-obfuscator';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const inputFile = process.argv[2] || 'cli.mjs';
const outputFile = process.argv[3] || 'cli.obfuscated.mjs';

console.log(`🔒 Obfuscating ${inputFile}...`);

try {
  // Read the built file
  const sourceCode = readFileSync(resolve(inputFile), 'utf8');
  
  // Obfuscation options optimized for Node.js CLI applications
  const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, {
    // Compact output
    compact: true,
    
    // Control flow flattening for harder reverse engineering
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    
    // Dead code injection to make analysis harder
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    
    // Debug protection (anti-debugging)
    debugProtection: false, // Disabled for CLI apps as it can cause issues
    debugProtectionInterval: 0, // Must be 0 or greater
    
    // Disable console output obfuscation to preserve CLI functionality
    disableConsoleOutput: false,
    
    // Domain lock (disable for general distribution)
    domainLock: [],
    
    // Identifier names generator
    identifierNamesGenerator: 'hexadecimal',
    
    // Ignore imports/requires for Node.js compatibility
    ignoreImports: true,
    
    // Rename properties
    renameProperties: false, // Can break Node.js modules
    
    // Reserved names to avoid breaking Node.js built-ins
    reservedNames: [
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
    ],
    
    // Self defending
    selfDefending: true,
    
    // String array encoding
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    
    // Transform object keys
    transformObjectKeys: true,
    
    // Unicode escape sequence
    unicodeEscapeSequence: false,
    
    // Node.js target
    target: 'node',
    
    // Source map
    sourceMap: false,
    sourceMapMode: 'separate'
  });

  // Write obfuscated code
  writeFileSync(resolve(outputFile), obfuscationResult.getObfuscatedCode());
  
  console.log(`✅ Obfuscated code written to ${outputFile}`);
  console.log(`📊 Original size: ${(sourceCode.length / 1024).toFixed(2)} KB`);
  console.log(`📊 Obfuscated size: ${(obfuscationResult.getObfuscatedCode().length / 1024).toFixed(2)} KB`);
  
} catch (error) {
  console.error('❌ Obfuscation failed:', error.message);
  process.exit(1);
}
