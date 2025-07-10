# Dcanary Web UI - Vercel Deployment Guide

## 🚀 Quick Deployment Steps

### Prerequisites
1. **Node.js 16+** installed on your machine
2. **Git** repository set up
3. **Vercel account** (free at [vercel.com](https://vercel.com))
4. **Vercel CLI** installed globally

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```
Follow the prompts to authenticate with your Vercel account.

### Step 3: Deploy from Local Machine
Navigate to the web-ui directory:
```bash
cd /home/modaniels/Dcanary/Dcanary/web-ui
```

#### Option A: Quick Deploy (First Time)
```bash
vercel
```
- Follow the prompts
- Choose "N" for linking to existing project (first time)
- Enter project name: `dcanary-web-ui`
- Choose directory: `.` (current directory)
- Auto-detect settings: `Y`

#### Option B: Production Deploy
```bash
vercel --prod
```

### Step 4: Deploy from GitHub (Recommended)

1. **Push your code to GitHub:**
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

2. **Connect GitHub to Vercel:**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `web-ui` folder as root directory
   - Deploy automatically

### Step 5: Custom Domain (Optional)
1. Go to your project dashboard on Vercel
2. Click on "Domains" tab
3. Add your custom domain (e.g., `dcanary.io`)
4. Follow DNS configuration instructions

## 📋 Build Configuration

The project is already configured with:
- ✅ `vercel.json` - Vercel configuration
- ✅ `.vercelignore` - Files to exclude
- ✅ Build scripts in `package.json`
- ✅ Static file optimization
- ✅ Security headers
- ✅ Caching strategies

### Build Scripts Available:
```bash
npm run build        # Full production build
npm run test         # Run tests and validation
npm run deploy       # Deploy to production
npm run preview      # Deploy preview
npm start           # Local development server
```

## 🔧 Environment Variables

If you need environment variables:
1. Create `.env.local` (already in .gitignore)
2. Add variables in Vercel dashboard under "Environment Variables"

Example:
```bash
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
NEXT_PUBLIC_API_URL=https://api.dcanary.io
```

## 🌐 URLs After Deployment

- **Production:** `https://dcanary-web-ui.vercel.app`
- **Custom Domain:** `https://dcanary.io` (if configured)
- **Preview:** `https://dcanary-web-ui-git-branch.vercel.app`

## 🚦 Deployment Status

Check deployment status:
```bash
vercel ls                    # List deployments
vercel inspect <url>         # Inspect specific deployment
vercel logs <url>           # View deployment logs
```

## 🔍 Troubleshooting

### Common Issues:

1. **Build Failures:**
```bash
npm run test    # Check for lint/validation errors
npm run build   # Test build locally
```

2. **File Not Found Errors:**
   - Check `.vercelignore` file
   - Ensure all assets are in repository
   - Verify file paths in HTML

3. **Performance Issues:**
   - Images are optimized
   - CSS/JS are minified in build process
   - CDN assets (Tailwind) load from external

### Debug Mode:
```bash
vercel --debug
```

## 📊 Analytics & Monitoring

The site includes:
- Google Analytics integration
- Service Worker for caching
- Performance monitoring
- Error tracking

## 🔒 Security Features

Automatically configured:
- Security headers (CSP, XSS protection)
- HTTPS enforcement
- CORS policies
- Content type validation

## 📱 Features Included

- ✅ Fully responsive design
- ✅ Mobile-first approach
- ✅ Progressive Web App (PWA)
- ✅ SEO optimized
- ✅ Fast loading
- ✅ Accessibility compliant

## 🔄 Continuous Deployment

Once connected to GitHub:
1. Every push to `main` branch = Production deployment
2. Every push to other branches = Preview deployment
3. Pull requests = Automatic preview deployments

## 📞 Support

For deployment issues:
1. Check Vercel docs: [vercel.com/docs](https://vercel.com/docs)
2. Community forum: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
3. Project issues: [github.com/username/dcanary/issues](https://github.com/username/dcanary/issues)

---

**Happy Deploying! 🎉**

Your Dcanary documentation site will be live and accessible worldwide in minutes.
