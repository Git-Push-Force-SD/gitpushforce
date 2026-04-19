import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, Home, ArrowLeft } from 'lucide-react';

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <section className="w-full min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center px-5">
      <section className="text-center max-w-[500px] bg-white rounded-3xl p-12 shadow-lg">
        
        {/* Cancel Icon */}
        <section className="flex justify-center mb-8">
          <XCircle size={80} className="text-red-500" />
        </section>

        {/* Title */}
        <h1 className="text-4xl font-bold text-dark mb-4 font-display uppercase">
          Payment Cancelled
        </h1>

        {/* Description */}
        <p className="text-lg text-text-muted mb-8 leading-relaxed">
          Your payment was cancelled. No charges have been made to your account. You can try again or return to browse more items.
        </p>

        {/* Info Box */}
        <section className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8 text-left rounded-lg">
          <p className="text-sm text-amber-800 font-medium">
            💡 Tip: You can save items to your wishlist and purchase them later whenever you're ready!
          </p>
        </section>

        {/* Buttons */}
        <section className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 bg-dark text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors uppercase text-sm"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/studentdashboard')}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-primary-dark transition-colors uppercase text-sm"
          >
            <Home size={18} />
            Back to Dashboard
          </button>
        </section>

        {/* Support */}
        <p className="mt-8 text-xs text-text-muted">
          Need help? Contact <span className="font-semibold">support@unimart.com</span>
        </p>
      </section>
    </section>
  );
};

export default PaymentCancel;
