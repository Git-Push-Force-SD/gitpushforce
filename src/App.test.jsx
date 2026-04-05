import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  test('renders header with UNIMART logo', () => {
    render(<App />)
    expect(screen.getByText('UNIMART')).toBeInTheDocument()
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
    expect(screen.getByText(/VERIFIED/i)).toBeInTheDocument()
    expect(screen.getByText(/STUDENTS/i)).toBeInTheDocument()
  })

  test('displays hero description text', () => {
    render(<App />)
    expect(screen.getByText(/A secure campus marketplace where students can buy, sell, and trade/i)).toBeInTheDocument()
  })

  test('displays Browse Marketplace button', () => {
    render(<App />)
    expect(screen.getByText(/Browse Marketplace/i)).toBeInTheDocument()
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
    expect(screen.getByText(/verified accounts/i)).toBeInTheDocument()
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
    expect(screen.getByText('Secure Exchange')).toBeInTheDocument()
    expect(screen.getByText(/Items are exchanged through a structured campus process/i)).toBeInTheDocument()
  })

  test('displays Trusted System section', () => {
    render(<App />)
    expect(screen.getByText('TRUSTED SYSTEM')).toBeInTheDocument()
    expect(screen.getByText(/Secure Campus/i)).toBeInTheDocument()
    expect(screen.getByText(/Exchange System/i)).toBeInTheDocument()
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
    expect(screen.getByText('SAFELY')).toBeInTheDocument()
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
})
