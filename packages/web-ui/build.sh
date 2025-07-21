#!/bin/bash
# Build script for Render deployment

echo "🚀 Starting DCanary Web UI build for Render..."

# Create public directory
mkdir -p public

# Copy all necessary files to public directory
echo "📁 Copying files to public directory..."
cp *.html public/ 2>/dev/null || true
cp *.css public/ 2>/dev/null || true  
cp *.js public/ 2>/dev/null || true
cp *.json public/ 2>/dev/null || true
cp *.png public/ 2>/dev/null || true
cp *.ico public/ 2>/dev/null || true
cp *.xml public/ 2>/dev/null || true
cp *.txt public/ 2>/dev/null || true
cp -r assets public/ 2>/dev/null || true
cp -r images public/ 2>/dev/null || true

echo "✅ Build complete! Files copied to public/ directory"
echo "🌐 Ready for static hosting on Render"

# List contents for verification
echo "📋 Build contents:"
ls -la public/
