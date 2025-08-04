# Code Obfuscation Setup

This project uses [javascript-obfuscator](https://www.npmjs.com/package/javascript-obfuscator) to protect the source code in the published npm package.

## 🔒 Obfuscation Process

### Build Scripts

- **`npm run build`** - Standard build without obfuscation
- **`npm run build:obfuscated`** - Build + obfuscate with light preset + replace original (production ready)
- **`npm run obfuscate:light`** - Obfuscate existing cli.mjs with light preset
- **`npm run obfuscate:balanced`** - Obfuscate with balanced preset  
- **`npm run obfuscate:heavy`** - Obfuscate with heavy preset

### Obfuscation Presets

| Preset | File Size Increase | Protection Level | Description |
|--------|-------------------|------------------|-------------|
| **Light** | ~71% | Basic | Minimal obfuscation, faster execution |
| **Balanced** | ~400% | Medium | Good protection/performance balance |
| **Heavy** | ~600% | High | Maximum protection, slower execution |

### 📦 Publishing Workflow

The GitHub Actions workflow (`.github/workflows/npm-publish.yml`) automatically:

1. **Build** the TypeScript source → `cli.mjs`
2. **Obfuscate** with light preset → `cli.obfuscated.mjs`  
3. **Replace** original with obfuscated version
4. **Publish** to npm

### 🛠️ Local Development

For local testing of obfuscated builds:

```bash
# Build with obfuscation (replaces cli.mjs)
npm run build:obfuscated

# Test the obfuscated version
node cli.mjs --version
node cli.mjs --help
```

### 🔧 Configuration

Obfuscation settings are in `scripts/obfuscate-preset.js`:

- **Node.js optimized** - Preserves `require`, `process`, etc.
- **Import safe** - Doesn't break module resolution
- **CLI friendly** - Preserves console output functionality

### 📊 File Sizes

- **Original (minified)**: ~3.5 MB
- **Light obfuscated**: ~5.9 MB  
- **Balanced obfuscated**: ~17-19 MB
- **Heavy obfuscated**: ~20+ MB

### ⚠️ Important Notes

1. **Production uses light preset** for optimal size/protection balance
2. **Obfuscated code is not debuggable** - use `npm run dev` for development
3. **Breaking changes** in obfuscator settings should be tested thoroughly
4. **Reserved names** protect Node.js built-ins from being obfuscated

### 🧪 Testing Obfuscation

After any changes to obfuscation settings:

```bash
# Test all presets
npm run obfuscate:light && node cli.obfuscated.mjs --version
npm run obfuscate:balanced && node cli.obfuscated.mjs --version  
npm run obfuscate:heavy && node cli.obfuscated.mjs --version
```
