#!/bin/bash
# Mody Build Instructions Example
# This script demonstrates how to build a project in the decentralized environment

set -e  # Exit on error

echo "🚀 Starting Mody decentralized build..."

# Environment setup
echo "📦 Setting up build environment..."
node --version
npm --version

# Dependencies installation
echo "📋 Installing dependencies..."
npm ci

# Linting and code quality checks
echo "🔍 Running code quality checks..."
npm run lint
npm run format:check

# Build the project
echo "🏗️  Building project..."
npm run build

# Run tests
echo "🧪 Running test suite..."
npm test

# Integration tests (if available)
if npm run | grep -q "test:integration"; then
    echo "🔗 Running integration tests..."
    npm run test:integration
fi

# Security audit
echo "🔒 Running security audit..."
npm audit --audit-level moderate

# Build verification
echo "✅ Verifying build artifacts..."
if [ ! -d "dist" ]; then
    echo "❌ Build failed: dist directory not found"
    exit 1
fi

if [ -z "$(ls -A dist)" ]; then
    echo "❌ Build failed: dist directory is empty"
    exit 1
fi

# Calculate checksums for verification
echo "🧮 Calculating build artifact checksums..."
find dist -type f -exec sha256sum {} \; | sort > build-checksums.txt

echo "✅ Mody decentralized build completed successfully!"
echo "📁 Build artifacts located in: dist/"
echo "🔐 Checksums saved in: build-checksums.txt"
