#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLI_FILE = path.join(__dirname, '..', 'cli.mjs');

console.log('🔧 Fixing syntax issues for obfuscation...');

try {
  let content = fs.readFileSync(CLI_FILE, 'utf8');

  // Fix the specific malformed optional chaining patterns that cause obfuscation issues
  const fixes = [
    // Fix complete lK.default patterns including the closing part
    [/lK\.default\.color\?\.ansi \? \.color && \.color\.ansi \? \.color\.ansi\( : \(([AE])\)/g, 'lK.default.color?.ansi?.color ? lK.default.color.ansi.color.ansi($1) : $1'],

    // Fix complete NJ.default patterns including the closing part
    [/NJ\.default\.color\?\.ansi \? \.color && \.color\.ansi \? \.color\.ansi\( : \(([AE])\)/g, 'NJ.default.color?.ansi?.color ? NJ.default.color.ansi.color.ansi($1) : $1'],

    // Fix any remaining malformed patterns with variables
    [/(\w+\.default)\.color\?\.ansi \? \.color && \.color\.ansi \? \.color\.ansi\( : \(([AE])\)/g, '$1.color?.ansi?.color ? $1.color.ansi.color.ansi($2) : $2'],

    // Fix direct calls to .color.ansi without optional chaining
    [/(\w+\.default)\.color\.ansi\(/g, '$1.color?.ansi ? $1.color.ansi( : ('],

    // Fix the new pattern found: pK.default.color?.ansi ? pK.default.color.ansi( : (E)
    [/(\w+\.default)\.color\?\.ansi \? \1\.color\.ansi\( : \(([AE])\)/g, '$1.color?.ansi ? $1.color.ansi($2) : $2'],

    // Fix incomplete patterns like: .color.ansi( : (E)
    [/\.color\.ansi\( : \(([AE])\)/g, '.color?.ansi ? .color.ansi($1) : $1'],

    // Fix nested patterns created by previous fixes: .ansi( : ( : (E)
    [/\.ansi\( : \( : \(([AE])\)/g, '.ansi($1)'],

    // Fix deeply nested patterns: .ansi( : ( : ( : (E)
    [/\.ansi\( : \( : \( : \(([AE])\)/g, '.ansi($1)'],

    // Fix any remaining pattern of multiple nested : ( : ( : (
    [/\( : \)+\(([AE])\)/g, '($1)']
  ];

  let fixCount = 0;
  fixes.forEach(([pattern, replacement]) => {
    const matches = content.match(pattern);
    if (matches) {
      fixCount += matches.length;
      content = content.replace(pattern, replacement);
    }
  });

  fs.writeFileSync(CLI_FILE, content);
  console.log(`✅ Fixed ${fixCount} syntax issues in cli.mjs`);

} catch (error) {
  console.error('❌ Error fixing syntax issues:', error.message);
  process.exit(1);
}