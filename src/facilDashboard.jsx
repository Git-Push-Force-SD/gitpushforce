import React, { useState } from 'react';
import { LogOut, ArrowUpRight, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import QueueView from './components/facidashboard/QueueView';
import DropOffsView from './components/facidashboard/Dropoffsview';
import CollectionsView from './components/facidashboard/Collectionsview';
import HistoryView from './components/facidashboard/History';

// ─────────────────────────────────────────────────────────────────────────────
// FACIL DASHBOARD
// Layout shell: sidebar navigation + per-view content area.
// Each view lives in its own file:
//   QueueView.jsx       — pending & confirmed bookings
//   DropOffsView.jsx    — seller drop-off confirmations
//   CollectionsView.jsx — buyer collection & cash settlement
//   HistoryView.jsx     — completed & cancelled history
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = ['Queue', 'Drop-offs', 'Collections', 'History'];

const NAV_DESCRIPTIONS = {
  'Queue':       'Review all pending and confirmed bookings at a glance.',
  'Drop-offs':   'Confirm items ready for drop-off by sellers.',
  'Collections': 'Release items to buyers once they are collected.',
  'History':     'View completed and cancelled bookings history.',
};

const NAV_SLUGS = {
  'Queue':       'queue',
  'Drop-offs':   'drop-offs',
  'Collections': 'collections',
  'History':     'history',
};

const SLUG_TO_NAV = Object.fromEntries(
  Object.entries(NAV_SLUGS).map(([k, v]) => [v, k])
);

export default function FacilDashboard({ user, handleLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Derive activeNav from current URL
  const slug = location.pathname.split('/').pop();
  const activeNav = SLUG_TO_NAV[slug] || 'Queue';

  const handleNavClick = (item) => {
    navigate(`/staff/${NAV_SLUGS[item]}`);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  return (
    <main className="min-h-screen bg-offwhite font-main text-dark">
      <section className="grid min-h-screen lg:grid-cols-[260px_1fr]">

        {/* ── MOBILE MENU TOGGLE ── */}
        <div className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b border-black/5 bg-white/70 backdrop-blur-xl px-4 lg:hidden">
          <p className="font-semibold text-dark">Trade Staff</p>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 hover:bg-light"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* ── SIDEBAR ── */}
        <aside className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-black/5 bg-white/70 backdrop-blur-xl transition-transform lg:relative lg:w-auto lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:mt-0 mt-16`}>
          <section className="flex h-full flex-col p-6">

            {/* Branding */}
            <section>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                UniMart
              </p>
              <h1 className="mt-3 font-display text-2xl sm:text-3xl tracking-tight uppercase">
                Trade Staff
              </h1>
            </section>

            {/* Navigation */}
            <nav className="mt-10 space-y-2 text-sm">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item}
                  onClick={() => handleNavClick(item)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                    activeNav === item
                      ? 'bg-dark text-white shadow-lg'
                      : 'text-text-muted hover:bg-light'
                  }`}
                >
                  <span>{item}</span>
                  {activeNav === item && <ArrowUpRight className="h-4 w-4" />}
                </button>
              ))}
            </nav>

            {/* Logout */}
            {handleLogout && (
              <button
                onClick={handleLogout}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-dark transition hover:bg-light"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            )}

          </section>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <section className="p-3 sm:p-4 md:p-8 mt-16 lg:mt-0">
          <section className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 md:space-y-8">

            {/* Page header */}
            <header className="rounded-2xl sm:rounded-[32px] bg-dark text-white shadow-xl">
              <section className="p-4 sm:p-6 md:p-8">
                <h2 className="font-display text-2xl sm:text-3xl md:text-5xl leading-tight tracking-tight uppercase">
                  {activeNav}
                </h2>
                <p className="mt-2 sm:mt-4 max-w-xl text-xs sm:text-sm md:text-base leading-6 sm:leading-7 text-white/75">
                  {NAV_DESCRIPTIONS[activeNav]}
                </p>
              </section>
            </header>

            {/* Active view */}
            <section className="rounded-2xl sm:rounded-[30px] bg-white p-4 sm:p-6 md:p-7 shadow-sm ring-1 ring-black/5">
              {activeNav === 'Queue'       && <QueueView />}
              {activeNav === 'Drop-offs'   && <DropOffsView />}
              {activeNav === 'Collections' && <CollectionsView user={user} />}
              {activeNav === 'History'     && <HistoryView />}
            </section>

          </section>
        </section>

      </section>
    </main>
  );
}
