// Environment configuration helper - can be mocked in tests
export const getEnv = () => ({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
});
