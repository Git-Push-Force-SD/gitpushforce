# Campus Marketplace

A modern, responsive web app for a Campus Marketplace. Built with React, Tailwind CSS, and Vite.

## Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI**: Green primary color with green-to-black gradient accents
- **Interactive Components**: Navigation, hero section, features showcase, pricing info, and more
- **Fast Performance**: Built with Vite for lightning-fast development and production builds

[![codecov](https://codecov.io/gh/Git-Push-Force-SD/gitpushforce/graph/badge.svg?token=KZ7ZV3URUU)](https://codecov.io/gh/Git-Push-Force-SD/gitpushforce)

## Tech Stack

- **React 18**: Modern JavaScript library for UI
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Next-generation frontend build tool
- **Lucide Icons**: Beautiful icon library

## Project Structure Example

```
├── index.html          # Main HTML entry point
├── src/
│   ├── main.jsx       # React entry point
│   ├── App.jsx        # Main landing page component
│   └── index.css      # Tailwind directives and custom styles
├── tailwind.config.js # Tailwind configuration with custom colors
├── vite.config.js     # Vite configuration
├── postcss.config.js  # PostCSS configuration
└── package.json       # Project dependencies
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will open automatically at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## Testing

This project uses Jest for unit testing and Codecov for coverage tracking.

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

Generate a coverage report with detailed metrics:
```bash
npm run test:coverage
```

This generates a coverage report in the `coverage/` directory and displays a summary in the terminal.

### View Coverage Report

After running `npm run test:coverage`, view the detailed HTML report:

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

### Coverage Requirements

The project enforces minimum coverage thresholds:
- **Lines**: 50%
- **Statements**: 50%
- **Functions**: 50%
- **Branches**: 50%

Tests will fail if coverage drops below these thresholds.

### Writing Tests

- Place test files in the same directory as components with `.test.jsx` extension
- Example: `App.jsx` → `App.test.jsx`
- Follow the pattern: Arrange → Act → Assert

### Codecov Integration

Coverage reports are automatically uploaded to Codecov on every push to `main`:
- Codecov comments on pull requests with coverage analysis
- Coverage badges and reports available in the Codecov dashboard

For detailed testing and coverage setup instructions, see [TESTING_AND_COVERAGE.md](./TESTING_AND_COVERAGE.md).

## Customization

### Colors
Edit `tailwind.config.js` to customize colors:
- Primary color (green): `primary-500`, `primary-600`, `primary-700`
- Gradient colors (green to dark): `gradient-from`, `gradient-to`

### Content
Edit `src/App.jsx` to modify:
- Navigation links
- Hero section content
- Feature descriptions
- Call-to-action sections
- Footer information

## Campus Marketplace Features Implemented

- ✅ Item listing and browsing system
- ✅ Secure trade facility management interface
- ✅ In-app messaging system UI
- ✅ Online payment integration concepts
- ✅ Rating and trust system showcase
- ✅ Analytics dashboard references
- ✅ User verification information

## Contributing

We welcome contributions from all team members! Please follow these guidelines to ensure smooth collaboration.

### Getting Started with Contributions

1. **Clone the repository** (if you haven't already):
```bash
git clone <repository-url>
cd gitpushforce
```

2. **Create a feature branch**:
```bash
git checkout -b feature/your-feature-name
```

or for bug fixes:
```bash
git checkout -b fix/bug-description
```

### Branch Naming Convention

Use descriptive branch names following this pattern:
- `feature/feature-name` - New features or enhancements
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation updates
- `style/code-style-improvements` - Code formatting or style changes
- `refactor/component-refactoring` - Code refactoring
- `test/test-additions` - Adding or updating tests

**Examples:**
- `feature/add-search-functionality`
- `fix/navigation-menu-mobile`
- `docs/update-contribution-guide`
- `refactor/optimize-app-component`

### Making Changes

1. **Create your feature branch** (see above)
2. **Make your changes** in your local environment
3. **Test your changes**:
```bash
npm run dev
npm run build
```
4. **Stage and commit** your changes (see Commit Guidelines below)
5. **Push to your branch**:
```bash
git push origin feature/your-feature-name
```
6. **Create a Pull Request** on GitHub with a clear description

### Commit Message Guidelines

Write clear, meaningful commit messages that explain **what** you changed and **why**.

#### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Commit Types

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, missing semicolons, etc.)
- `refactor:` Code refactoring without changing functionality
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Build process, dependency updates, etc.

#### Commit Examples

**Good Commit Messages:**
```
feat(hero-section): add dynamic hero background animation

- Implemented smooth fade-in animation for hero section
- Added gradient color transition effect
- Improves user engagement on page load
```

```
fix(navbar): correct mobile menu button alignment

Fixed: Mobile menu button was misaligned on screens < 768px
Resolution: Adjusted flex properties in navbar styling
```

```
docs: update contribution guidelines in README
```

```
refactor(components): extract feature card into separate component

- Moved feature card logic to separate reusable component
- Reduces code duplication in features section
- Improves maintainability
```

**Bad Commit Messages (avoid):**
- `update` - Too vague
- `fix bug` - Not descriptive
- `changes` - Doesn't explain what changed
- `work in progress` - Too informal

#### Commit Best Practices

1. **One logical change per commit** - Don't mix multiple features/fixes
2. **Commit frequently** - Small, focused commits are better than large ones
3. **Write in present tense** - "Add feature" not "Added feature"
4. **Be specific** - Reference component names, file names, or areas affected
5. **Explain the why** - Not just what, but why the change was necessary

### Pull Request Process

1. **Push your branch** to GitHub
2. **Create a Pull Request** with:
   - Clear title describing the change
   - Description of what was changed and why
   - Reference to any related issues (e.g., "Fixes #123")
   - Screenshots if UI changes were made
3. **Request review** from team members
4. **Address feedback** from code reviews
5. **Merge** once approved

#### Pull Request Template

```markdown
## Description
Brief description of what this PR does

## Related Issues
Fixes #(issue number)

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Refactoring

## Changes Made
- Change 1
- Change 2
- Change 3

## How to Test
Steps to test the changes:
1. Step 1
2. Step 2

## Screenshots (if applicable)
Add screenshots or GIFs here

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed my code
- [ ] Tested changes locally
- [ ] No new warnings generated
```

### Code Style Guidelines

- **Indentation**: 2 spaces
- **Semicolons**: Use semicolons
- **Quotes**: Use single quotes for strings (`'hello'`)
- **Arrow functions**: Prefer arrow functions
- **Component naming**: PascalCase for components
- **Variable naming**: camelCase for variables and functions
- **CSS classes**: Use Tailwind utility classes, avoid custom CSS when possible

### Viewing Commit History

To see meaningful commits in the project:

```bash
# View commit history
git log

# View commit history with graph (more visual)
git log --oneline --graph --all

# View commits from last N days
git log --since="2 weeks ago"

# View commits by author
git log --author="name"

# View commits that changed a specific file
git log src/App.jsx

# View commit with detailed changes
git show <commit-hash>

# View commits in a specific branch
git log origin/main
```

### Common Workflow Example

```bash
# 1. Update main branch
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/add-filter-functionality

# 3. Make changes and commit
# (edit files)
git add .
git commit -m "feat(listing): add category filter to item browsing

- Added filter dropdown to features section
- Filters items by category (electronics, books, furniture, etc.)
- Persists filter selection in localStorage
- Improves user experience for browsing"

# 4. Push to GitHub
git push origin feature/add-filter-functionality

# 5. Create Pull Request on GitHub
# 6. Wait for approval
# 7. Merge and delete branch
git checkout main
git pull origin main
git branch -d feature/add-filter-functionality
```
