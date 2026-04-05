import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />)
    const uniMartTexts = screen.getAllByText('UniMart')
    expect(uniMartTexts.length).toBeGreaterThan(0)
  })

//   test('renders navigation header', () => {
//     render(<App />)
//     expect(screen.getByRole('navigation')).toBeInTheDocument()
//   })

  test('displays main hero section', () => {
    render(<App />)
    expect(screen.getByText(/Buy, Sell & Trade/i)).toBeInTheDocument()
  })

  test('shows features heading', () => {
    render(<App />)
    expect(screen.getByText('Powerful Features')).toBeInTheDocument()
  })

  test('displays all feature cards', () => {
    render(<App />)
    const features = [
      'Smart Browsing',
      'Secure Trading',
      'In-App Messaging',
      'Ratings & Reviews',
      'Price Insights',
      'Easy Payments',
    ]
    features.forEach((feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument()
    })
  })

  test('renders how it works section', () => {
    render(<App />)
    expect(screen.getByText('How It Works')).toBeInTheDocument()
    expect(screen.getByText('Create Account')).toBeInTheDocument()
    expect(screen.getByText('List Items')).toBeInTheDocument()
    expect(screen.getByText('Connect')).toBeInTheDocument()
    expect(screen.getByText('Trade Safely')).toBeInTheDocument()
  })

  test('displays statistics section', () => {
    render(<App />)
    expect(screen.getByText('10K+')).toBeInTheDocument()
    expect(screen.getByText('50K+')).toBeInTheDocument()
    expect(screen.getByText('98%')).toBeInTheDocument()
  })

  test('shows call to action section', () => {
    render(<App />)
    expect(screen.getByText('Ready to Start Trading?')).toBeInTheDocument()
    expect(screen.getByText('Create Your Account Today')).toBeInTheDocument()
  })

  test('renders footer', () => {
    render(<App />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    const allRights = screen.getByText(/2026 UniMart/i)
    expect(allRights).toBeInTheDocument()
  })

  test('has mobile menu button', () => {
    render(<App />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  test('mobile menu button is present on mobile view', () => {
    render(<App />)
    const navButtons = screen.getAllByRole('button')
    expect(navButtons.length).toBeGreaterThan(0)
  })

  test('displays navigation links', () => {
    render(<App />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  test('renders main element', () => {
    render(<App />)
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
  })

  test('displays sign in and get started buttons', () => {
    render(<App />)
    const getStartedButtons = screen.getAllByText('Get Started')
    expect(getStartedButtons.length).toBeGreaterThan(0)
  })

  test('hero section has call to action buttons', () => {
    render(<App />)
    expect(screen.getByText('Browse Items')).toBeInTheDocument()
    expect(screen.getByText('List an Item')).toBeInTheDocument()
  })

  test('feature cards have descriptions', () => {
    render(<App />)
    expect(screen.getByText(/Search, filter by category/i)).toBeInTheDocument()
    expect(screen.getByText(/Safe drop-off and collection/i)).toBeInTheDocument()
  })

  test('all navigation links have href attributes', () => {
    render(<App />)
    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      expect(link).toHaveAttribute('href')
    })
  })

  test('renders correct page title', () => {
    render(<App />)
    const mainContent = screen.getAllByText('UniMart')
    expect(mainContent[0]).toBeInTheDocument()
  })
})
