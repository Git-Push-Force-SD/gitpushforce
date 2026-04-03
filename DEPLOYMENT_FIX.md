# Azure App Service Deployment Fix

## Changes Made

I've fixed the deployment issues by implementing the following changes:

### 1. **Vite Configuration** (`vite.config.js`)
- Added `base: './'` to ensure assets are resolved correctly from the root path
- This ensures CSS, JS, and images load properly in production

### 2. **Express Server** (`server.js`)
- Created a Node.js/Express server to serve the SPA with proper routing
- Azure App Service now runs this server instead of trying to serve static files directly
- The server catches all routes and serves `index.html` (SPA fallback routing)
- This prevents 404 errors when users access any route other than the root

### 3. **Server Startup** (`package.json`)
- Added `"start": "node server.js"` script
- Azure App Service automatically runs `npm start` to begin the application
- Added `express: ^4.18.2` to dependencies for the server

### 4. **GitHub Workflow** (`.github/workflows/main_unimart.yml`)
- Updated deployment to include all necessary files (not just `dist/`)
- Now includes:
  - `dist/` - Built React app
  - `server.js` - Express server
  - `package.json` & `package-lock.json` - Dependencies  
  - `web.config` - IIS routing rules (backup)
  - `node_modules/` - Pre-installed dependencies

### 5. **Web Config** (`web.config`)
- Already present - serves as backup IIS routing rules
- Now properly included in deployment

## How It Works Now

```
1. GitHub Actions builds React app → dist/ folder ✓
2. Workflow packages entire directory ✓
3. Azure deploys all files ✓
4. Azure App Service runs: npm install (if needed)
5. Azure App Service runs: npm start
6. Node.js starts Express server
7. Request comes in → Express serves from dist/ with SPA routing
8. Any non-file route → Redirects to index.html ✓
```

## Verification Steps

After deployment, verify the app is working:

1. **Check Azure Portal:**
   - Go to your App Service resource
   - Click "Deployment Center" → view deployment logs
   - Look for: "Server is running on..."

2. **Test the App:**
   - Visit: `https://unimart.azurewebsites.net`
   - Should display the landing page ✓
   - Click navigation links - should not get 404 errors ✓

3. **Check Application Logs:**
   - Azure Portal → App Service → Log Stream
   - Should show: "Server is running on http://localhost:3000"
   - Monitor for any errors

## If Issues Persist

### App still not displaying:
1. Check Azure App Service logs for Node.js errors
2. Verify `server.js` is present in deployment
3. Ensure `package.json` start script is correct

### Getting 404 errors on routes:
1. Verify `server.js` is running (`app.get('*')` handler)
2. Check that `dist/` folder exists with built files
3. Restart the App Service

### Assets (CSS/Images) not loading:
1. Open browser DevTools (F12)
2. Check Network tab for failed requests
3. Verify `base: './'` in vite.config.js
4. Check asset paths in browser console

## Testing Locally

Before pushing, test locally:

```bash
npm install
npm run build
npm start
```

Then visit: `http://localhost:3000`

The app should display correctly and navigation should work.

## Next Steps

1. Commit and push changes:
```bash
git add .
git commit -m "Fix Azure App Service deployment for SPA"
git push origin main
```

2. GitHub Actions will automatically:
   - Build the app
   - Run tests
   - Deploy to Azure

3. Monitor the deployment in GitHub Actions → Workflows

## Architecture After Fix

```
Azure App Service
├── Node.js Runtime
├── npm install (installs dependencies including Express)
├── npm start runs server.js
│
└── Express Server
    ├── Serves static files from dist/ folder
    ├── Handles all requests
    ├── Routes to index.html for SPA paths
    └── Serves built React app
```

This is the correct setup for deploying a Vite React SPA to Azure App Service!
