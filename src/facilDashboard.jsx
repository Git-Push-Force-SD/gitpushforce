import React, { useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock3,
  Search,
  ShieldCheck,
  Package,
  MapPin,
  MessageSquare,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  UserCheck,
  CalendarDays,
  XCircle,
  LogOut,
} from 'lucide-react';

const stats = [
  {
    label: 'Pending handovers',
    value: '18',
    change: '+5 today',
    icon: Clock3,
  },
  {
    label: 'Verified traders',
    value: '1,284',
    change: '98% active',
    icon: UserCheck,
  },
  {
    label: 'Secure zones live',
    value: '6',
    change: '2 fully staffed',
    icon: MapPin,
  },
  {
    label: 'Resolved disputes',
    value: '42',
    change: 'Avg. 1.8 hrs',
    icon: ShieldCheck,
  },
];

const tradeRequests = [
  {
    id: 'TRD-1042',
    item: 'MacBook Air M2',
    category: 'Tech',
    buyer: 'Lebo M.',
    seller: 'Ayesha K.',
    zone: 'Library Exchange Point',
    time: '10:30',
    date: 'Today',
    status: 'Awaiting drop-off',
    priority: 'High',
  },
  {
    id: 'TRD-1043',
    item: 'Calculus Textbook',
    category: 'Books',
    buyer: 'Neo P.',
    seller: 'Sam D.',
    zone: 'Student Center Desk',
    time: '11:15',
    date: 'Today',
    status: 'Ready for verification',
    priority: 'Medium',
  },
  {
    id: 'TRD-1044',
    item: 'Nike Dunks Low',
    category: 'Fashion',
    buyer: 'Tariro S.',
    seller: 'Chris T.',
    zone: 'North Gate Hub',
    time: '12:00',
    date: 'Today',
    status: 'Buyer arrived',
    priority: 'Low',
  },
  {
    id: 'TRD-1045',
    item: 'Sony WH-1000XM4',
    category: 'Audio',
    buyer: 'Naledi R.',
    seller: 'Mia L.',
    zone: 'Engineering Foyer',
    time: '14:45',
    date: 'Today',
    status: 'Dispute review',
    priority: 'High',
  },
  {
    id: 'TRD-1046',
    item: 'Desk Lamp',
    category: 'Home',
    buyer: 'Jason B.',
    seller: 'Onke H.',
    zone: 'Res Hall Exchange Point',
    time: '16:00',
    date: 'Tomorrow',
    status: 'Scheduled',
    priority: 'Low',
  },
];

const incidents = [
  {
    title: 'Condition mismatch flagged',
    tradeId: 'TRD-1045',
    detail: 'Buyer reported visible wear not shown in listing photos.',
    severity: 'High',
  },
  {
    title: 'Late drop-off risk',
    tradeId: 'TRD-1042',
    detail: 'Seller is 15 minutes behind scheduled handover window.',
    severity: 'Medium',
  },
  {
    title: 'Verification complete',
    tradeId: 'TRD-1043',
    detail: 'Item condition matched listing and handover can proceed.',
    severity: 'Resolved',
  },
];

const messages = [
  {
    from: 'Library Exchange Point',
    time: '09:48',
    text: 'Two laptop trades booked back-to-back. Requesting backup facilitator from 10:30 to 11:30.',
  },
  {
    from: 'North Gate Hub',
    time: '10:02',
    text: 'Buyer for TRD-1044 checked in early. Item inspection area is ready.',
  },
  {
    from: 'Trust & Safety Bot',
    time: '10:05',
    text: 'Flagged price anomaly on electronics category. Monitor new listings over R10,000.',
  },
];

