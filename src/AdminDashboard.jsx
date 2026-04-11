import { useState } from "react";

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

export default function AdminDashboard() {
  const [fullName, setFullName] = useState("");
  const [facility, setFacility] = useState("");

  return (
    <div
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
        <div style={{ padding: "0 24px 32px", borderBottom: "1px solid #e8e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
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
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e", lineHeight: 1.2 }}>
                Uni-Mart
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#8b8fa8",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Admin Portal
              </div>
            </div>
          </div>
        </div>

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
            <div
              key={label}
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
            </div>
          ))}
        </nav>

        {/* Bottom nav - Larger items */}
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid #e8e8f0",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {BOTTOM_NAV.map(({ icon, label }) => (
            <div
              key={label}
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
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
              Create Staff Profile
            </span>
            <span style={{ color: "#d1d5db", fontSize: 14 }}>|</span>
            <span style={{ fontSize: 14, color: "#9ca3af" }}>Users</span>
            <span style={{ fontSize: 14, color: "#9ca3af" }}>›</span>
            <span style={{ fontSize: 14, color: "#4f46e5", fontWeight: 500 }}>Add Staff</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
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
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
              <div
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
              </div>
            </div>
          </div>
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
          <div
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
            <div style={{ marginBottom: 36 }}>
              <h1
                style={{ fontSize: 24, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" }}
              >
                Trade Facilitator Staff
              </h1>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                Onboard a new facilitator to manage campus marketplace transactions and safety
                protocols.
              </p>
            </div>

            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {/* Full Name */}
              <div>
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
              </div>

              {/* Facility + Role */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
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
                </div>

                <div>
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
                  <div
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
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div
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
              </div>
            </div>
          </div>
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
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy Policy", "Security Standards", "System Status"].map((item) => (
              <span key={item} style={{ cursor: "pointer" }}>
                {item}
              </span>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}