import React, { useEffect, useMemo, useState } from 'react';
import { Search, Package, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../utils/supabase';

const statusLabels = {
  pending: 'Awaiting drop-off',
  confirmed: 'Ready for collection',
  collected: 'Completed',
  cancelled: 'Cancelled',
};

const badgeClasses = (status) => {
  if (status === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (status === 'confirmed') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status === 'collected') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'cancelled') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

export default function StudentTransactions({ user, onBack }) {
  const [transactions, setTransactions] = useState([]);
  const [activeView, setActiveView] = useState('queue');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?.id) return;

      setLoading(true);

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          order_id,
          buyer_id,
          seller_id,
          listing_id,
          date,
          time_slot,
          location,
          status,
          notes,
          created_at,
          buyer:buyer_id(id, username, email),
          seller:seller_id(id, username, email),
          listing:listing_id(id, title, price, category, condition, image_path)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        setTransactions([]);
      } else {
        setTransactions(data || []);
      }

      setLoading(false);
    };

    fetchTransactions();
  }, [user?.id]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const isIncomplete =
        transaction.status !== 'collected' &&
        transaction.status !== 'cancelled';

      const matchesView = activeView === 'queue' ? isIncomplete : true;

      const matchesSearch =
        q === '' ||
        transaction.id?.toLowerCase().includes(q) ||
        transaction.listing?.title?.toLowerCase().includes(q) ||
        transaction.buyer?.username?.toLowerCase().includes(q) ||
        transaction.buyer?.email?.toLowerCase().includes(q) ||
        transaction.seller?.username?.toLowerCase().includes(q) ||
        transaction.seller?.email?.toLowerCase().includes(q) ||
        transaction.status?.toLowerCase().includes(q);

      return matchesView && matchesSearch;
    });
  }, [transactions, activeView, search]);

  return (
    <section className="min-h-screen bg-offwhite p-4 sm:p-8 text-dark">
      <section className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <section>
            <button
              onClick={onBack}
              className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-dark"
            >
              <ArrowLeft size={16} />
              Back to dashboard
            </button>

            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
              My Transactions
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Transaction Dashboard
            </h1>
          </section>

          <section className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveView('queue')}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeView === 'queue'
                  ? 'bg-dark text-white'
                  : 'bg-white text-dark border border-gray-200'
              }`}
            >
              Incomplete Queue
            </button>

            <button
              onClick={() => setActiveView('history')}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeView === 'history'
                  ? 'bg-dark text-white'
                  : 'bg-white text-dark border border-gray-200'
              }`}
            >
              Transaction History
            </button>
          </section>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100">
          <section className="flex items-center gap-3 rounded-full bg-gray-50 px-4 py-3">
            <Search size={18} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item, user, status, or transaction ID"
              className="w-full bg-transparent text-sm outline-none"
            />
          </section>
        </section>

        <section className="rounded-3xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <section className="p-8 text-center text-gray-500">
              Loading transactions...
            </section>
          ) : filteredTransactions.length === 0 ? (
            <section className="p-8 text-center text-gray-500">
              {activeView === 'queue'
                ? 'No incomplete transactions found.'
                : 'No transaction history found.'}
            </section>
          ) : (
            filteredTransactions.map((transaction) => {
              const isBuyer = transaction.buyer_id === user?.id;
              const otherUser = isBuyer ? transaction.seller : transaction.buyer;

              return (
                <section
                  key={transaction.id}
                  className="grid grid-cols-1 gap-4 border-t border-gray-100 px-5 py-5 md:grid-cols-[1.2fr_1fr_1fr_0.8fr] md:items-center"
                >
                  <section className="flex items-center gap-3">
                    <section className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                      <Package size={20} />
                    </section>

                    <section>
                      <p className="font-semibold">
                        {transaction.listing?.title || 'Unknown item'}
                      </p>
                      <p className="text-xs text-gray-500">
                        You are: {isBuyer ? 'Buyer' : 'Seller'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Transaction: {transaction.id}
                      </p>
                    </section>
                  </section>

                  <section>
                    <p className="text-sm">
                      {isBuyer ? 'Seller' : 'Buyer'}:{' '}
                      {otherUser?.username || otherUser?.email || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Location: {transaction.location}
                    </p>
                  </section>

                  <section>
                    <p className="text-sm font-medium">{transaction.date}</p>
                    <p className="text-sm text-gray-500">{transaction.time_slot}</p>
                  </section>

                  <section className="space-y-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses(transaction.status)}`}
                    >
                      {statusLabels[transaction.status] || transaction.status}
                    </span>

                    {transaction.status === 'collected' && (
                      <section className="flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle2 size={14} />
                        Completed
                      </section>
                    )}

                    {transaction.status === 'cancelled' && (
                      <section className="flex items-center gap-1 text-xs text-red-700">
                        <XCircle size={14} />
                        Cancelled
                      </section>
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