function badgeClasses(value) {
  if (value === 'High') return 'bg-red-100 text-red-700 border-red-200';
  if (value === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (value === 'Resolved' || value === 'Low') return 'bg-primary/10 text-primary border-primary/20';
  if (value === 'Awaiting drop-off') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (value === 'Ready for verification') return 'bg-light text-dark border-light';
  if (value === 'Buyer arrived') return 'bg-primary/10 text-primary border-primary/20';
  if (value === 'Dispute review') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-light text-dark border-light';
}

export default function CampusMarketplaceDashboard({ handleLogout }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredTrades = useMemo(() => {
    return tradeRequests.filter((trade) => {
      const matchesSearch =
        trade.id.toLowerCase().includes(search.toLowerCase()) ||
        trade.item.toLowerCase().includes(search.toLowerCase()) ||
        trade.buyer.toLowerCase().includes(search.toLowerCase()) ||
        trade.seller.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'All' || trade.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  return (
    <main className="min-h-screen bg-offwhite font-main text-dark">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-black/5 bg-white/70 backdrop-blur-xl">
          <div className="flex h-full flex-col p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                Campus Marketplace
              </p>
              <h1 className="mt-3 font-display text-3xl tracking-tight uppercase">
                Trade Facilitator
              </h1>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Oversee secure student exchanges, verification flow, and trust incidents across campus zones.
              </p>
            </div>

            <nav className="mt-10 space-y-2 text-sm">
              {[
                'Overview',
                'Trade Queue',
                'Safe Zones',
                'Messages',
                'Verification',
                'Disputes',
                'Reports',
              ].map((item, index) => (
                <button
                  key={item}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                    index === 0
                      ? 'bg-dark text-white shadow-lg'
                      : 'text-text-muted hover:bg-light'
                  }`}
                >
                  <span>{item}</span>
                  {index === 0 && <ArrowUpRight className="h-4 w-4" />}
                </button>
              ))}
            </nav>

            <div className="mt-auto rounded-[28px] bg-dark p-5 text-white shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Trust score</p>
                  <p className="text-xs text-white/70">Campus system health</p>
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="font-display text-4xl tracking-tight uppercase">94%</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-primary">Stable today</p>
                </div>
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
            </div>
            {handleLogout && (
              <button
                onClick={handleLogout}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-dark transition hover:bg-light"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            )}
          </div>
        </aside>

        <section className="p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <header className="rounded-[32px] bg-dark text-white shadow-xl">
              <div className="grid gap-8 p-6 md:grid-cols-[1.3fr_0.9fr] md:p-8">
                <div>
                  <div className="flex items-center gap-3 text-sm text-white/70">
                    <CalendarDays className="h-4 w-4" />
                    <span>Operations dashboard · Tuesday shift</span>
                  </div>
                  <h2 className="mt-4 max-w-2xl font-display text-3xl leading-tight tracking-tight uppercase md:text-5xl">
                    Keep every campus trade secure, verified, and on time.
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 md:text-base">
                    Review handover requests, track exchange points, respond to disputes, and message zone staff from one control center.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-dark transition hover:bg-primary/10">
                      Open live queue
                    </button>
                    <button className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                      Assign facilitator
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-white/70">{stat.label}</p>
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <p className="mt-4 font-display text-3xl tracking-tight uppercase">{stat.value}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/60">{stat.change}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </header>

            <section className="grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="space-y-8">
                <section className="rounded-[30px] bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-7">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                        Trade queue
                      </p>
                      <h3 className="mt-2 font-display text-2xl tracking-tight uppercase">
                        Today’s facilitated exchanges
                      </h3>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="flex items-center gap-2 rounded-full border border-light bg-light px-4 py-3">
                        <Search className="h-4 w-4 text-text-muted" />
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search trade, item, buyer..."
                          className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted"
                        />
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-light bg-white px-4 py-3">
                        <Filter className="h-4 w-4 text-text-muted" />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-transparent text-sm outline-none"
                        >
                          {[
                            'All',
                            'Awaiting drop-off',
                            'Ready for verification',
                            'Buyer arrived',
                            'Dispute review',
                            'Scheduled',
                          ].map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-[24px] border border-light">
                    <div className="grid grid-cols-[1.1fr_0.9fr_1fr_0.8fr_0.8fr] gap-4 bg-light px-5 py-4 text-xs font-bold uppercase tracking-[0.2em] text-text-muted">
                      <span>Trade</span>
                      <span>Participants</span>
                      <span>Zone</span>
                      <span>Window</span>
                      <span>Status</span>
                    </div>

                    <div className="divide-y divide-light">
                      {filteredTrades.map((trade) => (
                        <div
                          key={trade.id}
                          className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-[1.1fr_0.9fr_1fr_0.8fr_0.8fr] md:items-center"
                        >
                          <div>
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light">
                                <Package className="h-5 w-5 text-dark" />
                              </div>
                              <div>
                                <p className="font-semibold text-dark">{trade.item}</p>
                                <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                                  {trade.id} · {trade.category}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium">Buyer: {trade.buyer}</p>
                            <p className="text-sm text-text-muted">Seller: {trade.seller}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium">{trade.zone}</p>
                            <p className="text-xs text-text-muted">Facilitated pickup</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium">{trade.date}</p>
                            <p className="text-sm text-text-muted">{trade.time}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses(trade.status)}`}>
                              {trade.status}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses(trade.priority)}`}>
                              {trade.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-[30px] bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                          Zone activity
                        </p>
                        <h3 className="mt-2 font-display text-2xl tracking-tight uppercase">
                          Safe exchange points
                        </h3>
                      </div>
                      <MapPin className="h-5 w-5 text-text-muted" />
                    </div>

                    <div className="mt-6 space-y-4">
                      {[
                        { zone: 'Library Exchange Point', load: 'High traffic', status: '2 facilitators active' },
                        { zone: 'Student Center Desk', load: 'Balanced', status: '1 facilitator active' },
                        { zone: 'Engineering Foyer', load: 'Peak in 45 min', status: 'Inspection desk ready' },
                        { zone: 'North Gate Hub', load: 'Low traffic', status: 'Next handover at 12:00' },
                      ].map((zone, i) => (
                        <div key={zone.zone} className="rounded-[22px] border border-light bg-light p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold">{zone.zone}</p>
                              <p className="mt-1 text-sm text-text-muted">{zone.status}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${i === 0 ? 'bg-red-100 text-red-700' : 'bg-light text-dark'}`}>
                              {zone.load}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[30px] bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-7">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                          Communication
                        </p>
                        <h3 className="mt-2 font-display text-2xl tracking-tight uppercase">
                          Live coordination feed
                        </h3>
                      </div>
                      <MessageSquare className="h-5 w-5 text-text-muted" />
                    </div>

                    <div className="mt-6 space-y-4">
                      {messages.map((message) => (
                        <div key={`${message.from}-${message.time}`} className="rounded-[22px] border border-light p-4">
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-semibold">{message.from}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{message.time}</p>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-text-muted">{message.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <section className="rounded-[30px] bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                        Risk & review
                      </p>
                      <h3 className="mt-2 font-display text-2xl tracking-tight uppercase">
                        Incident monitor
                      </h3>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-text-muted" />
                  </div>

                  <div className="mt-6 space-y-4">
                    {incidents.map((incident) => (
                      <div key={incident.tradeId} className="rounded-[24px] border border-light p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold">{incident.title}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-muted">{incident.tradeId}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses(incident.severity)}`}>
                            {incident.severity}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-text-muted">{incident.detail}</p>
                        <div className="mt-4 flex gap-2">
                          <button className="rounded-full bg-dark px-4 py-2 text-xs font-semibold text-white">
                            Review case
                          </button>
                          <button className="rounded-full border border-light px-4 py-2 text-xs font-semibold text-text-muted">
                            Contact trader
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[30px] bg-dark p-6 text-white shadow-xl md:p-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                        Facilitator checklist
                      </p>
                      <h3 className="mt-2 font-display text-2xl tracking-tight uppercase">
                        Before releasing any item
                      </h3>
                    </div>
                    <Bell className="h-5 w-5 text-primary" />
                  </div>

                  <div className="mt-6 space-y-3">
                    {[
                      { text: 'Confirm both student IDs match verified accounts', icon: CheckCircle2 },
                      { text: 'Inspect item condition against listing photos and notes', icon: Search },
                      { text: 'Log handover timestamp and exchange zone', icon: Clock3 },
                      { text: 'Escalate any mismatch before release', icon: XCircle },
                    ].map((step) => {
                      const Icon = step.icon;
                      return (
                        <div key={step.text} className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/5 p-4">
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/15">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <p className="text-sm leading-6 text-white/85">{step.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}