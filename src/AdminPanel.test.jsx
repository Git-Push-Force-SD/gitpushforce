import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminPanel from './AdminPanel';
import * as supabaseModule from './utils/supabase';

// Mock Supabase
jest.mock('./utils/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabaseModule.supabase;

describe('AdminPanel Component', () => {
  const mockUser = {
    id: 'admin-123',
    email: '2624301@students.wits.ac.za',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    test('does not render if userRole is not admin', () => {
      const { container } = render(
        <AdminPanel user={mockUser} userRole="user" />
      );
      expect(container.firstChild).toBeNull();
    });

    test('does not render if userRole is staff', () => {
      const { container } = render(
        <AdminPanel user={mockUser} userRole="staff" />
      );
      expect(container.firstChild).toBeNull();
    });

    test('renders when userRole is admin', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      });
    });
  });

  describe('Loading Staff', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });
    });

    test('displays "No staff members yet" when staff list is empty', async () => {
      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(screen.getByText('No staff members yet')).toBeInTheDocument();
      });
    });

    test('loads staff from database on mount', async () => {
      const mockSelect = jest.fn();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect.mockReturnValue({
          order: mockOrder,
        }),
      });

      mockSupabase.from = mockFrom;

      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('trade_facility_staff');
        expect(mockSelect).toHaveBeenCalledWith('*');
        expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      });
    });

    test('displays staff members in table', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'staff-1',
                name: 'John Doe',
                email: 'john@students.wits.ac.za',
                created_at: '2026-04-11T00:00:00Z',
              },
              {
                id: 'staff-2',
                name: 'Jane Smith',
                email: 'jane@students.wits.ac.za',
                created_at: '2026-04-10T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      });

      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@students.wits.ac.za')).toBeInTheDocument();
      });
    });

    test('displays error message if staff loading fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load staff: Database error/)).toBeInTheDocument();
      });
    });
  });

  describe('Create Staff Account', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });
    });

    test('displays create staff form with name and email fields', async () => {
      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(screen.getByText(/Create Staff Account/)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Staff member name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('staff@students.wits.ac.za')).toBeInTheDocument();
      });
    });

    test('displays Create Account button', async () => {
      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
      });
    });

    test('shows validation error when form is empty', async () => {
      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /Create Account/i });
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Please fill in all fields/)).toBeInTheDocument();
      });
    });

    test('creates staff account with valid data', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: [{ id: 'new-staff-1' }],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
        insert: mockInsert,
      });

      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Staff member name');
        const emailInput = screen.getByPlaceholderText('staff@students.wits.ac.za');
        const createButton = screen.getByRole('button', { name: /Create Account/i });

        userEvent.type(nameInput, 'New Staff');
        userEvent.type(emailInput, 'newstaff@students.wits.ac.za');
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            created_by: 'admin-123',
            email: 'newstaff@students.wits.ac.za',
            name: 'New Staff',
            role: 'staff',
          }),
        ]);
      });
    });

    test('displays success message after creating staff account', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn()
            .mockResolvedValueOnce({
              data: [],
              error: null,
            })
            .mockResolvedValueOnce({
              data: [
                {
                  id: 'new-staff-1',
                  name: 'New Staff',
                  email: 'newstaff@students.wits.ac.za',
                  created_at: '2026-04-11T00:00:00Z',
                },
              ],
              error: null,
            }),
        }),
        insert: jest.fn().mockResolvedValue({
          data: [{ id: 'new-staff-1' }],
          error: null,
        }),
      });

      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Staff member name');
        const emailInput = screen.getByPlaceholderText('staff@students.wits.ac.za');
        const createButton = screen.getByRole('button', { name: /Create Account/i });

        userEvent.type(nameInput, 'New Staff');
        userEvent.type(emailInput, 'newstaff@students.wits.ac.za');
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Staff account created successfully/)).toBeInTheDocument();
      });
    });

    test('displays error message if staff creation fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Email already exists' },
        }),
      });

      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Staff member name');
        expect(nameInput).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText('Staff member name');
      const emailInput = screen.getByPlaceholderText('staff@students.wits.ac.za');
      const createButton = screen.getByRole('button', { name: /Create Account/i });

      await userEvent.type(nameInput, 'New Staff');
      await userEvent.type(emailInput, 'existing@students.wits.ac.za');
      fireEvent.click(createButton);

      await waitFor(() => {
        const errorElements = screen.queryAllByText(/Email already exists/);
        expect(errorElements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    test('clears form fields after successful creation', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn()
            .mockResolvedValueOnce({
              data: [],
              error: null,
            })
            .mockResolvedValueOnce({
              data: [],
              error: null,
            }),
        }),
        insert: jest.fn().mockResolvedValue({
          data: [{ id: 'new-staff-1' }],
          error: null,
        }),
      });

      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Staff member name');
        const emailInput = screen.getByPlaceholderText('staff@students.wits.ac.za');
        const createButton = screen.getByRole('button', { name: /Create Account/i });

        userEvent.type(nameInput, 'New Staff');
        userEvent.type(emailInput, 'newstaff@students.wits.ac.za');
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Staff member name');
        const emailInput = screen.getByPlaceholderText('staff@students.wits.ac.za');
        expect(nameInput).toHaveValue('');
        expect(emailInput).toHaveValue('');
      });
    });
  });

  describe('Delete Staff Account', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'staff-1',
                name: 'John Doe',
                email: 'john@students.wits.ac.za',
                created_at: '2026-04-11T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });
    });

    test('deletes staff member when delete button is clicked', async () => {
      window.confirm = jest.fn(() => true);

      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    id: 'staff-1',
                    name: 'John Doe',
                    email: 'john@students.wits.ac.za',
                    created_at: '2026-04-11T00:00:00Z',
                  },
                ],
                error: null,
              })
              .mockResolvedValueOnce({
                data: [],
                error: null,
              }),
          }),
          delete: mockDelete,
        });

      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete staff member');
      expect(deleteButtons.length).toBeGreaterThan(0);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    test('does not delete when confirmation is cancelled', async () => {
      window.confirm = jest.fn(() => false);

      const mockDelete = jest.fn();
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'staff-1',
                name: 'John Doe',
                email: 'john@students.wits.ac.za',
                created_at: '2026-04-11T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
        delete: mockDelete,
      });

      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete staff member');
      expect(deleteButtons.length).toBeGreaterThan(0);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Delete should not be called when confirmation is cancelled
      expect(mockDelete).not.toHaveBeenCalled();
    });

    test('displays success message after deleting staff member', async () => {
      window.confirm = jest.fn(() => true);

      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            order: jest.fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    id: 'staff-1',
                    name: 'John Doe',
                    email: 'john@students.wits.ac.za',
                    created_at: '2026-04-11T00:00:00Z',
                  },
                ],
                error: null,
              })
              .mockResolvedValueOnce({
                data: [],
                error: null,
              }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        });

      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete staff member');
      expect(deleteButtons.length).toBeGreaterThan(0);
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        const successMessages = screen.queryAllByText(/Staff member removed/);
        expect(successMessages.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('UI Elements', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });
    });

    test('displays admin panel title', async () => {
      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      });
    });

    test('displays staff list header', async () => {
      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(screen.getByText('Trade Facility Staff')).toBeInTheDocument();
      });
    });

    test('displays table headers', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'staff-1',
                name: 'John Doe',
                email: 'john@students.wits.ac.za',
                created_at: '2026-04-11T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      });

      render(<AdminPanel user={mockUser} userRole="admin" />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Trade Facility Staff')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});