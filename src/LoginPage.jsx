import React, { useState } from 'react';
import './LoginPage.css';
import { ArrowLeft, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from './utils/supabase';
import { validateWitsEmail } from './utils/constants';

export default function LoginPage({ onBack }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validate Wits email
    if (!validateWitsEmail(email)) {
      setMessage({ 
        type: 'error', 
        text: 'Email must be in format: [number]@students.wits.ac.za' 
      });
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}`,
          data: {
            role: 'student'
          }
        }
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        // Database trigger automatically creates user record
        setVerificationSent(true);
        setMessage({
          type: 'success',
          text: 'Check your email to verify your account before logging in.'
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          setMessage({
            type: 'warning',
            text: 'Please verify your email before logging in. Check your inbox for the verification link.'
          });
          await supabase.auth.signOut();
          return;
        }
        
        setMessage({ type: 'success', text: 'Login successful!' });
        onBack?.();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setMessage({ type: '', text: '' });
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
        setLoading(false);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    }
  };

  return (
    <section className="login-container">
      {/* Background Floating Elements */}
      <section className="floating-shapes">
        <section className="shape shape-1"></section>
        <section className="shape shape-2"></section>
        <section className="shape shape-3"></section>
        <section className="shape shape-4"></section>
        <section className="shape shape-5"></section>
        <section className="shape shape-6"></section>
      </section>

      {/* Mobile Screen Header */}
      <section className="login-header mobile-header">
        <section className="login-header-left">
          {onBack && (
            <button className="back-btn" onClick={onBack} title="Go back">
              <ArrowLeft size={20} />
            </button>
          )}
        </section>
      </section>

      <section className="login-card">
        {/* Left Side: Clean Form Area */}
        <section className="login-left">
          {/* Desktop Header */}
          <section className="login-header desktop-header">
            <section className="login-header-left">
              {onBack && (
                <button className="back-btn" onClick={onBack} title="Go back">
                  <ArrowLeft size={20} />
                </button>
              )}
            </section>
          </section>

          <section className="login-form-container">
            <h1 className="greeting">
              {isSignUp ? 'Join Unimart' : 'Welcome back!'}
            </h1>
            <p className="greeting-sub">
              {isSignUp
                ? 'Sign up with your Wits email to get started.'
                : 'Sign in with your university email to access Unimart safely.'}
            </p>

            {/* Message Display */}
            {message.text && (
              <section className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
                message.type === 'error' ? 'bg-red-100 text-red-800' : 
                message.type === 'success' ? 'bg-green-100 text-green-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {message.type === 'error' ? (
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm">{message.text}</p>
              </section>
            )}

            {/* Verification Sent State */}
            {verificationSent && !isSignUp ? (
              <section className="text-center">
                <CheckCircle size={48} className="mx-auto text-green-600 mb-4" />
                <p className="text-sm text-gray-600">
                  Verification email sent! Check your inbox and click the link to verify your email.
                </p>
                <button
                  onClick={() => {
                    setVerificationSent(false);
                    setIsSignUp(false);
                    setEmail('');
                    setPassword('');
                  }}
                  className="mt-4 text-primary font-semibold hover:underline"
                >
                  Back to login
                </button>
              </section>
            ) : (
              <>
                {/* Google Sign-In Button */}
                {!isSignUp && (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50 font-semibold text-gray-700"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      {loading ? 'Signing in...' : 'Continue with Google'}
                    </button>
                    
                    {/* sectionider */}
                    <section className="relative my-4">
                      <section className="absolute inset-0 flex items-center">
                        <section className="w-full border-t border-gray-300"></section>
                      </section>
                      <section className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-600">or</span>
                      </section>
                    </section>
                  </>
                )}

                <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
                {/* Email Input */}
                <section>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your-number@students.wits.ac.za"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    disabled={loading}
                  />
                </section>

                {/* Password Input */}
                <section>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    disabled={loading}
                  />
                </section>

                {/* Confirm Password (Sign Up Only) */}
                {isSignUp && (
                  <section>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                      disabled={loading}
                    />
                  </section>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-dark text-white py-2 rounded-lg font-semibold hover:bg-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading && <Loader size={18} className="animate-spin" />}
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </button>
              </form>

              {/* Toggle between Sign In and Sign Up */}
              {!verificationSent && (
                <section className="mt-6 text-center text-sm">
                  <span className="text-gray-600">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                  </span>
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setMessage({ type: '', text: '' });
                      setEmail('');
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    className="text-primary font-semibold hover:underline"
                    disabled={loading}
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </button>
                </section>
              )}
              </>
            )}
          </section>
        </section>

        {/* Right Side: Image Only */}
        <section className="login-right">
          <section
            className="right-bg-image"
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80')` }}
          ></section>
          <section className="typing-wrapper">
            <section className="typing-text-container">your campus. your marketplace.</section>
          </section>
        </section>
      </section>
    </section>
  );
}
