import React from 'react';
import './LoginPage.css';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage({ onBack }) {
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

            <button className="google-btn">
              <svg className="google-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
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
