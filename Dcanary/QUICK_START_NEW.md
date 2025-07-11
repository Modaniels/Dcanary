# ⚡ DCanary Quick Start - Get Running in 5 Minutes

> **From zero to decentralized CI/CD hero in just 5 minutes!** 🚀

Ready to experience the future of CI/CD? Let's get you set up with your first decentralized pipeline that runs entirely on the blockchain!

## 🎯 Step 1: Install DCanary CLI

```bash
# Install the magic wand for decentralized CI/CD
npm install -g @dcanary/cli

# Verify it's working
dcanary --version
```

## 🎮 Step 2: Initialize Your Project

```bash
# Navigate to your project (or create a new one)
mkdir my-awesome-app && cd my-awesome-app
npm init -y

# Let DCanary work its magic
dcanary init --type nodejs

# 🎉 Your project is now DCanary-ready!
```

## 🚀 Step 3: Create Your First Pipeline

```bash
# Create a complete CI/CD pipeline in one command
dcanary pipeline create \
  --name "My Awesome App" \
  --repo "github:username/my-awesome-app"

# Add build stages
dcanary pipeline add-stage install --commands "npm ci"
dcanary pipeline add-stage test --commands "npm test"
dcanary pipeline add-stage build --commands "npm run build"
```

## 🔥 Step 4: Trigger Your First Build

```bash
# Push to your repo triggers automatic builds, or trigger manually:
dcanary build trigger --repo "github:username/my-awesome-app"

# Watch the magic happen in real-time
dcanary status

# View detailed logs
dcanary logs --follow
```

## 🎉 Step 5: Celebrate!

**Congratulations!** You just set up the world's first truly decentralized CI/CD pipeline! 

Your builds now run on:

- ✅ **Blockchain infrastructure** - No more vendor lock-in
- ✅ **Multiple executors** - Consensus-based verification  
- ✅ **Global redundancy** - 99.9% uptime guaranteed
- ✅ **Full transparency** - Every step is verifiable on-chain

## 🌟 What's Next?

### 🔍 Explore Advanced Features

```bash
# Set up webhooks for automatic builds
dcanary webhook setup --repo "github:username/my-awesome-app"

# Configure deployment to Internet Computer
dcanary deploy setup --network ic

# Set up notifications
dcanary notify setup --slack-webhook "your-webhook-url"
```

### 📚 Dive Deeper

- **[Complete Workflow Guide](./COMPLETE_WORKFLOW_GUIDE.md)** - Build a real npm project end-to-end
- **[Implementation Status](./IMPLEMENTATION_STATUS.md)** - See all available features
- **[Main Documentation](./README.md)** - Learn about the architecture

### 🐛 Need Help?

- **GitHub Issues** - Report bugs or request features
- **Discord Community** - Get help from other developers  
- **Documentation** - Comprehensive guides and examples

---

**🎯 Pro Tip:** DCanary works with any project type! Try `dcanary init --type rust` for Rust projects, `--type python` for Python, or `--type motoko` for Internet Computer canisters.

**Welcome to the decentralized future!** 🐤⛓️🚀
