import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return;

    const storageKey = `payment_complete_${sessionId}`;
    if (sessionStorage.getItem(storageKey) === 'done') return;
    if (sessionStorage.getItem(storageKey) === 'processing') return;

    sessionStorage.setItem(storageKey, 'processing');

    const completePayment = async () => {
      const maxAttempts = 4;
      try {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const res = await fetch('/mark-payment-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
          });

          const data = await res.json().catch(() => ({}));

          if (res.ok) {
            sessionStorage.setItem(storageKey, 'done');
            return;
          }

          const retryable =
            res.status === 400 &&
            typeof data.error === 'string' &&
            data.error.includes('Payment not completed');

          if (retryable && attempt < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
            continue;
          }

          console.error('mark-payment-complete failed:', data.error || res.status);
          sessionStorage.removeItem(storageKey);
          return;
        }
      } catch (err) {
        console.error('markOrderPaid error:', err);
        sessionStorage.removeItem(storageKey);
      }
    };

    completePayment();
  }, []);

  return (
    <section className="min-h-screen bg-offwhite flex items-center justify-center px-5">
      <div className="text-center max-w-md bg-white rounded-3xl p-10 shadow-sm border border-gray-100">
        
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: '#EAF3DE' }}>
            <CheckCircle size={36} style={{ color: '#3B6D11' }} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-dark mb-2 font-display uppercase">
          Payment Successful!
        </h1>

        {/* Message */}
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          Your payment has been confirmed. The seller will be notified to drop off your item at the Trade Facility. You'll be able to collect it once staff confirm receipt.
        </p>

        {/* What happens next */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            What happens next
          </p>
          {[
            'Seller drops off your item at the Trade Facility',
            'Staff confirm the item has been received',
            'You collect your item from the facility',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 mb-2 last:mb-0">
              <div className="w-5 h-5 rounded-full bg-dark text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-gray-600">{step}</p>
            </div>
          ))}
        </div>

        {/* Button */}
        <button
          onClick={() => navigate('/studentdashboard')}
          className="w-full py-3 rounded-xl bg-dark text-white font-semibold text-sm hover:bg-gray-800 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </section>
  );
};

export default PaymentSuccess;