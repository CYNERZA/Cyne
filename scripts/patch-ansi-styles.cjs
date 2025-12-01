#!/usr/bin/env node

/**
 * Runtime patch for ansi-styles v6 compatibility
 * This patches the bundled executable to work with the new ansi-styles API
 */

const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '..', 'cli.mjs');

if (!fs.existsSync(bundlePath)) {
  console.error('Bundle file not found:', bundlePath);
  process.exit(1);
}

console.log('Patching ansi-styles compatibility in bundled executable...');

let bundleContent = fs.readFileSync(bundlePath, 'utf8');

// No regex replacements needed - the ansi-styles compatibility is handled by the shim

// Create a compatibility shim after the shebang line
const shimCode = `// Ansi-styles v6 compatibility shim
if (typeof globalThis !== 'undefined') {
  globalThis._originalAnsiFunction = function(styles, code) {
    if (styles && styles.color && typeof styles.color.ansi === 'function') {
      return styles.color.ansi(code);
    }
    return code;
  };
}
`;

// Check if there's a shebang line and preserve it
const shebangMatch = bundleContent.match(/^#!.*$/m);
if (shebangMatch) {
  const shebangLine = shebangMatch[0];
  const afterShebang = bundleContent.substring(shebangLine.length);
  bundleContent = shebangLine + '\n' + shimCode + afterShebang;
} else {
  bundleContent = shimCode + bundleContent;
}

// Write the patched content back
fs.writeFileSync(bundlePath, bundleContent);

console.log('Successfully patched ansi-styles compatibility!');