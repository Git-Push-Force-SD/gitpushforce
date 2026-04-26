const mockUnsubscribe = jest.fn();

const mockChannel = {
  on:          jest.fn().mockReturnThis(),
  subscribe:   jest.fn().mockReturnValue({ unsubscribe: mockUnsubscribe }),
  unsubscribe: mockUnsubscribe,
};

export const supabase = {
  from:          jest.fn().mockReturnThis(),
  select:        jest.fn().mockReturnThis(),
  insert:        jest.fn().mockReturnThis(),
  update:        jest.fn().mockReturnThis(),
  delete:        jest.fn().mockReturnThis(),
  eq:            jest.fn().mockReturnThis(),
  neq:           jest.fn().mockReturnThis(),
  in:            jest.fn().mockReturnThis(),
  order:         jest.fn().mockReturnThis(),
  limit:         jest.fn().mockReturnThis(),
  single:        jest.fn().mockResolvedValue({ data: null, error: null }),
  filter:        jest.fn().mockReturnThis(),
  match:         jest.fn().mockReturnThis(),
  channel:       jest.fn().mockReturnValue(mockChannel),
  removeChannel: jest.fn().mockResolvedValue(null),
  auth: {
    getSession:        jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser:           jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signIn:            jest.fn().mockResolvedValue({ data: null, error: null }),
    signOut:           jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
  },
  storage: {
    from: jest.fn().mockReturnValue({
      upload:       jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://mock-url.com/file' },
      }),
    }),
  },
};