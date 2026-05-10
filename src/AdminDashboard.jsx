import { useState, useEffect } from "react";
import { supabase } from "./utils/supabase";
import { DEFAULT_TIME_SLOTS } from "./utils/bookingConstants";

const NAV_ITEMS = [
  { icon: "grid_view", label: "Dashboard" },
  { icon: "person", label: "Users", active: true },
  { icon: "list_alt", label: "Listings" },
  { icon: "bar_chart", label: "Reports" },
  { icon: "analytics", label: "Analytics" },
  { icon: "settings", label: "Settings" },
];

const BOTTOM_NAV = [
  { icon: "help_outline", label: "Support" },
  { icon: "logout", label: "Logout" },
];

const FACILITIES = [
  "North Campus Hub",
  "Library Commons Zone",
  "South Plaza Exchange",
  "Graduate Student Center",
  "West Wing Marketplace",
  "Engineering Quarter",
];

export default function AdminDashboard({ handleLogout }) {
  const [fullName, setFullName] = useState("");
  const [facility, setFacility] = useState("");
  const [slotDate, setSlotDate] = useState(new Date().toISOString().slice(0, 10));
  const [slotTime, setSlotTime] = useState(DEFAULT_TIME_SLOTS[0] || "");
  const [slotCapacity, setSlotCapacity] = useState(5);
  const [slotMessage, setSlotMessage] = useState("");
  const [slotError, setSlotError] = useState("");
  const [operatingHours, setOperatingHours] = useState([
    { day: "Monday", start: "08:00", end: "18:00" },
    { day: "Tuesday", start: "08:00", end: "18:00" },
    { day: "Wednesday", start: "08:00", end: "18:00" },
    { day: "Thursday", start: "08:00", end: "18:00" },
    { day: "Friday", start: "08:00", end: "18:00" },
    { day: "Saturday", start: "09:00", end: "17:00" },
    { day: "Sunday", start: "10:00", end: "16:00" },
  ]);
  const [hoursMessage, setHoursMessage] = useState("");
  const [hoursError, setHoursError] = useState("");
  const [analytics, setAnalytics] = useState({
    bookings: { total: 0, confirmed: 0, cancelled: 0 },
    users: { total: 0, roles: {}, newThisMonth: 0 },
    revenue: { total: 0, average: 0, methods: {} },
    listings: { total: 0, active: 0, categories: {} },
    facilityUsage: [],
  });
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const handleNavClick = (label) => {
    if (label === "Analytics") {
      document.getElementById("analytics-overview")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleSaveSlotCapacity = async () => {
    setSlotError("");
    setSlotMessage("");

    if (!slotDate || !slotTime || slotCapacity < 1) {
      setSlotError("Please choose a date, time slot, and a capacity of at least 1.");
      return;
    }

    const { error } = await supabase
      .from("facility_slots")
      .upsert([
        {
          date: slotDate,
          time_slot: slotTime,
          capacity: slotCapacity,
        },
      ]);

    if (error) {
      console.error("[AdminDashboard] slot capacity save error:", error);
      setSlotError("Failed to save slot capacity. Please try again.");
      return;
    }

    setSlotMessage("Slot capacity saved successfully.");
  };

  const handleSaveOperatingHours = async () => {
    setHoursError("");
    setHoursMessage("");

    // Validate that all hours are set
    for (const hour of operatingHours) {
      if (!hour.start || !hour.end) {
        setHoursError("Please set start and end times for all days.");
        return;
      }
    }

    const { error } = await supabase
      .from("facility_operating_hours")
      .upsert(operatingHours.map(h => ({
        day: h.day,
        start_time: h.start,
        end_time: h.end,
      })));

    if (error) {
      console.error("[AdminDashboard] operating hours save error:", error);
      setHoursError("Failed to save operating hours. Please try again.");
      return;
    }

    setHoursMessage("Operating hours saved successfully.");
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError("");

    try {
      const { data: bookings = [] } = await supabase
        .from("bookings")
        .select("date, time_slot, status, created_at");

      const bookingStats = {
        total: bookings.length,
        confirmed: bookings.filter((b) => b.status === "confirmed").length,
        cancelled: bookings.filter((b) => b.status === "cancelled").length,
      };

      const { data: users = [] } = await supabase
        .from("users")
        .select("role, created_at");

      const roles = users.reduce((acc, user) => {
        const role = user.role || "unknown";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const newThisMonth = users.filter((user) => new Date(user.created_at) >= monthStart).length;

      const userStats = {
        total: users.length,
        roles,
        newThisMonth,
      };

      const { data: facilitySlots = [] } = await supabase
        .from("facility_slots")
        .select("date, time_slot, capacity");

      const facilityUsage = facilitySlots.map((slot) => {
        const booked = bookings.filter(
          (booking) => booking.date === slot.date && booking.time_slot === slot.time_slot
        ).length;
        return {
          date: slot.date,
          time_slot: slot.time_slot,
          capacity: slot.capacity,
          booked,
          utilization: slot.capacity ? Math.round((booked / slot.capacity) * 100) : 0,
        };
      });

      let revenueStats = { total: 0, average: 0, methods: {} };
      try {
        const { data: payments = [] } = await supabase
          .from("payments")
          .select("amount, method, created_at");

        const totalRevenue = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const averageRevenue = payments.length ? totalRevenue / payments.length : 0;
        const methods = payments.reduce((acc, payment) => {
          const method = payment.method || "unknown";
          acc[method] = (acc[method] || 0) + 1;
          return acc;
        }, {});

        revenueStats = {
          total: totalRevenue,
          average: averageRevenue,
          methods,
        };
      } catch (err) {
        console.warn("[AdminDashboard] payments analytics not available:", err);
      }

      const { data: listings = [] } = await supabase
        .from("listings")
        .select("category, status");

      const listingCategories = listings.reduce((acc, listing) => {
        const category = listing.category || "Uncategorized";
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      const listingStats = {
        total: listings.length,
        active: listings.filter((listing) => listing.status === "active").length,
        categories: listingCategories,
      };

      setAnalytics({
        bookings: bookingStats,
        users: userStats,
        facilityUsage,
        revenue: revenueStats,
        listings: listingStats,
      });
    } catch (err) {
      console.error("[AdminDashboard] analytics fetch error:", err);
      setAnalyticsError("Failed to load analytics.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  return (    <section
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "'Inter', sans-serif",
        background: "#f0f0f8",
        color: "#1a1a2e",
        overflow: "hidden",
      }}
    >
      {/* Sidebar - Wider */}
      <aside
        style={{
          width: 280,
          minWidth: 280,
          background: "#ffffff",
          borderRight: "1px solid #e8e8f0",
          display: "flex",
          flexDirection: "column",
          padding: "28px 0",
        }}
      >
        {/* Logo - Larger */}
        <section style={{ padding: "0 24px 32px", borderBottom: "1px solid #e8e8f0" }}>
          <section style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <section
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M19 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-9 8H7v-2h3v2zm5 0h-3v-2h3v2zm3-4H6V8h12v2z" />
              </svg>
            </section>
            <section>
              <section style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e", lineHeight: 1.2 }}>
                Uni-Mart
              </section>
              <section
                style={{
                  fontSize: 10,
                  color: "#8b8fa8",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Admin Portal
              </section>
            </section>
          </section>
        </section>

        {/* Nav - Larger items */}
        <nav
          style={{
            flex: 1,
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {NAV_ITEMS.map(({ icon, label, active }) => (
            <section
              key={label}
              onClick={() => handleNavClick(label)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 16px",
                borderRadius: 10,
                cursor: "pointer",
                background: active ? "#eeecfd" : "transparent",
                color: active ? "#4f46e5" : "#6b7280",
                fontWeight: active ? 600 : 400,
                fontSize: 15,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                {icon}
              </span>
              {label}
            </section>
          ))}
        </nav>

        {/* Bottom nav - Larger items */}
        <section
          style={{
            padding: "16px",
            borderTop: "1px solid #e8e8f0",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {BOTTOM_NAV.map(({ icon, label }) => (
            <section
              key={label}
              onClick={label === "Logout" ? handleLogout : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 16px",
                borderRadius: 10,
                cursor: "pointer",
                color: "#6b7280",
                fontSize: 15,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                {icon}
              </span>
              {label}
            </section>
          ))}
        </section>
      </aside>

      {/* Main */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <header
          style={{
            height: 64,
            background: "#ffffff",
            borderBottom: "1px solid #e8e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
          }}
        >
          <section style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
              Create Staff Profile
            </span>
            <span style={{ color: "#d1d5db", fontSize: 14 }}>|</span>
            <span style={{ fontSize: 14, color: "#9ca3af" }}>Users</span>
            <span style={{ fontSize: 14, color: "#9ca3af" }}>›</span>
            <span style={{ fontSize: 14, color: "#4f46e5", fontWeight: 500 }}>Add Staff</span>
          </section>
          <section style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <section
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#f5f5fb",
                border: "1px solid #e8e8f0",
                borderRadius: 24,
                padding: "8px 18px",
                width: 240,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, color: "#9ca3af" }}
              >
                search
              </span>
              <span style={{ fontSize: 14, color: "#9ca3af" }}>Search resources...</span>
            </section>
            <section style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 22, color: "#6b7280", cursor: "pointer" }}
              >
                notifications
              </span>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 22, color: "#6b7280", cursor: "pointer" }}
              >
                help_outline
              </span>
              <section
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                A
              </section>
            </section>
          </section>
        </header>

        {/* Content - Expanded to fill space */}
        <main
          style={{
            flex: 1,
            overflow: "auto",
            padding: 32,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <section
            style={{
              background: "#ffffff",
              borderRadius: 16,
              border: "1px solid #e8e8f0",
              padding: "40px 48px",
              width: "100%",
              maxWidth: 760,
            }}
          >
            {/* Card header */}
            <section style={{ marginBottom: 36 }}>
              <h1
                style={{ fontSize: 24, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" }}
              >
                Trade Facilitator Staff
              </h1>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                Onboard a new facilitator to manage campus marketplace transactions and safety
                protocols.
              </p>
            </section>

            {/* Form */}
            <section style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {/* Full Name */}
              <section>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6b7280",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alexander Pierce"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: 15,
                    border: "1px solid #d1d5db",
                    borderRadius: 10,
                    outline: "none",
                    color: "#1a1a2e",
                    background: "#ffffff",
                    boxSizing: "border-box",
                  }}
                />
              </section>

              {/* Facility + Role */}
              <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <section>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Assigned Facility
                  </label>
                  <select
                    value={facility}
                    onChange={(e) => setFacility(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 15,
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      outline: "none",
                      color: facility ? "#1a1a2e" : "#9ca3af",
                      background: "#ffffff",
                      boxSizing: "border-box",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="" disabled>
                      Select a facility...
                    </option>
                    {FACILITIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </section>

                <section>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Role
                  </label>
                  <section
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      fontSize: 15,
                      border: "1px solid #c7c3fb",
                      borderRadius: 10,
                      background: "#f5f3ff",
                      color: "#4f46e5",
                      fontWeight: 500,
                    }}
                  >
                    <span>Trade Facilitator</span>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 18, color: "#4f46e5" }}
                    >
                      settings
                    </span>
                  </section>
                </section>
              </section>

              {/* Actions */}
              <section
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 16,
                  marginTop: 12,
                }}
              >
                <button
                  onClick={() => {
                    setFullName("");
                    setFacility("");
                  }}
                  style={{
                    padding: "12px 26px",
                    fontSize: 14,
                    fontWeight: 500,
                    border: "1px solid #d1d5db",
                    borderRadius: 10,
                    background: "transparent",
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  Discard
                </button>
                <button
                  style={{
                    padding: "12px 26px",
                    fontSize: 14,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 10,
                    background: "#4f46e5",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Create Staff Profile
                </button>
              </section>
            </section>

            <section style={{ marginTop: 40, paddingTop: 40, borderTop: "1px solid #e8e8f0" }}>
              <section style={{ marginBottom: 28 }}>
                <h2
                  style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" }}
                >
                  Configure Slot Capacity
                </h2>
                <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                  Define how many reservations each time slot may accept for a given date.
                </p>
              </section>

              <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <section>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 15,
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      outline: "none",
                      color: "#1a1a2e",
                      background: "#ffffff",
                      boxSizing: "border-box",
                    }}
                  />
                </section>
                <section>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Time Slot
                  </label>
                  <select
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: 15,
                      border: "1px solid #d1d5db",
                      borderRadius: 10,
                      outline: "none",
                      color: "#1a1a2e",
                      background: "#ffffff",
                      boxSizing: "border-box",
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    {DEFAULT_TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </section>
              </section>

              <section style={{ marginTop: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#6b7280",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Slot Capacity
                </label>
                <input
                  type="number"
                  min={1}
                  value={slotCapacity}
                  onChange={(e) => setSlotCapacity(Number(e.target.value))}
                  style={{
                    width: 160,
                    padding: "12px 16px",
                    fontSize: 15,
                    border: "1px solid #d1d5db",
                    borderRadius: 10,
                    outline: "none",
                    color: "#1a1a2e",
                    background: "#ffffff",
                    boxSizing: "border-box",
                  }}
                />
              </section>

              {slotError && (
                <section style={{ marginTop: 20, color: "#b91c1c", fontSize: 14 }}>
                  {slotError}
                </section>
              )}

              {slotMessage && (
                <section style={{ marginTop: 20, color: "#166534", fontSize: 14 }}>
                  {slotMessage}
                </section>
              )}

              <section style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                <button
                  onClick={handleSaveSlotCapacity}
                  style={{
                    padding: "12px 26px",
                    fontSize: 14,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 10,
                    background: "#4f46e5",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Save Slot Capacity
                </button>
              </section>
            </section>

            <section style={{ marginTop: 40, paddingTop: 40, borderTop: "1px solid #e8e8f0" }}>
              <section style={{ marginBottom: 28 }}>
                <h2
                  style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" }}
                >
                  Configure Facility Operating Hours
                </h2>
                <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                  Set the daily operating hours for the facility.
                </p>
              </section>

              <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
                {operatingHours.map((hour, index) => (
                  <section key={hour.day} style={{ border: "1px solid #e8e8f0", borderRadius: 10, padding: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", margin: "0 0 16px" }}>
                      {hour.day}
                    </h3>
                    <section style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <section>
                        <label
                          style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#6b7280",
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                        >
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={hour.start}
                          onChange={(e) => {
                            const newHours = [...operatingHours];
                            newHours[index].start = e.target.value;
                            setOperatingHours(newHours);
                          }}
                          style={{
                            padding: "8px 12px",
                            fontSize: 14,
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            outline: "none",
                            color: "#1a1a2e",
                            background: "#ffffff",
                          }}
                        />
                      </section>
                      <section>
                        <label
                          style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#6b7280",
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                        >
                          End Time
                        </label>
                        <input
                          type="time"
                          value={hour.end}
                          onChange={(e) => {
                            const newHours = [...operatingHours];
                            newHours[index].end = e.target.value;
                            setOperatingHours(newHours);
                          }}
                          style={{
                            padding: "8px 12px",
                            fontSize: 14,
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            outline: "none",
                            color: "#1a1a2e",
                            background: "#ffffff",
                          }}
                        />
                      </section>
                    </section>
                  </section>
                ))}
              </section>

              {hoursError && (
                <section style={{ marginTop: 20, color: "#b91c1c", fontSize: 14 }}>
                  {hoursError}
                </section>
              )}

              {hoursMessage && (
                <section style={{ marginTop: 20, color: "#166534", fontSize: 14 }}>
                  {hoursMessage}
                </section>
              )}

              <section style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                <button
                  onClick={handleSaveOperatingHours}
                  style={{
                    padding: "12px 26px",
                    fontSize: 14,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 10,
                    background: "#4f46e5",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Save Operating Hours
                </button>
              </section>
            </section>

            <section style={{ marginTop: 40, paddingTop: 40, borderTop: "1px solid #e8e8f0" }}>
              <section style={{ marginBottom: 28 }}>
                <h2
                  id="analytics-overview"
                  style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" }}
                >
                  Analytics Overview
                </h2>
                <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                  Quick operational insights for bookings, users, facility usage, revenue, and listings.
                </p>
              </section>

              {analyticsLoading ? (
                <section style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
                  Loading analytics...
                </section>
              ) : analyticsError ? (
                <section style={{ padding: 24, color: "#b91c1c", fontSize: 14 }}>
                  {analyticsError}
                </section>
              ) : (
                <>
                  <section
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 20,
                    }}
                  >
                    <div style={{ padding: 20, border: "1px solid #e8e8f0", borderRadius: 10 }}>
                      <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>
                        Total Bookings
                      </p>
                      <p style={{ marginTop: 12, fontSize: 24, fontWeight: 700 }}>
                        {analytics.bookings.total}
                      </p>
                    </div>
                    <div style={{ padding: 20, border: "1px solid #e8e8f0", borderRadius: 10 }}>
                      <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>
                        Confirmed
                      </p>
                      <p style={{ marginTop: 12, fontSize: 24, fontWeight: 700 }}>
                        {analytics.bookings.confirmed}
                      </p>
                    </div>
                    <div style={{ padding: 20, border: "1px solid #e8e8f0", borderRadius: 10 }}>
                      <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>
                        Cancelled
                      </p>
                      <p style={{ marginTop: 12, fontSize: 24, fontWeight: 700 }}>
                        {analytics.bookings.cancelled}
                      </p>
                    </div>
                    <div style={{ padding: 20, border: "1px solid #e8e8f0", borderRadius: 10 }}>
                      <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>
                        Total Users
                      </p>
                      <p style={{ marginTop: 12, fontSize: 24, fontWeight: 700 }}>
                        {analytics.users.total}
                      </p>
                    </div>
                  </section>

                  <section style={{ marginTop: 28 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
                      User Breakdown
                    </h3>
                    <section style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
                      {Object.entries(analytics.users.roles).map(([role, count]) => (
                        <span
                          key={role}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 999,
                            background: "#f3f4f6",
                            color: "#374151",
                            fontSize: 14,
                          }}
                        >
                          {role}: {count}
                        </span>
                      ))}
                    </section>
                  </section>

                  <section style={{ marginTop: 28 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
                      Revenue Snapshot
                    </h3>
                    <div style={{ marginTop: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 180, padding: 20, border: "1px solid #e8e8f0", borderRadius: 10 }}>
                        <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>
                          Total Revenue
                        </p>
                        <p style={{ marginTop: 12, fontSize: 24, fontWeight: 700 }}>
                          ${analytics.revenue.total.toFixed(2)}
                        </p>
                      </div>
                      <div style={{ minWidth: 180, padding: 20, border: "1px solid #e8e8f0", borderRadius: 10 }}>
                        <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>
                          Avg. Transaction
                        </p>
                        <p style={{ marginTop: 12, fontSize: 24, fontWeight: 700 }}>
                          ${analytics.revenue.average.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section style={{ marginTop: 28 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
                      Listing Performance
                    </h3>
                    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>
                      <div style={{ padding: 20, border: "1px solid #e8e8f0", borderRadius: 10 }}>
                        <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>
                          Total Listings
                        </p>
                        <p style={{ marginTop: 12, fontSize: 24, fontWeight: 700 }}>
                          {analytics.listings.total}
                        </p>
                      </div>
                      <div style={{ padding: 20, border: "1px solid #e8e8f0", borderRadius: 10 }}>
                        <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>
                          Active Listings
                        </p>
                        <p style={{ marginTop: 12, fontSize: 24, fontWeight: 700 }}>
                          {analytics.listings.active}
                        </p>
                      </div>
                    </div>
                    <section style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12 }}>
                      {Object.entries(analytics.listings.categories).map(([category, count]) => (
                        <span key={category} style={{ padding: "10px 14px", borderRadius: 999, background: "#f3f4f6", color: "#374151", fontSize: 14 }}>
                          {category}: {count}
                        </span>
                      ))}
                    </section>
                  </section>
                </>
              )}
            </section>
          </section>
        </main>

        {/* Footer */}
        <footer
          style={{
            height: 52,
            background: "#ffffff",
            borderTop: "1px solid #e8e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 32px",
            fontSize: 13,
            color: "#9ca3af",
          }}
        >
          <span>© 2024 Uni-Mart Campus Marketplace. All Rights Reserved.</span>
          <section style={{ display: "flex", gap: 24 }}>
            {["Privacy Policy", "Security Standards", "System Status"].map((item) => (
              <span key={item} style={{ cursor: "pointer" }}>
                {item}
              </span>
            ))}
          </section>
        </footer>
      </section>
    </section>
  );
}