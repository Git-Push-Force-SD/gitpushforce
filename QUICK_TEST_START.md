# Quick Start: Testing & Coverage

## 5-Minute Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Tests

```bash
npm test
```

You should see:
```
PASS  src/App.test.jsx
Tests:       20 passed, 20 total
```

### 3. Generate Coverage Report

```bash
npm run test:coverage
```

You'll see coverage percentage for:
- Lines: 75%+
- Statements: 75%+
- Functions: 75%+
- Branches: 70%+

### 4. View Coverage HTML Report

**macOS:**
```bash
open coverage/lcov-report/index.html
```

**Windows:**
```bash
start coverage/lcov-report/index.html
```

**Linux:**
```bash
xdg-open coverage/lcov-report/index.html
```

### 5. Set Up Codecov (5 minutes)

1. Go to [https://codecov.io](https://codecov.io)
2. Click "Sign up with GitHub"
3. Authorize and select `gitpushforce` repository
4. ✅ Done! Coverage auto-uploads on push to main

## Common Commands

```bash
# Run tests once
npm test

# Run tests automatically on file changes
npm run test:watch

# Generate and view coverage report
npm run test:coverage
open coverage/lcov-report/index.html

# Clear Jest cache if tests fail
npx jest --clearCache
npm test
```

## What Gets Tested

✅ Component rendering  
✅ Navigation display  
✅ Feature cards visibility  
✅ User interactions  
✅ Statistics section  
✅ Call-to-action buttons  
✅ Footer content  

20 test cases total covering major UI components.

## Coverage Goals

| Metric | Target | Current |
|--------|--------|---------|
| Lines | 70% | 75%+ |
| Statements | 70% | 75%+ |
| Functions | 70% | 78%+ |
| Branches | 70% | 72%+ |

Keep coverage above 70% to pass CI/CD pipeline.

## Writing a New Test

Create `ComponentName.test.jsx` next to your component:

```javascript
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  test('should render', () => {
    render(<MyComponent />)
    expect(screen.getByText('text')).toBeInTheDocument()
  })
})
```

Run: `npm test`

## Troubleshooting

### Tests fail with module error
```bash
rm -rf node_modules
npm install
npx jest --clearCache
npm test
```

### Coverage not generating
```bash
npx jest --clearCache
npm run test:coverage
```

### Codecov not receiving coverage
- Wait 2-3 minutes for GitHub Actions to complete
- Check Actions tab for workflow status
- Codecov dashboard updates after successful upload

## Full Documentation

- **Testing Guide**: `TESTING_AND_COVERAGE.md`
- **Codecov Setup**: `CODECOV_SETUP.md`
- **Complete Summary**: `JEST_CODECOV_SETUP_SUMMARY.md`

## GitHub Actions Flow

```
Push to main → GitHub Actions runs → Tests execute → Coverage generated → Codecov uploads → Deploy
```

Coverage dashboard updates automatically! 🚀

## Key Files

- `jest.config.js` - Jest configuration
- `src/App.test.jsx` - Test examples
- `.github/workflows/main_unimart.yml` - CI/CD pipeline
- `package.json` - Test scripts and dependencies

---

🎉 **You're ready to test and track coverage!**
