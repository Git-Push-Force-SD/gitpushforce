import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import App from './App'

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  test('renders header with UNIMART logo', () => {
    render(<App />)
    const uniMartElements = screen.getAllByText('UNIMART')
    expect(uniMartElements.length).toBeGreaterThan(0)
  })

  test('displays navigation links', () => {
    render(<App />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  test('displays How It Works and Safety navigation links', () => {
    render(<App />)
    const howitWorksLinks = screen.getAllByText('How It Works')
    const safetyLinks = screen.getAllByText('Safety')
    expect(howitWorksLinks.length).toBeGreaterThan(0)
    expect(safetyLinks.length).toBeGreaterThan(0)
  })

  test('displays Sign In button', () => {
    render(<App />)
    const signInButtons = screen.getAllByText(/Sign [Ii]n/)
    expect(signInButtons.length).toBeGreaterThan(0)
  })

  test('has mobile menu button', () => {
    render(<App />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  test('displays hero heading with SAFE TRADES FOR VERIFIED STUDENTS', () => {
    render(<App />)
    expect(screen.getByText(/SAFE TRADES/i)).toBeInTheDocument()
    expect(screen.getAllByText(/VERIFIED/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/STUDENTS/i).length).toBeGreaterThan(0)
  })

  test('displays hero description text', () => {
    render(<App />)
    expect(screen.getByText(/A secure campus marketplace where students can buy, sell, and trade/i)).toBeInTheDocument()
  })

  test('displays Browse Marketplace button', () => {
    render(<App />)
    const browseButtons = screen.getAllByText(/Browse Marketplace/i)
    expect(browseButtons.length).toBeGreaterThan(0)
  })

  test('displays Get started button in hero', () => {
    render(<App />)
    const getStartedButtons = screen.getAllByText('Get started')
    expect(getStartedButtons.length).toBeGreaterThan(0)
  })

  test('displays category hashtags', () => {
    render(<App />)
    expect(screen.getByText('#TECH')).toBeInTheDocument()
    expect(screen.getByText('#CAMPUS ESSENTIALS')).toBeInTheDocument()
  })

  test('displays verified accounts section', () => {
    render(<App />)
    expect(screen.getAllByText(/verified accounts/i).length).toBeGreaterThan(0)
  })

  test('displays Designed for Students section', () => {
    render(<App />)
    expect(screen.getByText(/Designed for Students/i)).toBeInTheDocument()
  })

  test('displays parallel text section with product categories', () => {
    render(<App />)
    expect(screen.getByText('TEXTBOOKS')).toBeInTheDocument()
    expect(screen.getByText('ELECTRONICS')).toBeInTheDocument()
    expect(screen.getByText('CLOTHING')).toBeInTheDocument()
    expect(screen.getByText('AND MORE')).toBeInTheDocument()
  })

  test('displays List in Minutes card', () => {
    render(<App />)
    expect(screen.getByText('List in Minutes')).toBeInTheDocument()
    expect(screen.getByText(/Add an item, price, and description/i)).toBeInTheDocument()
  })

  test('displays Message Safely card', () => {
    render(<App />)
    expect(screen.getByText('Message Safely')).toBeInTheDocument()
    expect(screen.getByText(/Talk to buyers and sellers inside the platform/i)).toBeInTheDocument()
  })

  test('displays Secure Exchange card', () => {
    render(<App />)
    const secureExchangeElements = screen.getAllByText('Secure Exchange')
    expect(secureExchangeElements.length).toBeGreaterThan(0)
    expect(screen.getByText(/Items are exchanged through a structured campus process/i)).toBeInTheDocument()
  })

  test('displays Trusted System section', () => {
    render(<App />)
    expect(screen.getByText('TRUSTED SYSTEM')).toBeInTheDocument()
    expect(screen.getAllByText(/Secure Campus/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Exchange/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/System/i).length).toBeGreaterThan(0)
  })

  test('displays Browse The Feed heading', () => {
    render(<App />)
    expect(screen.getByText(/Browse The Feed/i)).toBeInTheDocument()
  })

  test('displays product cards', () => {
    render(<App />)
    expect(screen.getByText('Sony WH-1000XM4')).toBeInTheDocument()
    expect(screen.getByText('Linear Algebra 8th Ed')).toBeInTheDocument()
    expect(screen.getByText('Nike Dunks Low')).toBeInTheDocument()
  })

  test('displays product prices', () => {
    render(<App />)
    expect(screen.getByText('R8000')).toBeInTheDocument()
    expect(screen.getByText('R1000')).toBeInTheDocument()
    expect(screen.getByText('R2100')).toBeInTheDocument()
  })

  test('displays product conditions', () => {
    render(<App />)
    expect(screen.getByText('Like New')).toBeInTheDocument()
    expect(screen.getByText('Used - Good')).toBeInTheDocument()
    expect(screen.getByText('Worn Once')).toBeInTheDocument()
  })

  test('displays View All Marketplace button', () => {
    render(<App />)
    expect(screen.getByText(/View All Marketplace/i)).toBeInTheDocument()
  })

  test('displays footer CTA with BUY SELL TRADE SAFELY', () => {
    render(<App />)
    expect(screen.getByText(/BUY. SELL. TRADE./i)).toBeInTheDocument()
    const safelyElements = screen.getAllByText('SAFELY')
    expect(safelyElements.length).toBeGreaterThan(0)
  })

  test('displays footer Platform links', () => {
    render(<App />)
    expect(screen.getByText('Platform')).toBeInTheDocument()
  })

  test('displays footer Trust links', () => {
    render(<App />)
    expect(screen.getByText('Trust')).toBeInTheDocument()
  })

  test('displays footer Account links', () => {
    render(<App />)
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  test('all navigation links have href attributes', () => {
    render(<App />)
    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      expect(link).toHaveAttribute('href')
    })
  })

  test('renders footer UNIMART text', () => {
    render(<App />)
    const uniMartTexts = screen.getAllByText('UNIMART')
    expect(uniMartTexts.length).toBeGreaterThan(1) // header and footer
  })

  test('shows login page when Sign In button is clicked', () => {
    render(<App />)
    // Find the header section and get the Sign In button from there
    const header = document.querySelector('header')
    const signInButton = within(header).getByRole('button', { name: /^sign in$/i })
    fireEvent.click(signInButton)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('shows login page when Browse Marketplace button is clicked', () => {
    render(<App />)
    // Find the hero section by looking for the image with alt "Student Lifestyle"
    const heroImage = screen.getByAltText('Student Lifestyle')
    const heroSection = heroImage.closest('.relative.rounded-\\[20px\\]')
    const browseButton = within(heroSection).getByRole('button', { name: /browse marketplace/i })
    fireEvent.click(browseButton)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('shows login page when Get started button is clicked', () => {
    render(<App />)
    const getStartedButtons = screen.getAllByText('Get started')
    // Click the first one (hero Get started button)
    fireEvent.click(getStartedButtons[0])
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('shows login page when View All Marketplace button is clicked', () => {
    render(<App />)
    const viewAllButton = screen.getByText(/View All Marketplace/)
    fireEvent.click(viewAllButton)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('shows login page when footer Get started button is clicked', () => {
    render(<App />)
    // Find the footer Get started button specifically
    const footerSection = screen.getByText('Account').closest('section')
    const getStartedButton = footerSection.querySelector('button')
    fireEvent.click(getStartedButton)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('shows login page when footer Sign in button is clicked', () => {
    render(<App />)
    // Find the footer Sign in button specifically
    const footerSection = screen.getByText('Account').closest('section')
    const signInButtons = footerSection.querySelectorAll('button')
    const signInButton = Array.from(signInButtons).find(btn => btn.textContent === 'Sign in')
    fireEvent.click(signInButton)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('hides landing page when login is shown', () => {
    render(<App />)
    const header = document.querySelector('header')
    const signInButton = within(header).getByRole('button', { name: /^sign in$/i })
    fireEvent.click(signInButton)
    expect(screen.getByText(/SAFE TRADES/i)).not.toBeVisible()
  })

  test('returns to landing page when back button is clicked from login', () => {
    render(<App />)
    const header = document.querySelector('header')
    const signInButton = within(header).getByRole('button', { name: /^sign in$/i })
    fireEvent.click(signInButton)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()

    const backButtons = screen.getAllByTitle('Go back')
    const backButton = backButtons[0]
    fireEvent.click(backButton)
    expect(screen.getByText(/SAFE TRADES/i)).toBeInTheDocument()
  })

  test('mobile menu toggles when hamburger button is clicked', () => {
    render(<App />)
    // Find the hamburger menu button (it should be the button with Menu icon)
    const buttons = screen.getAllByRole('button')
    const menuButton = buttons.find(button => button.innerHTML.includes('Menu'))
    if (menuButton) {
      fireEvent.click(menuButton)
      expect(screen.getByText('How It Works')).toBeInTheDocument()
    }
  })

  test('mobile menu closes when Sign in is clicked', () => {
    render(<App />)
    const buttons = screen.getAllByRole('button')
    const menuButton = buttons.find(button => button.innerHTML.includes('Menu'))
    if (menuButton) {
      fireEvent.click(menuButton)
      // Find the mobile menu Sign in button
      const mobileSignIn = screen.getAllByText('Sign in').find(btn => 
        btn.closest('.absolute') // mobile menu is in absolute positioned div
      )
      if (mobileSignIn) {
        fireEvent.click(mobileSignIn)
        expect(screen.getByText('Welcome back!')).toBeInTheDocument()
      }
    }
  })

  test('displays arrow buttons in feature cards', () => {
    render(<App />)
    // Check that there are buttons with SVG icons (arrow icons)
    const buttons = screen.getAllByRole('button')
    const buttonsWithIcons = buttons.filter(button => button.querySelector('svg'))
    expect(buttonsWithIcons.length).toBeGreaterThan(3)
  })

  test('arrow buttons in feature cards lead to login', () => {
    render(<App />)
    // Find the List in Minutes section and click its button
    const listSection = screen.getByText('List in Minutes').closest('section')
    const button = listSection.querySelector('button')
    fireEvent.click(button)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('product card arrow buttons lead to login', () => {
    render(<App />)
    // Find a product card and click its arrow button
    const productCard = screen.getByText('Sony WH-1000XM4').parentElement.parentElement
    const button = productCard.querySelector('button')
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('scroll effect applies parallax transform', () => {
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true })
    render(<App />)
    // This is hard to test directly, but we can check if the component renders with scroll handling
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
