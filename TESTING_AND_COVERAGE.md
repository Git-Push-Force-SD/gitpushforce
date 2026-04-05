# Testing and Coverage Guide

This project uses Jest for unit testing and Codecov for coverage tracking and reporting.

## Table of Contents

- [Local Testing](#local-testing)
- [Coverage Reports](#coverage-reports)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)

## Local Testing

### Running Tests

Run all tests once:

```bash
npm test
```

### Watch Mode

Run tests in watch mode (re-run on file changes):

```bash
npm run test:watch
```

### Coverage Report

Generate a coverage report:

```bash
npm run test:coverage
```

This will:
1. Run all tests
2. Generate coverage statistics
3. Create a coverage report in `coverage/` directory
4. Display summary in terminal

### View Coverage Report in Browser

After running `npm run test:coverage`:

```bash
# Open coverage report in browser (macOS)
open coverage/lcov-report/index.html

# Open coverage report in browser (Windows)
start coverage/lcov-report/index.html

# Open coverage report in browser (Linux)
xdg-open coverage/lcov-report/index.html
```

## Coverage Reports

### Understanding Coverage Metrics

- **Lines**: Percentage of code lines executed
- **Statements**: Percentage of statements executed
- **Functions**: Percentage of functions executed
- **Branches**: Percentage of conditional branches executed

### Current Coverage Thresholds

The project enforces minimum coverage requirements:

```
Branches:  50%
Functions: 50%
Lines:     50%
Statements: 50%
```

Tests will fail if coverage drops below these thresholds.

### Viewing Local Coverage

The coverage report includes:
- Overall coverage percentage
- Uncovered lines highlighted in the HTML report
- Branch coverage details
- Function coverage breakdown

Navigate to `coverage/lcov-report/index.html` for detailed visualization.

**Note**: For public repositories, Codecov works automatically with GitHub Actions.

### How It Works

The GitHub Action automatically:

1. **Runs tests** with coverage (`npm run test:coverage`)
2. **Generates coverage report** (coverage/coverage-final.json)
3. **Uploads to Codecov** via codecov/codecov-action
4. **Updates pull requests** with coverage info
5. **Tracks coverage over time** in Codecov dashboard

### Codecov Features

After setup, you can:

- **View coverage trends**: See how coverage changes over time
- **PR coverage reports**: Codecov comments on PRs with coverage changes
- **Branch comparisons**: Compare coverage between branches
- **Merge coverage reports**: Automatic reports for merged PRs
- **Badges**: Display coverage badge in README

## Writing Tests

### Test File Naming

Place test files in:
- Same directory as source file with `.test.jsx` or `.spec.jsx` extension
- Example: `src/App.jsx` → `src/App.test.jsx`

### Test Structure

```javascript
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText('UniMart')).toBeInTheDocument()
  })

  test('displays features section', () => {
    render(<App />)
    expect(screen.getByText('Powerful Features')).toBeInTheDocument()
  })
})
```

### Best Practices

1. **One describe block per component**
2. **Clear test descriptions** that explain what is tested
3. **Arrange-Act-Assert pattern**:
   ```javascript
   test('user can submit form', () => {
     // Arrange
     render(<Form />)
     
     // Act
     const input = screen.getByLabelText('Name')
     fireEvent.change(input, { target: { value: 'John' } })
     
     // Assert
     expect(input.value).toBe('John')
   })
   ```

4. **Use semantic queries**: `getByRole`, `getByLabelText`, `getByText`, etc.
5. **Avoid testing implementation details**: Test user behavior, not state

### Common Testing Library APIs

```javascript
// Querying
screen.getByText('text')
screen.getByRole('button')
screen.getByLabelText('label')
screen.queryByText('text') // null if not found
screen.findByText('text') // async, waits for element

// Interactions
fireEvent.click(element)
fireEvent.change(input, { target: { value: 'new value' } })
userEvent.type(input, 'hello')

// Assertions
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toHaveClass('active')
expect(element).toHaveAttribute('href', '/home')
```

## CI/CD Integration

### GitHub Actions Workflow

The `.github/workflows/main_unimart.yml` file:

1. **Triggers on**: push to `main` branch
2. **Runs on**: Ubuntu latest
3. **Steps**:
   - Checkout code
   - Setup Node.js v22
   - Install dependencies
   - Build project
   - Run tests with coverage
   - Upload coverage to Codecov
   - Deploy to Azure

### Automatic PR Checks

When you push to a branch:

1. GitHub Actions runs tests automatically
2. Coverage report generates
3. Codecov analyzes coverage
4. Codecov comments on PR with:
   - Coverage percentage change
   - New uncovered lines
   - Impact summary

### Handling Coverage Failures

If coverage drops below thresholds:

```
✗ Coverage thresholds not met:
  Lines:    45% < 50%
  Functions: 48% < 50%
```

**To fix**:
1. Write tests for uncovered code
2. Run `npm run test:coverage` locally
3. Check `coverage/lcov-report/index.html` for uncovered lines
4. Add tests for highlighted areas
5. Verify coverage with `npm test`

## Troubleshooting

### Jest not finding tests

Ensure test files match:
- `src/**/*.test.jsx`
- `src/**/*.spec.jsx`

### Coverage not generating

```bash
# Clear jest cache
npx jest --clearCache

# Run coverage again
npm run test:coverage
```

### Codecov not receiving coverage

1. Check GitHub Actions logs for errors
2. Ensure `coverage-final.json` exists locally
3. Check Codecov server status

### Tests failing with module errors

```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Clear jest cache
npx jest --clearCache

# Run tests
npm test
```

## Example: Testing a Component

```javascript
// App.test.jsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('App Component', () => {
  test('renders main navigation', () => {
    render(<App />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  test('displays hero section with proper heading', () => {
    render(<App />)
    expect(screen.getByText(/Buy, Sell & Trade/i)).toBeInTheDocument()
  })

  test('shows all feature cards', () => {
    render(<App />)
    const features = [
      'Smart Browsing',
      'Secure Trading',
      'In-App Messaging',
    ]
    features.forEach((feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument()
    })
  })

  test('renders footer', () => {
    render(<App />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Codecov Documentation](https://docs.codecov.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Quick Reference

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Open coverage in browser (after generating)
open coverage/lcov-report/index.html
```
