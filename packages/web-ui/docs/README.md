# DCanary Web Interface Documentation

## 🌐 Overview

The DCanary Web Interface provides a comprehensive, user-friendly dashboard for managing your decentralized CI/CD pipelines. Built with modern web technologies and optimized for both desktop and mobile use.

## 📋 Quick Access

- **[Main Documentation](../../docs/)** - Complete technical documentation
- **[Installation Guide](../../docs/QUICK_START)** - Get started quickly
- **[API Reference](../../docs/README#api-reference)** - Technical API documentation
- **[Live Demo](../index.html)** - Interactive web interface

## 🚀 Features

### Pipeline Management
- Real-time pipeline monitoring and status tracking
- Interactive pipeline configuration and editing
- Visual build history and logs viewer
- Automated webhook configuration

### Security & Verification
- Cryptographic build verification display
- Multi-executor consensus visualization
- Audit trail and compliance reporting
- Secure secret management interface

### Developer Experience
- One-click GitHub integration setup
- Code-free pipeline configuration
- Advanced troubleshooting tools
- Performance analytics and insights

## 🛠️ Deployment

The web interface can be deployed on any static hosting platform:

### Vercel (Recommended)
```bash
# One-click deploy
vercel --prod

# Or with CLI
npm install -g vercel
vercel login
vercel deploy --prod
```

### Netlify
```bash
# Connect your Git repository
# Auto-deploys on push to main branch
```

### GitHub Pages
```bash
# Enable GitHub Pages in repository settings
# Point to /Dcanary/web-ui/ directory
```

## 🔧 Configuration

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_CANISTER_ID_WEBHOOK=your_webhook_canister_id
NEXT_PUBLIC_CANISTER_ID_PIPELINE=your_pipeline_canister_id
NEXT_PUBLIC_IC_NETWORK=local|mainnet
```

### Build Configuration
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build
npm run start
```

## 📱 Mobile Support

The interface is fully responsive and provides:
- Touch-optimized navigation
- Mobile-friendly pipeline editing
- Offline capability with service worker
- Progressive Web App (PWA) features

## 🔗 Integration

### GitHub Integration
- Automatic webhook setup
- Repository access management
- Branch protection rules
- Status check integration

### Monitoring Tools
- Prometheus metrics export
- Grafana dashboard templates
- Custom alerting rules
- Performance monitoring

---

*For technical support and feature requests, visit our [GitHub repository](https://github.com/modaniels/Dcanary).*
