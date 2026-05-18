const mockCreateClient = jest.fn((url, key) => ({ url, key }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args) => mockCreateClient(...args),
}));

describe('supabase client module', () => {
  const originalUrl = process.env.VITE_SUPABASE_URL;
  const originalKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const loadSupabaseModule = () => {
    let mod;
    jest.isolateModules(() => {
      mod = require('./supabase.js');
    });
    return mod;
  };

  beforeEach(() => {
    jest.resetModules();
    mockCreateClient.mockClear();
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  });

  afterAll(() => {
    if (originalUrl !== undefined) process.env.VITE_SUPABASE_URL = originalUrl;
    else delete process.env.VITE_SUPABASE_URL;
    if (originalKey !== undefined) {
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY = originalKey;
    } else {
      delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    }
  });

  it('exports a supabase client created via createClient', () => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'publishable-test-key';

    const { supabase } = loadSupabaseModule();

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'publishable-test-key',
    );
    expect(supabase).toEqual({
      url: 'https://test.supabase.co',
      key: 'publishable-test-key',
    });
  });

  it('passes undefined env values when variables are not set', () => {
    const { supabase } = loadSupabaseModule();

    expect(mockCreateClient).toHaveBeenCalledWith(undefined, undefined);
    expect(supabase).toEqual({ url: undefined, key: undefined });
  });
});
