# Dcanary Web UI - Vercel Deployment

This directory contains the Dcanary documentation website optimized for Vercel deployment.

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/username/dcanary/tree/main/Dcanary/web-ui)

## 📋 Prerequisites

- Node.js 16+ 
- Vercel CLI (optional, for manual deployment)
- Git repository

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Validate HTML and run tests
npm test
```

## 🌐 Deployment Options

### Option 1: Automatic Deployment (Recommended)

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Set root directory to `Dcanary/web-ui`
   - Deploy!

2. **Auto-deploy setup:**
   - Vercel will automatically deploy on every push to main branch
   - Preview deployments for pull requests

### Option 2: Manual Deployment with Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
npm run preview

# Deploy to production
npm run deploy
```

### Option 3: GitHub Actions (CI/CD)

Create `.github/workflows/deploy.yml` in your repository root:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
    paths: ['Dcanary/web-ui/**']
  pull_request:
    branches: [main]
    paths: ['Dcanary/web-ui/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
        working-directory: ./Dcanary/web-ui
      - name: Build
        run: npm run build
        working-directory: ./Dcanary/web-ui
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./Dcanary/web-ui
```

## ⚙️ Configuration

### Vercel Settings

The `vercel.json` file includes:
- Static file serving for HTML, CSS, JS
- Security headers
- Cache optimization
- URL rewrites for clean URLs

### Environment Variables

For production, you may want to set:
- `NODE_ENV=production`
- `VERCEL_ENV=production`

### Custom Domain

1. In Vercel dashboard, go to your project
2. Go to Settings → Domains
3. Add your custom domain
4. Configure DNS records as instructed

## 📁 File Structure

```
web-ui/
├── index.html          # Home page
├── docs.html           # Documentation page
├── styles.css          # Main styles
├── styles-minimal.css  # Minimal styles
├── script.js           # Main JavaScript
├── analytics.js        # Analytics code
├── sw.js              # Service Worker
├── manifest.json      # PWA manifest
├── vercel.json        # Vercel configuration
├── package.json       # Dependencies and scripts
├── .vercelignore      # Files to ignore during deployment
└── README-DEPLOYMENT.md # This file
```

## 🔧 Build Process

The build process includes:
1. CSS minification
2. JavaScript minification and compression
3. HTML validation
4. ESLint checks
5. Optimization verification

## 📊 Performance Features

- **Mobile-first responsive design** with Tailwind CSS
- **Optimized images** and assets
- **Service Worker** for caching
- **PWA support** with manifest.json
- **Security headers** configured
- **CDN delivery** via Vercel Edge Network

## 🐛 Troubleshooting

### Common Issues

1. **Build fails:**
   ```bash
   npm run test  # Check for validation errors
   npm run lint  # Check for JavaScript errors
   ```

2. **CSS not loading:**
   - Ensure styles.css exists
   - Check vercel.json static file configuration

3. **Mobile responsiveness issues:**
   - The site uses Tailwind CSS with mobile-first design
   - Test on different screen sizes using browser dev tools

4. **404 errors:**
   - Check vercel.json routes configuration
   - Ensure all referenced files exist

### Support

- Vercel Documentation: https://vercel.com/docs
- Dcanary Issues: https://github.com/username/dcanary/issues

## 🎯 Production Checklist

- [ ] All HTML validates
- [ ] JavaScript passes ESLint
- [ ] Mobile responsiveness tested
- [ ] Performance tested (PageSpeed Insights)
- [ ] Security headers configured
- [ ] PWA features working
- [ ] Analytics configured
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active

## 📈 Analytics & Monitoring

The site includes:
- Google Analytics (configured in analytics.js)
- Vercel Analytics (automatic)
- Performance monitoring via Vercel dashboard

---

**Ready to deploy!** 🚀

The Dcanary Web UI is now fully optimized for Vercel deployment with mobile-responsive design, security headers, and performance optimizations.
