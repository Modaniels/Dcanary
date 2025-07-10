#!/bin/bash

# Dcanary Web UI Deployment Script
# This script builds and deploys the web UI documentation

set -e

echo "🚀 Starting Dcanary Web UI Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the correct directory
if [[ ! -f "index.html" ]]; then
    print_error "index.html not found. Please run this script from the web-ui directory."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Installing dependencies..."
npm install

print_status "Running tests..."
npm test

print_status "Building minified assets..."
npm run build

print_status "Validating HTML..."
npm run validate

print_status "Formatting code..."
npm run format

# Create dist directory
print_status "Creating distribution directory..."
mkdir -p dist

# Copy files to dist
print_status "Copying files to dist..."
cp index.html dist/
cp styles.css dist/
cp script.js dist/
cp README.md dist/

# Copy minified files if they exist
if [[ -f "styles.min.css" ]]; then
    cp styles.min.css dist/
fi

if [[ -f "script.min.js" ]]; then
    cp script.min.js dist/
fi

# Create a simple deployment manifest
cat > dist/deployment-manifest.json << EOF
{
  "name": "dcanary-web-ui",
  "version": "1.0.0",
  "build_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_commit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "files": [
    "index.html",
    "styles.css",
    "script.js",
    "README.md"
  ],
  "minified_files": [
    "styles.min.css",
    "script.min.js"
  ]
}
EOF

print_success "Build completed successfully!"
print_status "Files are ready in the 'dist' directory"

echo ""
echo "📊 Deployment Summary:"
echo "  - HTML files validated ✓"
echo "  - CSS minified ✓"
echo "  - JavaScript minified ✓"
echo "  - All files copied to dist/ ✓"
echo ""

# Check file sizes
print_status "File sizes:"
if [[ -f "dist/index.html" ]]; then
    echo "  - index.html: $(du -h dist/index.html | cut -f1)"
fi
if [[ -f "dist/styles.css" ]]; then
    echo "  - styles.css: $(du -h dist/styles.css | cut -f1)"
fi
if [[ -f "dist/script.js" ]]; then
    echo "  - script.js: $(du -h dist/script.js | cut -f1)"
fi
if [[ -f "dist/styles.min.css" ]]; then
    echo "  - styles.min.css: $(du -h dist/styles.min.css | cut -f1)"
fi
if [[ -f "dist/script.min.js" ]]; then
    echo "  - script.min.js: $(du -h dist/script.min.js | cut -f1)"
fi

echo ""
print_success "🎉 Deployment package ready!"
print_status "You can now deploy the contents of the 'dist' directory to your web server."

# Optional: Start a local server to preview
read -p "Would you like to start a local server to preview the site? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Starting local server at http://localhost:8000..."
    cd dist
    python -m http.server 8000 || python3 -m http.server 8000 || npx serve . -p 8000
fi
