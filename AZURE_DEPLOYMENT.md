# GitHub Workflow Setup Guide - Azure Deployment

This project uses GitHub Actions to automatically build and deploy your React + Vite application to Azure.

## Workflow Overview

The workflow (`deploy-azure.yml`) includes two deployment options:

1. **Azure Static Web Apps** - Best for SPA applications (recommended)
2. **Azure App Service** - For traditional app deployments

## Prerequisites

- GitHub repository with this workflow file in `.github/workflows/`
- Azure subscription with either:
  - Azure Static Web Apps resource, OR
  - Azure App Service resource

## Setup Instructions

### Option 1: Azure Static Web Apps (Recommended for SPA)

1. **Create Azure Static Web Apps Resource:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Create a new "Static Web App" resource
   - Connect it to your GitHub repository
   - Azure will auto-generate the deployment token

2. **Add GitHub Secret:**
   - Go to your GitHub repo Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: Paste the API token from Azure Static Web Apps

3. **Trigger Deployment:**
   - Push to `main` or `develop` branch
   - Workflow will automatically run

### Option 2: Azure App Service

1. **Create Azure App Service:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Create a new "App Service" resource
   - Configure for Node.js runtime
   - Set up Application Settings if needed

2. **Get Publish Profile:**
   - In Azure Portal, go to your App Service
   - Click "Get publish profile" (download button)
   - Open the .PublishSettings file with a text editor

3. **Add GitHub Secrets:**
   - Go to your GitHub repo Settings → Secrets and variables → Actions
   - Add two new repository secrets:
     - Name: `AZURE_APP_NAME` | Value: Your app service name
     - Name: `AZURE_PUBLISH_PROFILE` | Value: Paste entire content of .PublishSettings file

4. **Trigger Deployment:**
   - Push to `main` branch
   - Workflow will automatically run

## Workflow Triggers

The workflow runs on:
- **Push** to `main` or `develop` branches
- **Pull Requests** to `main` (build only, no deployment)

Actual deployment to Azure only occurs on push to `main` branch.

## Environment Variables

If your React app needs environment variables, add them to:

1. **Local Development:**
   ```
   Create a `.env.local` file in project root
   VITE_API_URL=your_api_url
   ```

2. **GitHub Actions:**
   - Add secrets in GitHub repo Settings
   - Reference in workflow with `${{ secrets.YOUR_SECRET }}`
   - Use in build step: `VITE_API_URL=${{ secrets.VITE_API_URL }} npm run build`

3. **Azure App Service:**
   - Add Application Settings in Azure Portal
   - App Service will load them as environment variables

## Monitoring Deployments

1. **View Workflow Runs:**
   - Go to your GitHub repo
   - Click "Actions" tab
   - See all workflow runs and their status

2. **View Logs:**
   - Click on a workflow run
   - Click on "build-and-deploy" job
   - View detailed logs for each step

3. **View Azure Deployment:**
   - For Static Web Apps: Go to resource → Environments → Production
   - For App Service: Go to resource → Overview → see deployment history

## Troubleshooting

### Build Fails
- Check `npm install` step - ensure all dependencies are available
- Check Node.js version compatibility
- Review build logs for specific errors

### Deployment Fails
- Verify Azure credentials/secrets are correctly set
- Check Azure resource exists and is properly configured
- Ensure `package.json` build output matches expected paths (should be `dist/`)

### Still Issues?
- Check both GitHub Actions logs and Azure deployment logs
- Verify network connectivity between services
- Ensure Azure resource has sufficient quota/resources

## Next Steps

1. Configure your app URL in Azure if needed
2. Set up custom domain (optional)
3. Add monitoring and alerts in Azure
4. Configure CI/CD pipeline for staging environment if needed

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)
