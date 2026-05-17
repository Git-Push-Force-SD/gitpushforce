import SUPABASE_URL from './config';

describe('SUPABASE_URL', () => {
  const FALLBACK = 'https://keposlpyrewldohbmesq.supabase.co';

  beforeEach(() => {
    jest.resetModules();
  });

  it('exports a string', () => {
    expect(typeof SUPABASE_URL).toBe('string');
  });

  it('uses the fallback URL when VITE_SUPABASE_URL is not set', () => {
    expect(SUPABASE_URL).toBe(FALLBACK);
  });

  it('fallback URL is a valid https URL', () => {
    expect(SUPABASE_URL).toMatch(/^https:\/\/.+/);
  });

  it('uses VITE_SUPABASE_URL env var when set', () => {
    process.env.VITE_SUPABASE_URL = 'https://custom.supabase.co';
    jest.isolateModules(() => {
      const url = require('./config').default;
      expect(url).toBe('https://custom.supabase.co');
    });
    delete process.env.VITE_SUPABASE_URL;
  });
});