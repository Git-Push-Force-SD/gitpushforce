export const createChain = (resolved = { data: [], error: null }) => {
  const chain = {};
  ["select", "eq", "neq", "upsert", "insert", "update", "delete", "in", "order"].forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  chain.maybeSingle = jest.fn(() => Promise.resolve(resolved ?? {}));
  chain.then = (resolve, reject) => Promise.resolve(resolved ?? {}).then(resolve, reject);
  chain.catch = (onRejected) => Promise.resolve(resolved ?? {}).catch(onRejected);
  return chain;
};

export const today = new Date().toISOString().slice(0, 10);

export const defaultAdminTableData = {
  bookings: [
    { date: today, time_slot: "09:00 - 10:00", status: "confirmed", created_at: `${today}T10:00:00Z` },
    { date: today, time_slot: "09:00 - 10:00", status: "collected", created_at: `${today}T11:00:00Z` },
    { date: today, time_slot: "09:00 - 10:00", status: "cancelled", created_at: `${today}T12:00:00Z` },
    { id: "b1" },
    { id: "b2" },
  ],
  users: [
    { role: "student", created_at: new Date().toISOString() },
    { role: "facilitator", created_at: "2020-01-01T00:00:00Z" },
  ],
  facility_slots: [
    { date: today, time_slot: "09:00 - 10:00", capacity: 10 },
    { date: today, time_slot: "10:00 - 11:00", capacity: 5 },
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
    {
      id: "r1",
      rating: 4,
      comment: "inappropriate language here",
      created_at: `${today}T10:00:00Z`,
      status: "active",
      listing_id: "l3",
      listing: { title: "Old Textbook" },
      reviewer: { username: "alice" },
      reviewee: { username: "bob" },
    },
    {
      id: "r2",
      rating: 5,
      comment: "Great trade",
      created_at: `${today}T11:00:00Z`,
      status: "active",
      listing_id: "l4",
      listing: { title: "Laptop" },
      reviewer: { username: "charlie" },
      reviewee: { username: "diana" },
    },
  ],
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
