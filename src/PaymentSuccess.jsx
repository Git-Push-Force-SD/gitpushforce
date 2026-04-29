import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { supabase } from './utils/supabase';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
  const markOrderPaid = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      if (!sessionId) return;

      // Get session metadata from Express
      const res = await fetch(
        `http://localhost:3000/checkout-session?session_id=${sessionId}`
      );

      if (!res.ok) {
        console.error('checkout-session failed:', res.status);
        return;
      }

      const data = await res.json();
      console.log('session data:', data);
      const orderId = data?.metadata?.order_id;
      if (!orderId) {
        console.error('no order_id in metadata');
        return;
      }

      // 1. Fetch listing_id from orders table
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('listing_id')
        .eq('id', orderId)
        .single();

      if (fetchError || !order) {
        console.error('Failed to fetch order:', fetchError);
        return;
      }

      const listingId = order.listing_id;

      // 2. Update order: status='paid', buyer_status and seller_status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          buyer_status: 'awaiting_confirmation',
          seller_status: 'awaiting_booking'
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Failed to update order:', updateError);
        return;
      }

      console.log('Order updated successfully');

      // 3. Call RPC to mark listing as sold
      const { error: rpcError } = await supabase.rpc('mark_listing_sold', { p_listing_id: listingId });

      if (rpcError) {
        console.error('Failed to mark listing as sold:', rpcError);
        return;
      }

      console.log('Payment completed and listing marked as sold');

    } catch (err) {
      console.error('markOrderPaid error:', err);
    }
  };

  markOrderPaid();
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