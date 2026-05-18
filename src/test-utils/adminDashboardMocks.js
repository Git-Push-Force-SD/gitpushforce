export const createChain = (resolved = { data: [], error: null }) => {
  const chain = {};
  ["select", "eq", "neq", "upsert", "insert", "update"].forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  chain.then = (resolve, reject) => Promise.resolve(resolved ?? {}).then(resolve, reject);
  chain.catch = (onRejected) => Promise.resolve(resolved ?? {}).catch(onRejected);
  return chain;
};

export const today = new Date().toISOString().slice(0, 10);

export const defaultAdminTableData = {
  bookings: [
    { date: today, time_slot: "08:00–08:30", status: "confirmed", created_at: `${today}T10:00:00Z` },
    { date: today, time_slot: "08:00–08:30", status: "collected", created_at: `${today}T11:00:00Z` },
    { date: today, time_slot: "08:00–08:30", status: "cancelled", created_at: `${today}T12:00:00Z` },
    { id: "b1" },
    { id: "b2" },
  ],
  users: [
    { role: "student", created_at: new Date().toISOString() },
    { role: "facilitator", created_at: "2020-01-01T00:00:00Z" },
  ],
  facility_slots: [
    { date: today, time_slot: "08:00–08:30", capacity: 10 },
    { date: today, time_slot: "10:00–10:30", capacity: 5 },
  ],
  orders: [
    { placed_at: `${today}T08:00:00Z`, status: "completed", amount_due: 150 },
    { placed_at: `${today}T09:00:00Z`, status: "completed", amount_due: 50 },
  ],
  listings: [
    { category: "Books", status: "active", created_at: `${today}T08:00:00Z` },
    { category: "Electronics", status: "inactive", created_at: `${today}T09:00:00Z` },
    { category: null, status: "active", created_at: `${today}T10:00:00Z` },
  ],
  messages: [
    { body: "This is spam content", listing_id: "l1", conversation_id: "c1" },
    { body: "Normal hello", listing_id: "l2", conversation_id: "c2" },
  ],
  reviews: [
    { comment: "inappropriate language here", listing_id: "l3" },
    { comment: "Great trade", listing_id: "l4" },
  ],
  facility_operating_hours: [],
};

export const installAdminSupabaseMocks = (supabase, overrides = {}) => {
  const tableData = { ...defaultAdminTableData, ...overrides };

  supabase.from.mockImplementation((table) => {
    const chain = createChain({ data: tableData[table] ?? [], error: null });
    const rejectColumn = overrides.rejectOnSelect?.[table];

    if (rejectColumn) {
      chain.select = jest.fn((cols) => {
        if (cols && cols.includes(rejectColumn)) {
          return Promise.reject(new Error(`${table} select failed`));
        }
        return createChain({ data: tableData[table] ?? [], error: null });
      });
    } else if (overrides.rejectOnTable === table) {
      chain.select = jest.fn(() => Promise.reject(new Error(`${table} rejected`)));
    }

    return chain;
  });
};
