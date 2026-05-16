import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, Package, ShoppingBag, Store, Repeat2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

const formatPrice = (price) =>
  `R${Number(price || 0).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function Transactions({ user, onBack, compact = false }) {
  const [activeTab, setActiveTab] = useState('purchases');
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          buyer_id,
          listing_id,
          status,
          buyer_status,
          created_at,
          listings (
            id,
            title,
            price,
            category,
            condition,
            seller_id,
            image_path,
            seller:users!listings_seller_id_fkey (
              id,
              username,
              email
            )
          )
        `)
        .or(`buyer_id.eq.${user.id},listings.seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .select(`
          id,
          initiator_id,
          receiver_id,
          status,
          created_at,
          initiator:initiator_id (
            id,
            username,
            email
          ),
          receiver:receiver_id (
            id,
            username,
            email
          ),
          bookings (
            id,
            status,
            date,
            time_slot,
            location,
            listing:listing_id (
              id,
              title,
              price,
              category,
              condition,
              image_path
            )
          )
        `)
        .or(`initiator_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (orderError) {
        console.error('Error fetching orders:', orderError);
        setOrders([]);
      } else {
        setOrders(orderData || []);
      }

      if (tradeError) {
        console.error('Error fetching trades:', tradeError);
        setTrades([]);
      } else {
        setTrades(tradeData || []);
      }

      setLoading(false);
    };

    fetchTransactions();
  }, [user?.id]);

  const purchases = useMemo(() => {
    return orders.filter(
      (order) =>
        order.buyer_id === user?.id &&
        order.status === 'completed'
    );
  }, [orders, user?.id]);

  const sales = useMemo(() => {
    return orders.filter(
      (order) =>
        order.listings?.seller_id === user?.id &&
        order.status === 'completed'
    );
  }, [orders, user?.id]);

  const completedTrades = useMemo(() => {
    return trades.filter((trade) => {
      const bookings = trade.bookings || [];

      return (
        bookings.length > 0 &&
        bookings.every((booking) => booking.status === 'collected')
      );
    });
  }, [trades]);

  const activeItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base =
      activeTab === 'purchases'
        ? purchases
        : activeTab === 'sales'
          ? sales
          : completedTrades;

    return base.filter((item) => {
      if (!q) return true;

      if (activeTab === 'trades') {
        return (
          item.id?.toLowerCase().includes(q) ||
          item.status?.toLowerCase().includes(q) ||
          item.initiator?.username?.toLowerCase().includes(q) ||
          item.receiver?.username?.toLowerCase().includes(q) ||
          item.bookings?.some((booking) =>
            booking.listing?.title?.toLowerCase().includes(q)
          )
        );
      }

      return (
        item.id?.toLowerCase().includes(q) ||
        item.status?.toLowerCase().includes(q) ||
        item.buyer_status?.toLowerCase().includes(q) ||
        item.listings?.title?.toLowerCase().includes(q) ||
        item.listings?.category?.toLowerCase().includes(q) ||
        item.listings?.condition?.toLowerCase().includes(q) ||
        item.listings?.seller?.username?.toLowerCase().includes(q)
      );
    });
  }, [activeTab, purchases, sales, completedTrades, search]);

  const tabs = [
    { id: 'purchases', label: 'BUYING', icon: ShoppingBag, count: purchases.length },
    { id: 'sales', label: 'SELLING', icon: Store, count: sales.length },
    { id: 'trades', label: 'TRADES', icon: Repeat2, count: completedTrades.length },
  ];

  return (
    <section className={`${compact ? '' : 'min-h-screen bg-offwhite p-4 sm:p-8'} text-dark`}>
      <section className={`${compact ? 'space-y-4' : 'mx-auto max-w-7xl space-y-6'}`}>
        {!compact && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-dark"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </button>
        )}

        {!compact && (
          <section>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              My Orders
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Completed Purchases, Sales & Trades
            </h1>
          </section>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  activeTab === tab.id
                    ? 'bg-dark text-white border-dark'
                    : 'bg-white text-dark border-gray-200 hover:border-dark'
                }`}
              >
                <section className="flex items-center justify-between">
                  <Icon size={20} />
                  <span className="text-sm font-bold">{tab.count}</span>
                </section>
                <p className="mt-3 font-semibold">{tab.label}</p>
              </button>
            );
          })}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <section className="flex items-center gap-3 rounded-full bg-gray-50 px-4 py-3">
            <Search size={18} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search completed transactions"
              className="w-full bg-transparent text-sm outline-none"
            />
          </section>
        </section>

        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <section className="p-6 text-center text-gray-500">
              Loading completed transactions...
            </section>
          ) : activeItems.length === 0 ? (
            <section className="p-6 text-center text-gray-500">
              No completed {activeTab} found.
            </section>
          ) : activeTab === 'trades' ? (
            activeItems.map((trade) => {
              const otherUser =
                trade.initiator_id === user?.id ? trade.receiver : trade.initiator;

              return (
                <section key={trade.id} className="border-t border-gray-100 p-5">
                  <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <section className="flex items-center gap-3">
                      <section className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                        <Repeat2 size={20} />
                      </section>

                      <section>
                        <p className="font-semibold">Completed Trade</p>
                        <p className="text-xs text-gray-500">Trade ID: {trade.id}</p>
                        <p className="text-xs text-gray-500">
                          With: {otherUser?.username || otherUser?.email || 'Unknown'}
                        </p>
                      </section>
                    </section>

                    <span className="w-fit rounded-full border px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 border-green-200">
                      Completed
                    </span>
                  </section>

                  <section className="mt-4 grid gap-3 md:grid-cols-2">
                    {(trade.bookings || []).map((booking) => (
                      <section
                        key={booking.id}
                        className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                      >
                        <p className="font-semibold">
                          {booking.listing?.title || 'Unknown item'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatPrice(booking.listing?.price)}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {booking.date} · {booking.time_slot}
                        </p>
                        <p className="text-xs text-gray-500">{booking.location}</p>
                        <span className="mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 border-green-200">
                          Collected
                        </span>
                      </section>
                    ))}
                  </section>
                </section>
              );
            })
          ) : (
            activeItems.map((order) => {
              const listing = order.listings;

              return (
                <section
                  key={order.id}
                  className="grid grid-cols-1 gap-4 border-t border-gray-100 px-5 py-5 md:grid-cols-[1.2fr_1fr_0.8fr] md:items-center"
                >
                  <section className="flex items-center gap-3">
                    <section className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                      <Package size={20} />
                    </section>

                    <section>
                      <p className="font-semibold">
                        {listing?.title || 'Unknown item'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Order ID: {order.id}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatPrice(listing?.price)}
                      </p>
                    </section>
                  </section>

                  <section>
                    <p className="text-sm">
                      {activeTab === 'purchases'
                        ? `Seller: ${listing?.seller?.username || listing?.seller?.email || 'Unknown'}`
                        : 'Completed sale'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('en-ZA')}
                    </p>
                  </section>

                  <section className="space-y-2">
                    <span className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 border-green-200">
                      Completed
                    </span>

                    {order.buyer_status && (
                      <p className="text-xs text-gray-500">
                        Buyer status: {order.buyer_status}
                      </p>
                    )}
                  </section>
                </section>
              );
            })
          )}
        </section>
      </section>
    </section>
  );
}