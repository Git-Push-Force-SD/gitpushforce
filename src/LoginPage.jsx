import React, { useState } from 'react';
import './LoginPage.css';
import { ArrowLeft, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from './utils/supabase';

export default function LoginPage({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });



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
            <h1 className="greeting">Welcome back!</h1>
            <p className="greeting-sub">
              Sign in with your university email to access Unimart safely.
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

            {/* Google Sign-In Button */}
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
          </section>
        </section>

        {/* Right Side: Image Only */}
        <section className="login-right">
          <section
            className="right-bg-image"
            style={{ backgroundImage: `url('/Images/ncb.jpeg')` }}
          ></section>
          <section className="typing-wrapper">
            <section className="typing-text-container">your campus. your marketplace.</section>
          </section>
        </section>
      </section>
    </section>
  );
}
