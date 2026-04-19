import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home, ShoppingBag } from 'lucide-react';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Optionally auto-redirect after 5 seconds
    // const timer = setTimeout(() => navigate('/studentdashboard'), 5000);
    // return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <section className="w-full min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-5">
      <section className="text-center max-w-[500px] bg-white rounded-3xl p-12 shadow-lg">
        
        {/* Success Icon */}
        <section className="flex justify-center mb-8">
          <section className="relative">
            <CheckCircle size={80} className="text-green-500 animate-bounce" />
            <section className="absolute inset-0 rounded-full animate-pulse bg-green-500/20"></section>
          </section>
        </section>

        {/* Title */}
        <h1 className="text-4xl font-bold text-dark mb-4 font-display uppercase">
          Payment Successful!
        </h1>

        {/* Description */}
        <p className="text-lg text-text-muted mb-8 leading-relaxed">
          Thank you for your purchase! Your order has been confirmed and will be processed shortly. You'll receive a confirmation email with your order details.
        </p>

        {/* Order Details Section */}
        <section className="bg-gray-50 rounded-2xl p-6 mb-8 text-left border border-gray-200">
          <h3 className="font-semibold text-dark mb-4 uppercase text-sm">Order Details</h3>
          <section className="space-y-3 text-sm text-text-muted">
            <section className="flex justify-between">
              <span>Order Status:</span>
              <span className="font-semibold text-green-600">Confirmed</span>
            </section>
            <section className="flex justify-between">
              <span>Currency:</span>
              <span className="font-semibold text-green-600">ZAR (South African Rand)</span>
            </section>
            <section className="flex justify-between">
              <span>Payment Status:</span>
              <span className="font-semibold text-green-600">Completed</span>
            </section>
            <section className="flex justify-between">
              <span>Transaction ID:</span>
              <span className="font-mono text-xs">{new Date().getTime()}</span>
            </section>
          </section>
        </section>

        {/* Buttons */}
        <section className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/studentdashboard')}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-primary-dark transition-colors uppercase text-sm"
          >
            <Home size={18} />
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 bg-dark text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors uppercase text-sm"
          >
            <ShoppingBag size={18} />
            Continue Shopping
          </button>
        </section>

        {/* Support Text */}
        <p className="mt-8 text-xs text-text-muted">
          Questions? Contact us at <span className="font-semibold">support@unimart.com</span>
        </p>
      </section>
    </section>
  );
};

export default PaymentSuccess;
