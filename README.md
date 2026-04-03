# Campus Marketplace

A modern, responsive landing page for the Campus Marketplace web application built with React, Tailwind CSS, and Vite.

## Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI**: Pink primary color with blue-to-gold gradient accents
- **Interactive Components**: Navigation, hero section, features showcase, pricing info, and more
- **Fast Performance**: Built with Vite for lightning-fast development and production builds

## Tech Stack

- **React 18**: Modern JavaScript library for UI
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Next-generation frontend build tool
- **Lucide Icons**: Beautiful icon library

## Project Structure

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

## License

This project is part of the Software Design 2026 course at University of Witwatersrand.
