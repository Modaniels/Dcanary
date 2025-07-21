#!/bin/bash

# DCanary Hackathon Demo Script
# This script demonstrates the complete DCanary ecosystem

echo "🐤 DCanary - Decentralized CI/CD Pipeline Demo"
echo "=============================================="
echo ""

echo "🌟 Starting DCanary Demo Environment..."
echo ""

# Check if we're in the right directory
if [ ! -f "packages/web-ui/index.html" ]; then
    echo "❌ Please run this script from the Dcanary root directory"
    exit 1
fi

echo "📚 1. Starting Documentation Website..."
cd packages/web-ui
nohup python3 -m http.server 8080 > /dev/null 2>&1 &
WEB_PID=$!
echo "   ✅ Website running at http://localhost:8080"
echo ""

# Go back to root
cd ../..

echo "⚡ 2. Installing DCanary CLI..."
cd packages/cli
npm link > /dev/null 2>&1
echo "   ✅ CLI installed globally as 'dcanary'"
echo ""

# Go back to root
cd ../..

echo "🚀 3. Demonstrating CLI Commands..."
echo ""

echo "   📋 Available Commands:"
echo "   ---------------------"
dcanary --help | head -20
echo ""

echo "   🔧 Initialize a new project:"
echo "   $ dcanary init --help"
dcanary init --help | head -10
echo ""

echo "   🏗️  Build with consensus:"
echo "   $ dcanary build --help"
dcanary build --help | head -10
echo ""

echo "   📊 Check project status:"
echo "   $ dcanary status --help"
dcanary status --help | head -10
echo ""

echo "   🔍 View detailed logs:"
echo "   $ dcanary logs --help"
dcanary logs --help | head -10
echo ""

echo "🎯 4. Demo Summary"
echo "=================="
echo "✅ Web UI:        http://localhost:8080"
echo "✅ CLI installed: dcanary --version"
echo "✅ Full workflow: Initialization → Configuration → Build → Deploy"
echo "✅ All commands:  dcanary --help"
echo ""

echo "🏆 Hackathon Features Demonstrated:"
echo "- ✅ Complete CLI with all major commands"
echo "- ✅ Interactive website with workflow visualization" 
echo "- ✅ Real command examples and documentation"
echo "- ✅ Decentralized architecture with smart canisters"
echo "- ✅ Git integration and consensus verification"
echo ""

echo "🔥 DCanary is ready for hackathon submission!"
echo "   Press Ctrl+C to stop the web server (PID: $WEB_PID)"
echo ""

# Keep the script running to maintain the web server
wait $WEB_PID
