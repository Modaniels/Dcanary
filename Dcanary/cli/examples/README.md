# Mody CLI Examples

This directory contains example files and configurations for using the Mody CLI.

## Files

### `build-instructions.sh`

Example build instructions script for a TypeScript project. This demonstrates:

- Installing dependencies with `npm ci`
- Running linting and tests
- Building the project
- Generating a hash of the build artifacts

### Usage

```bash
# Add these build instructions to Mody
mody add-instructions \
  --project-id my-typescript-project \
  --version 1.0.0 \
  --file examples/build-instructions.sh
```

## CI/CD Integration Examples

### GitHub Actions

Create `.github/workflows/mody-verification.yml`:

```yaml
name: Mody Verification

on:
  push:
    tags: ['v*']

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Mody CLI
        run: npm install -g mody-cli
      
      - name: Add build instructions
        env:
          MODY_BUILD_INSTRUCTIONS_CANISTER_ID: ${{ secrets.BUILD_CANISTER_ID }}
        run: |
          mody add-instructions \
            --project-id ${{ github.repository }} \
            --version ${{ github.ref_name }} \
            --file examples/build-instructions.sh
      
      - name: Request verification
        env:
          MODY_VERIFICATION_CANISTER_ID: ${{ secrets.VERIFICATION_CANISTER_ID }}
        run: |
          mody request-verification \
            --project-id ${{ github.repository }} \
            --version ${{ github.ref_name }} \
            --json
```

### Environment Variables Template

Create a `.env.example` file:

```bash
# Mody CLI Configuration
MODY_BUILD_INSTRUCTIONS_CANISTER_ID=your-build-instructions-canister-id
MODY_VERIFICATION_CANISTER_ID=your-verification-canister-id
MODY_BUILD_EXECUTOR_CANISTER_IDS=executor1-id,executor2-id,executor3-id
MODY_NETWORK=ic
MODY_IDENTITY=default
MODY_TIMEOUT=600
MODY_LOG_LEVEL=info
```

## Project-specific Examples

### TypeScript/Node.js Project

```bash
# Build instructions for a Node.js project
npm ci
npm run lint
npm test
npm run build
tar -czf build.tar.gz dist/
sha256sum build.tar.gz
```

### Rust Project

```bash
# Build instructions for a Rust project
cargo check
cargo test
cargo build --release
tar -czf target.tar.gz target/release/
sha256sum target.tar.gz
```

### Python Project

```bash
# Build instructions for a Python project
pip install -r requirements.txt
python -m pytest
python setup.py build
tar -czf build.tar.gz build/
sha256sum build.tar.gz
```

### IC Canister Project

```bash
# Build instructions for an Internet Computer canister
dfx start --background --clean
dfx deploy
dfx canister call my_canister get_wasm_hash
dfx stop
```
