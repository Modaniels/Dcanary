#!/bin/bash

# publish.sh - Script to help publish @dcanary/cli to NPM
set -e

echo "🚀 Publishing @dcanary/cli to NPM"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the CLI directory."
    exit 1
fi

# Check if user is logged in to NPM
echo "📝 Checking NPM authentication..."
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ You're not logged in to NPM. Please run 'npm login' first."
    exit 1
fi

NPM_USER=$(npm whoami)
echo "✅ Logged in as: $NPM_USER"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

# Ask for confirmation
echo ""
echo "🤔 Ready to publish @dcanary/cli@$CURRENT_VERSION?"
echo "   This will make the package publicly available on NPM."
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Publication cancelled."
    exit 1
fi

# Build the package
echo ""
echo "🔨 Building package..."
npm run build

# Run tests
echo ""
echo "🧪 Running tests..."
npm test

# Publish
echo ""
echo "📤 Publishing to NPM..."
npm publish

echo ""
echo "🎉 Successfully published @dcanary/cli@$CURRENT_VERSION!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify: npm view @dcanary/cli"
echo "   2. Test install: npm install -g @dcanary/cli"
echo "   3. Test CLI: dcanary --version"
echo ""
echo "🔗 Package URL: https://www.npmjs.com/package/@dcanary/cli"
