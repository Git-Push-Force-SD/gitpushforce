# Codecov Setup Guide

This guide walks through setting up Codecov for the Campus Marketplace project to track test coverage.

## Prerequisites

- GitHub repository with GitHub Actions configured
- Jest tests running and generating coverage reports
- The GitHub workflow already has codecov/codecov-action configured

## Step-by-Step Setup

### Step 1: Create Codecov Account

1. Go to [https://codecov.io](https://codecov.io)
2. Click **"Sign up with GitHub"** in the top right
3. Authorize Codecov to access your GitHub account
4. Click **"Allow"** when prompted for permissions

✅ Your Codecov account is now created!

### Step 2: Add Your Repository

1. After signing up, you'll be redirected to your dashboard
2. Click **"Add repository"** or **"New repository"**
3. Search for `gitpushforce` in your repository list
4. Click the repository to activate it

✅ Codecov is now monitoring your repository!

### Step 3: Verify GitHub Actions Integration

**For Public Repositories:**
- Codecov works automatically with public repos
- No additional setup needed!

**For Private Repositories:**

1. Go to your repository in Codecov dashboard
2. Click **"Settings"** (gear icon)
3. Copy the **"Repository Upload Token"**
4. In GitHub:
   - Go to your repository → **Settings** → **Secrets and variables** → **Actions**
   - Click **"New repository secret"**
   - **Name**: `CODECOV_TOKEN`
   - **Value**: Paste the token from Codecov
   - Click **"Add secret"**

✅ GitHub can now authenticate with Codecov!

### Step 4: Verify Workflow Configuration

The workflow is already configured in `.github/workflows/main_unimart.yml`:

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  if: always()
  with:
    file: ./coverage/coverage-final.json
    flags: unittests
    name: codecov-umbrella
    fail_ci_if_error: false
    verbose: true
```

This automatically:
- Generates coverage reports
- Uploads to Codecov
- Generates PR comments with coverage changes

✅ Workflow is ready!

### Step 5: Trigger Your First Upload

1. Push code to the `main` branch:
```bash
git add .
git commit -m "chore: add testing and coverage setup"
git push origin main
```

2. Go to GitHub → **Actions** tab
3. Watch the workflow run
4. Once complete, go to [Codecov.io](https://codecov.io)
5. Your repository should show coverage data!

✅ Coverage is now being tracked!

## Codecov Dashboard

### Dashboard Overview

Your Codecov dashboard shows:

1. **Coverage Badge**: Current coverage percentage
2. **Coverage Trend**: How coverage changes over time
3. **Branches**: Coverage for each branch
4. **Pull Requests**: Coverage reports for each PR
5. **File Coverage**: Coverage breakdown by file

### Viewing Coverage Reports

**For Your Repository:**
```
https://codecov.io/gh/YOUR_USERNAME/gitpushforce
```

**For Specific Branch:**
```
https://codecov.io/gh/YOUR_USERNAME/gitpushforce/branch/main
```

**For Specific Pull Request:**
- Codecov automatically comments on PRs with:
  - Coverage percentage change
  - New uncovered lines
  - Impact on coverage

## Adding Coverage Badge to README

Display your coverage badge in the README:

### Get Badge Markdown

1. Go to your Codecov dashboard
2. Click the **Coverage Badge** button
3. Copy the markdown embed code
4. Paste into `README.md`

### Example Badge

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/gitpushforce/branch/main/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/gh/YOUR_USERNAME/gitpushforce)
```

Replace:
- `YOUR_USERNAME` with your GitHub username
- `YOUR_TOKEN` with your repository token (optional for public repos)

Insert in README Features section:

```markdown
## Features

[![codecov](https://codecov.io/gh/...)](https://codecov.io/...)

- **Responsive Design**: ...
```

## Understanding Codecov Features

### PR Coverage Comments

When you create a pull request:
1. Tests run automatically
2. Coverage is generated
3. Codecov comments on the PR with:
   ```
   Coverage: 75.43% (+2.15%) ✅
   ```

### Coverage Differences

Codecov shows:
- **+X.XX%**: Coverage increased
- **-X.XX%**: Coverage decreased
- **=**: No change

### Uncovered Lines

In PR comments, Codecov highlights:
- New lines not covered by tests
- Suggestions to improve coverage

### Settings

Customize Codecov behavior in **Settings**:
- Require minimum coverage for merging
- Adjust coverage thresholds
- Configure notifications
- Set PR comment preferences

## Troubleshooting

### Coverage Not Appearing in Codecov

**Issue**: Push workflow completed but no coverage in Codecov

**Solutions**:
1. Check GitHub Actions logs:
   - Go to GitHub → **Actions**
   - Click the workflow run
   - Look for errors in "Upload coverage to Codecov" step

2. Verify coverage file exists:
   ```bash
   npm run test:coverage
   ls -la coverage/coverage-final.json
   ```

3. Check file permissions:
   ```bash
   # Ensure file is readable
   chmod 644 coverage/coverage-final.json
   ```

### Private Repository Not Connecting

**Issue**: Codecov can't authenticate with private repo

**Solution**:
1. Add `CODECOV_TOKEN` secret to GitHub (see Step 3)
2. Verify token is correct in Codecov dashboard
3. Regenerate token if needed:
   - Codecov dashboard → Settings → Regenerate token
   - Update GitHub secret with new token

### Low Coverage Percentage

**Issue**: Coverage dropped below threshold

**Solutions**:
1. Identify uncovered lines:
   ```bash
   npm run test:coverage
   open coverage/lcov-report/index.html
   ```

2. Write tests for uncovered code

3. Run tests locally to verify:
   ```bash
   npm test
   ```

### Codecov Comments Not Appearing on PR

**Issue**: PR doesn't have coverage comments

**Solutions**:
1. Check Codecov Settings:
   - Dashboard → Settings → PR Comments
   - Enable "Comment on pull requests"

2. Verify GitHub token permissions

3. Check if repo is public/private and set appropriately

## Advanced Configuration

### Custom Coverage Thresholds

Edit `jest.config.js` to adjust thresholds:

```javascript
coverageThreshold: {
  global: {
    branches: 80,    // Increase from 70
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

### Codecov Configuration File

Create `.codecov.yml` for advanced settings:

```yaml
coverage:
  precision: 2
  round: down
  range: "70...100"

comment:
  require_changes: false
  require_base: no
  require_head: yes
  layout: "reach,diff,flags,tree"
  behavior: default
  after: update

ignore:
  - "src/index.js"
  - "**/node_modules/**"
```

## Quick Reference

```bash
# Generate coverage locally
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html

# Upload test results (done by GitHub Actions)
codecov

# Check coverage threshold
npm test -- --coverage

# Push to trigger workflow
git push origin main
```

## Resources

- [Codecov Documentation](https://docs.codecov.io/)
- [Codecov GitHub Action](https://github.com/codecov/codecov-action)
- [Jest Coverage Documentation](https://jestjs.io/docs/coverage)
- [Testing Best Practices](https://jestjs.io/docs/tutorial-react)

## Verification Checklist

- [ ] Codecov account created
- [ ] Repository added to Codecov
- [ ] GitHub Actions workflow configured
- [ ] Private repo token added (if applicable)
- [ ] First push triggers workflow
- [ ] Coverage appears in Codecov dashboard
- [ ] PR comments show coverage changes
- [ ] Badge added to README (optional)
- [ ] Team members can view coverage reports

✅ Codecov is fully set up and ready to track coverage!
