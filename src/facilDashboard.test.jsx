import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import FacilDashboard from './facilDashboard'

describe('FacilDashboard Component', () => {

  test('renders without crashing', () => {
    render(<FacilDashboard />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  test('renders dashboard title', () => {
    render(<FacilDashboard />)
    expect(screen.getByText(/Trade Facilitator/i)).toBeInTheDocument()
  })

  test('displays sidebar navigation', () => {
    render(<FacilDashboard />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Trade Queue')).toBeInTheDocument()
    expect(screen.getByText('Safe Zones')).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getByText('Verification')).toBeInTheDocument()
    expect(screen.getByText('Disputes')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
  })

  test('displays trust score section', () => {
    render(<FacilDashboard />)
    expect(screen.getByText(/Trust score/i)).toBeInTheDocument()
    expect(screen.getByText('94%')).toBeInTheDocument()
  })

  test('displays hero heading', () => {
    render(<FacilDashboard />)
    expect(
      screen.getByText(/Keep every campus trade secure/i)
    ).toBeInTheDocument()
  })

  test('displays hero buttons', () => {
    render(<FacilDashboard />)
    expect(screen.getByText(/Open live queue/i)).toBeInTheDocument()
    expect(screen.getByText(/Assign facilitator/i)).toBeInTheDocument()
  })

  test('displays stats cards', () => {
    render(<FacilDashboard />)
    expect(screen.getByText('Pending handovers')).toBeInTheDocument()
    expect(screen.getByText('Verified traders')).toBeInTheDocument()
    expect(screen.getByText('Secure zones live')).toBeInTheDocument()
    expect(screen.getByText('Resolved disputes')).toBeInTheDocument()

    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('1,284')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

 test('displays trade queue section', () => {
  render(<FacilDashboard />)
  expect(screen.getAllByText(/Trade Queue/i).length).toBeGreaterThan(0)
  expect(screen.getByText(/Today’s facilitated exchanges/i)).toBeInTheDocument()
})

  test('displays trade items', () => {
    render(<FacilDashboard />)
    expect(screen.getByText('MacBook Air M2')).toBeInTheDocument()
    expect(screen.getByText('Calculus Textbook')).toBeInTheDocument()
    expect(screen.getByText('Nike Dunks Low')).toBeInTheDocument()
  })

  test('filters trades using search', () => {
    render(<FacilDashboard />)

    const input = screen.getByPlaceholderText(/Search trade, item, buyer/i)
    fireEvent.change(input, { target: { value: 'MacBook' } })

    expect(screen.getByText('MacBook Air M2')).toBeInTheDocument()
    expect(screen.queryByText('Calculus Textbook')).not.toBeInTheDocument()
  })

  test('filters trades by buyer name', () => {
    render(<FacilDashboard />)

    const input = screen.getByPlaceholderText(/Search trade, item, buyer/i)
    fireEvent.change(input, { target: { value: 'Neo' } })

    expect(screen.getByText('Calculus Textbook')).toBeInTheDocument()
    expect(screen.queryByText('MacBook Air M2')).not.toBeInTheDocument()
  })

  test('filters trades by status', () => {
    render(<FacilDashboard />)

    const select = screen.getByDisplayValue('All')
    fireEvent.change(select, { target: { value: 'Scheduled' } })

    expect(screen.getByText('Desk Lamp')).toBeInTheDocument()
  })

 test('shows no matching trade items when search has no results', () => {
  render(<FacilDashboard />)

  const input = screen.getByPlaceholderText(/Search trade, item, buyer/i)
  fireEvent.change(input, { target: { value: 'xyz123' } })

  // Expect NO trades to be shown
  expect(screen.queryByText('MacBook Air M2')).not.toBeInTheDocument()
  expect(screen.queryByText('Calculus Textbook')).not.toBeInTheDocument()
  expect(screen.queryByText('Nike Dunks Low')).not.toBeInTheDocument()
})

  test('displays safe zones section', () => {
    render(<FacilDashboard />)
    expect(screen.getByText(/Safe exchange points/i)).toBeInTheDocument()
  })

  test('displays communication feed', () => {
    render(<FacilDashboard />)
    expect(screen.getByText(/Live coordination feed/i)).toBeInTheDocument()
    expect(screen.getByText('Trust & Safety Bot')).toBeInTheDocument()
  })

  test('displays incident monitor', () => {
    render(<FacilDashboard />)
    expect(screen.getByText(/Incident monitor/i)).toBeInTheDocument()
    expect(screen.getByText('Condition mismatch flagged')).toBeInTheDocument()
  })

  test('displays incident action buttons', () => {
    render(<FacilDashboard />)
    const reviewButtons = screen.getAllByText(/Review case/i)
    expect(reviewButtons.length).toBeGreaterThan(0)
  })

  test('displays checklist section', () => {
    render(<FacilDashboard />)
    expect(screen.getByText(/Facilitator checklist/i)).toBeInTheDocument()
  })

  test('displays checklist items', () => {
    render(<FacilDashboard />)
    expect(
      screen.getByText(/Confirm both student IDs match verified accounts/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Inspect item condition against listing photos/i)
    ).toBeInTheDocument()
  })

})