import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StarRating from './StarRating';

describe('StarRating', () => {
  describe('display mode (interactive=false)', () => {
    it('renders 5 star spans', () => {
      render(<StarRating rating={3} />);
      expect(screen.getAllByText(/[★☆⯨]/)).toHaveLength(5);
    });

    it('renders all full stars for rating 5', () => {
      render(<StarRating rating={5} />);
      expect(screen.getAllByText('★')).toHaveLength(5);
    });

    it('renders all empty stars for rating 0', () => {
      render(<StarRating rating={0} />);
      expect(screen.getAllByText('☆')).toHaveLength(5);
    });

    it('renders correct full and empty stars for whole number rating', () => {
      render(<StarRating rating={3} />);
      expect(screen.getAllByText('★')).toHaveLength(3);
      expect(screen.getAllByText('☆')).toHaveLength(2);
    });

    it('renders half star for x.5 rating', () => {
      render(<StarRating rating={3.5} />);
      expect(screen.getAllByText('★')).toHaveLength(3);
      expect(screen.getAllByText('⯨')).toHaveLength(1);
      expect(screen.getAllByText('☆')).toHaveLength(1);
    });

    it('renders half star for rating with decimal >= 0.5', () => {
      render(<StarRating rating={2.7} />);
      expect(screen.getAllByText('★')).toHaveLength(2);
      expect(screen.getAllByText('⯨')).toHaveLength(1);
      expect(screen.getAllByText('☆')).toHaveLength(2);
    });

    it('does not render half star for decimal < 0.5', () => {
      render(<StarRating rating={2.3} />);
      expect(screen.getAllByText('★')).toHaveLength(2);
      expect(screen.queryAllByText('⯨')).toHaveLength(0);
      expect(screen.getAllByText('☆')).toHaveLength(3);
    });

    it('applies amber colour to full stars', () => {
      render(<StarRating rating={2} />);
      const spans = screen.getAllByText('★');
      spans.forEach(s => expect(s.className).toContain('text-amber-400'));
    });

    it('applies amber colour to half star', () => {
      render(<StarRating rating={1.5} />);
      const half = screen.getByText('⯨');
      expect(half.className).toContain('text-amber-400');
    });

    it('applies gray colour to empty stars', () => {
      render(<StarRating rating={1} />);
      const empty = screen.getAllByText('☆');
      empty.forEach(s => expect(s.className).toContain('text-gray-300'));
    });

    it('does not render any buttons in display mode', () => {
      render(<StarRating rating={4} />);
      expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
  });

  describe('interactive mode', () => {
    it('renders 5 buttons', () => {
      render(<StarRating rating={0} interactive={true} onChange={jest.fn()} />);
      expect(screen.getAllByRole('button')).toHaveLength(5);
    });

    it('calls onChange with correct star value when clicked', () => {
      const onChange = jest.fn();
      render(<StarRating rating={0} interactive={true} onChange={onChange} />);
      fireEvent.click(screen.getByRole('button', { name: /Rate 3 stars/i }));
      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('highlights stars up to and including selected rating', () => {
      render(<StarRating rating={3} interactive={true} onChange={jest.fn()} />);
      expect(screen.getAllByText('★')).toHaveLength(3);
      expect(screen.getAllByText('☆')).toHaveLength(2);
    });

    it('does not throw when onChange is not provided', () => {
      render(<StarRating rating={2} interactive={true} />);
      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: /Rate 1 stars/i }))
      ).not.toThrow();
    });

    it('does not render half stars in interactive mode', () => {
      render(<StarRating rating={2.5} interactive={true} onChange={jest.fn()} />);
      expect(screen.queryAllByText('⯨')).toHaveLength(0);
    });
  });
});