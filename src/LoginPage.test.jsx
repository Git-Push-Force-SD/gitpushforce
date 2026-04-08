import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from './LoginPage'

describe('LoginPage Component', () => {
  const mockOnBack = jest.fn()

  beforeEach(() => {
    mockOnBack.mockClear()
  })

  test('renders without crashing', () => {
    render(<LoginPage onBack={mockOnBack} />)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
  })

  test('displays greeting and subtitle', () => {
    render(<LoginPage onBack={mockOnBack} />)
    expect(screen.getByText('Welcome back!')).toBeInTheDocument()
    expect(screen.getByText(/Sign in with your university email/i)).toBeInTheDocument()
  })

  test('displays Google sign in button', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const googleButton = screen.getByText('Sign in with Google')
    expect(googleButton).toBeInTheDocument()
    expect(googleButton).toHaveClass('google-btn')
  })

  test('displays back button when onBack prop is provided', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const backButtons = screen.getAllByTitle('Go back')
    expect(backButtons.length).toBeGreaterThan(0)
  })

  test('back button calls onBack when clicked', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const backButton = screen.getAllByTitle('Go back')[0] // Click the first one
    fireEvent.click(backButton)
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  test('displays language selector', () => {
    render(<LoginPage onBack={mockOnBack} />)
    expect(screen.getByText('EN')).toBeInTheDocument()
  })

  test('displays floating shapes', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const shapes = document.querySelectorAll('.shape')
    expect(shapes.length).toBe(6)
  })

  test('displays background image on right side', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const rightSide = document.querySelector('.login-right')
    expect(rightSide).toBeInTheDocument()
    const bgImage = rightSide.querySelector('.right-bg-image')
    expect(bgImage).toBeInTheDocument()
  })

  test('displays typing text animation', () => {
    render(<LoginPage onBack={mockOnBack} />)
    expect(screen.getByText('your campus. your marketplace.')).toBeInTheDocument()
  })

  test('Google button contains SVG icon', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const googleButton = screen.getByText('Sign in with Google')
    const svgIcon = googleButton.querySelector('svg')
    expect(svgIcon).toBeInTheDocument()
    expect(svgIcon).toHaveClass('google-icon')
  })

  test('has proper accessibility attributes', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const backButtons = screen.getAllByTitle('Go back')
    backButtons.forEach(button => {
      expect(button).toHaveAttribute('title', 'Go back')
    })
  })

  test('renders login card structure', () => {
    render(<LoginPage onBack={mockOnBack} />)
    expect(document.querySelector('.login-card')).toBeInTheDocument()
    expect(document.querySelector('.login-left')).toBeInTheDocument()
    expect(document.querySelector('.login-right')).toBeInTheDocument()
  })

  test('form container has proper structure', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const formContainer = document.querySelector('.login-form-container')
    expect(formContainer).toBeInTheDocument()
    expect(formContainer).toContainElement(screen.getByText('Welcome back!'))
  })

  test('does not render back button when onBack is not provided', () => {
    render(<LoginPage />)
    expect(screen.queryByTitle('Go back')).not.toBeInTheDocument()
  })

  test('back button is clickable and functional', () => {
    render(<LoginPage onBack={mockOnBack} />)
    const backButtons = screen.getAllByTitle('Go back')
    expect(backButtons[0]).toBeEnabled()
    fireEvent.click(backButtons[0])
    expect(mockOnBack).toHaveBeenCalled()
  })
})