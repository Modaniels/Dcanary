# 🚀 Quick Deploy to Vercel - Commands

## Option 1: One-Click Deploy (Fastest)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/username/dcanary&project-name=dcanary-web-ui&root-directory=Dcanary/web-ui)

## Option 2: Command Line (Recommended)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Navigate to project (if not already there)
```bash
cd /home/modaniels/Dcanary/Dcanary/web-ui
```

### 4. Deploy
```bash
# First time - setup project (use ./ when asked for directory)
vercel

# When prompted "In which directory is your code located?" answer: ./

# Production deployment
vercel --prod
```

### 5. Custom domain (optional)
Add domain in Vercel dashboard after deployment.

## Your site will be live at:
- https://dcanary-web-ui-yourname.vercel.app
- Custom domain if configured

## 🔧 Troubleshooting

### If you get path errors:
- When asked "In which directory is your code located?" answer: `./`
- Make sure you're in the `/home/modaniels/Dcanary/Dcanary/web-ui` directory

### If deployment fails:
```bash
# Clean and try again
rm -rf .vercel
vercel
```

### Check your files are ready:
```bash
ls -la
# Should see: index.html, docs.html, styles.css, etc.
```

## That's it! 🎉
