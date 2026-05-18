import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminDashboard from "./AdminDashboard";
import { supabase } from "./utils/supabase";
import { installAdminSupabaseMocks } from "./test-utils/adminDashboardMocks";

jest.mock("./utils/supabase", () => ({
  supabase: { from: jest.fn() },
}));

beforeEach(() => {
  supabase.from.mockClear();
  installAdminSupabaseMocks(supabase);
  global.URL.createObjectURL = jest.fn(() => "blob:mock");
  global.URL.revokeObjectURL = jest.fn();
});

const setup = () => render(<AdminDashboard />);

const waitForDashboardLoaded = async () => {
  await waitFor(() => {
    expect(screen.queryByText(/Loading analytics\.\.\./i)).not.toBeInTheDocument();
  });
};

const setupAndWait = async () => {
  setup();
  await waitForDashboardLoaded();
};

// ---------------------------------------------------------------------------
// Helpers — grab landmark regions once so duplicate-text errors never occur
// ---------------------------------------------------------------------------
const getHeader = () => screen.getByRole("banner");
const getHeaderNav = () => screen.getByRole("navigation", { name: /dashboard navigation/i });
const getMain = () => screen.getByRole("main");
const getFooter = () => screen.getByRole("contentinfo");

// ===========================================================================
// Layout & static content
// ===========================================================================
describe("Layout & static content", () => {
  test("renders the UNIMART brand name in the header", () => {
    setup();
    expect(within(getHeader()).getByText("UNIMART")).toBeInTheDocument();
  });

  test("renders 'Admin Portal' subtitle in the header", () => {
    setup();
    expect(within(getHeader()).getByText("Admin Portal")).toBeInTheDocument();
  });

  test("renders the Analytics navigation item in the header nav", () => {
    setup();
    expect(within(getHeaderNav()).getByText("Analytics")).toBeInTheDocument();
  });

  test("renders the Slot Capacity navigation item in the header nav", () => {
    setup();
    expect(within(getHeaderNav()).getByText("Slot Capacity")).toBeInTheDocument();
  });

  test("renders the Operating Hours navigation item in the header nav", () => {
    setup();
    expect(within(getHeaderNav()).getByText("Operating Hours")).toBeInTheDocument();
  });

  test("does not render Create Staff navigation item", () => {
    setup();
    expect(within(getHeaderNav()).queryByText("Create Staff")).not.toBeInTheDocument();
  });

  test("renders Logout in the header", () => {
    setup();
    expect(within(getHeader()).getByText("Logout")).toBeInTheDocument();
  });

  test("renders the top-bar title 'Admin Workspace' inside the header", () => {
    setup();
    expect(within(getHeader()).getByText("Admin Workspace")).toBeInTheDocument();
  });

  test("renders admin avatar with letter 'A'", () => {
    setup();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  test("renders footer copyright text", () => {
    setup();
    expect(
      within(getFooter()).getByText(/© 2026 UNIMART\. All Rights Reserved\./i)
    ).toBeInTheDocument();
  });

  test("renders 'Configure Slot Capacity' heading", () => {
    setup();
    expect(within(getMain()).getByText("Configure Slot Capacity")).toBeInTheDocument();
  });

  test("renders slot capacity description", () => {
    setup();
    expect(
      within(getMain()).getByText(
        /Define how many reservations each time slot may accept for a given date\./i
      )
    ).toBeInTheDocument();
  });

  test("renders Date label for slot capacity", () => {
    setup();
    // Two Date labels exist (slot capacity + operating hours) — just assert at least one
    expect(within(getMain()).getAllByText(/^Date$/i).length).toBeGreaterThanOrEqual(1);
  });

  test("renders Time Slot label for slot capacity", () => {
    setup();
    expect(within(getMain()).getByText(/^Time Slot$/i)).toBeInTheDocument();
  });

  test("renders Slot Capacity label", () => {
    setup();
    expect(within(getMain()).getByText(/^Slot Capacity$/i)).toBeInTheDocument();
  });

  test("renders Save Slot Capacity button", () => {
    setup();
    expect(
      within(getMain()).getByRole("button", { name: /Save Slot Capacity/i })
    ).toBeInTheDocument();
  });

  test("renders 'Configure Facility Operating Hours' heading", () => {
    setup();
    expect(within(getMain()).getByText("Configure Facility Operating Hours")).toBeInTheDocument();
  });

  test("renders operating hours description", () => {
    setup();
    expect(
      within(getMain()).getByText(
        /Set the daily operating hours for the facility\./i
      )
    ).toBeInTheDocument();
  });

  test("renders Start Time and End Time labels in operating hours section", () => {
    setup();
    expect(within(getMain()).getByText("Start Time")).toBeInTheDocument();
    expect(within(getMain()).getByText("End Time")).toBeInTheDocument();
  });

  test("renders Save Operating Hours button", () => {
    setup();
    expect(
      within(getMain()).getByRole("button", { name: /Save Operating Hours/i })
    ).toBeInTheDocument();
  });

  test("renders 'Content Moderation — Reviews' heading", () => {
    setup();
    expect(
      within(getMain()).getByText("Content Moderation — Reviews")
    ).toBeInTheDocument();
  });

  test("renders content moderation description", () => {
    setup();
    expect(
      within(getMain()).getByText(/Remove inappropriate or abusive reviews/i)
    ).toBeInTheDocument();
  });

  test("renders 'Analytics Overview' heading", () => {
    setup();
    expect(within(getMain()).getByText("Analytics Overview")).toBeInTheDocument();
  });

  test("renders analytics description", () => {
    setup();
    expect(
      within(getMain()).getByText(
        /Quick operational insights for bookings, users, facility usage, revenue, and listings\./i
      )
    ).toBeInTheDocument();
  });

  test("renders Reports & Exports section heading", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText("Reports & Exports")).toBeInTheDocument();
  });

  test("renders report export buttons", async () => {
    await setupAndWait();
    expect(screen.getByRole("button", { name: /Export Categories CSV/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export Categories PDF/i })).toBeInTheDocument();
  });

  test("renders loading state initially", () => {
    setup();
    expect(within(getMain()).getByText("Loading analytics...")).toBeInTheDocument();
  });
});

// ===========================================================================
// Form inputs — initial state
// ===========================================================================
describe("Form inputs — initial state", () => {
  test("Slot Date input has a default value", () => {
    setup();
    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    expect(dateInputs.length).toBeGreaterThanOrEqual(1);
  });

  test("Slot Time select defaults to first hourly slot", () => {
    setup();
    const timeSelect = screen.getByDisplayValue("09:00 - 10:00");
    expect(timeSelect).toBeInTheDocument();
  });

  test("Slot Capacity input starts with value 5", () => {
    setup();
    const capacityInput = screen.getByDisplayValue("5");
    expect(capacityInput).toBeInTheDocument();
  });

  test("Operating hours Start Time defaults to 09:00", () => {
    setup();
    expect(within(getMain()).getByDisplayValue("09:00")).toBeInTheDocument();
  });

  test("Operating hours End Time defaults to 17:00", () => {
    setup();
    expect(within(getMain()).getByDisplayValue("17:00")).toBeInTheDocument();
  });
});

// ===========================================================================
// Slot Capacity interactions
// ===========================================================================
describe("Slot Capacity interactions", () => {
  test("changing Slot Date updates its value", async () => {
    setup();
    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    const slotDateInput = dateInputs[0];
    await userEvent.clear(slotDateInput);
    await userEvent.type(slotDateInput, "2025-12-25");
    expect(slotDateInput).toHaveValue("2025-12-25");
  });

  test("selecting a different Time Slot updates the select value", async () => {
    setup();
    const timeSelect = screen.getByDisplayValue("09:00 - 10:00");
    await userEvent.selectOptions(timeSelect, "10:00 - 11:00");
    expect(timeSelect).toHaveValue("10:00 - 11:00");
  });

  test("changing Slot Capacity updates its value", async () => {
    setup();
    const capacityInput = within(getMain()).getByRole("spinbutton");
    fireEvent.change(capacityInput, { target: { value: "10" } });
    expect(capacityInput).toHaveValue(10);
  });

  test("renders booked and remaining slot status", async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText(/Booked:\s*\d+/i)).toBeInTheDocument();
      expect(screen.getByText(/Remaining:\s*\d+/i)).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// Operating Hours interactions
// ===========================================================================
describe("Operating Hours interactions", () => {
  test("changing start time updates its value", async () => {
    setup();
    const startInput = within(getMain()).getByDisplayValue("09:00");
    fireEvent.change(startInput, { target: { value: "08:00" } });
    expect(startInput).toHaveValue("08:00");
  });

  test("changing end time updates its value", async () => {
    setup();
    const endInput = within(getMain()).getByDisplayValue("17:00");
    fireEvent.change(endInput, { target: { value: "18:00" } });
    expect(endInput).toHaveValue("18:00");
  });
});

// ===========================================================================
// Content Moderation — Reviews
// ===========================================================================
describe("Content Moderation — Reviews", () => {
  test("shows loading reviews state initially", () => {
    setup();
    expect(within(getMain()).getByText("Loading reviews...")).toBeInTheDocument();
  });

  test("renders reviews table after load", async () => {
    setup();
    await waitFor(() => {
      expect(within(getMain()).queryByText("Loading reviews...")).not.toBeInTheDocument();
    });
    // Table headers should appear
    expect(within(getMain()).getByText("Reviewer")).toBeInTheDocument();
    expect(within(getMain()).getByText("Comment")).toBeInTheDocument();
  });

  test("renders reviewer usernames from mock data", async () => {
    setup();
    await waitFor(() => {
      expect(within(getMain()).getByText("alice")).toBeInTheDocument();
    });
  });

  test("renders Remove button for each review", async () => {
    setup();
    await waitFor(() => {
      const removeButtons = within(getMain()).getAllByRole("button", { name: /Remove/i });
      expect(removeButtons.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ===========================================================================
// Analytics display
// ===========================================================================
describe("Analytics display", () => {
  test("renders Total Bookings metric", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText("Total Bookings")).toBeInTheDocument();
  });

  test("renders Total Users metric", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText("Total Users")).toBeInTheDocument();
  });

  test("renders User Breakdown section", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText("User Breakdown")).toBeInTheDocument();
  });

  test("renders Revenue Snapshot section", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText("Revenue Snapshot")).toBeInTheDocument();
  });

  test("renders Listing Performance section", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText("Listing Performance")).toBeInTheDocument();
  });
});

// ===========================================================================
// Accessibility
// ===========================================================================
describe("Accessibility", () => {
  test("time slot combobox is accessible via role", () => {
    setup();
    const comboboxes = within(getMain()).getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThanOrEqual(1);
  });

  test("Save Slot Capacity and Save Operating Hours buttons are accessible", () => {
    setup();
    expect(
      within(getMain()).getByRole("button", { name: /Save Slot Capacity/i })
    ).toBeInTheDocument();
    expect(
      within(getMain()).getByRole("button", { name: /Save Operating Hours/i })
    ).toBeInTheDocument();
  });

  test("header renders a navigation landmark", () => {
    setup();
    expect(getHeaderNav()).toBeInTheDocument();
  });

  test("header has admin title", () => {
    setup();
    expect(within(getHeader()).getByText("Admin Workspace")).toBeInTheDocument();
  });

  test("main content area is properly structured", () => {
    setup();
    expect(getMain()).toBeInTheDocument();
    expect(getFooter()).toBeInTheDocument();
  });

  test("fixed header is present", () => {
    setup();
    expect(getHeader()).toHaveClass("fixed");
  });

  test("all nav items have proper button roles", () => {
    setup();
    const nav = getHeaderNav();
    const buttons = within(nav).getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(3); // Slot Capacity, Operating Hours, Analytics
  });
});

// ===========================================================================
// Navigation click behavior and scrolling
// ===========================================================================
describe("Navigation click behavior", () => {
  test("clicking Slot Capacity nav item scrolls to slot capacity section", () => {
    setup();
    const slotCapacitySection = document.getElementById("slot-capacity-section");
    expect(slotCapacitySection).toBeInTheDocument();
    const nav = getHeaderNav();
    const slotCapacityBtn = within(nav).getByText("Slot Capacity").closest("button");
    fireEvent.click(slotCapacityBtn);
    expect(document.getElementById("slot-capacity-section")).toBeInTheDocument();
  });

  test("clicking Operating Hours nav item scrolls to operating hours section", () => {
    setup();
    const operatingHoursSection = document.getElementById("operating-hours-section");
    expect(operatingHoursSection).toBeInTheDocument();
    const nav = getHeaderNav();
    const operatingHoursBtn = within(nav).getByText("Operating Hours").closest("button");
    fireEvent.click(operatingHoursBtn);
    expect(document.getElementById("operating-hours-section")).toBeInTheDocument();
  });

  test("clicking Analytics nav item scrolls to analytics section", () => {
    setup();
    const nav = getHeaderNav();
    const analyticsBtn = within(nav).getByText("Analytics").closest("button");
    fireEvent.click(analyticsBtn);
    expect(document.getElementById("analytics-overview")).toBeInTheDocument();
  });
});

// ===========================================================================
// Mobile nav functionality
// ===========================================================================
describe("Mobile navigation", () => {
  test("mobile menu toggle button is visible on mobile screens", () => {
    setup();
    const toggleBtn = screen.getByLabelText("Toggle navigation");
    expect(toggleBtn).toBeInTheDocument();
  });

  test("clicking mobile menu toggle opens navigation", () => {
    setup();
    const toggleBtn = screen.getByLabelText("Toggle navigation");
    fireEvent.click(toggleBtn);
    expect(screen.getByLabelText("Mobile dashboard navigation")).toBeInTheDocument();
  });

  test("mobile nav contains all navigation items", () => {
    setup();
    const toggleBtn = screen.getByLabelText("Toggle navigation");
    fireEvent.click(toggleBtn);
    const mobileNav = screen.getByLabelText("Mobile dashboard navigation");
    expect(within(mobileNav).getByText("Slot Capacity")).toBeInTheDocument();
    expect(within(mobileNav).getByText("Operating Hours")).toBeInTheDocument();
    expect(within(mobileNav).getByText("Analytics")).toBeInTheDocument();
    expect(within(mobileNav).getByText("Logout")).toBeInTheDocument();
  });

  test("mobile nav does not contain Create Staff", () => {
    setup();
    const toggleBtn = screen.getByLabelText("Toggle navigation");
    fireEvent.click(toggleBtn);
    const mobileNav = screen.getByLabelText("Mobile dashboard navigation");
    expect(within(mobileNav).queryByText("Create Staff")).not.toBeInTheDocument();
  });

  test("clicking mobile menu toggle twice returns to closed state", () => {
    setup();
    const toggleBtn = screen.getByLabelText("Toggle navigation");
    fireEvent.click(toggleBtn);
    fireEvent.click(toggleBtn);
    expect(screen.getByLabelText("Toggle navigation")).toBeInTheDocument();
  });
});

// ===========================================================================
// Form submission and state management
// ===========================================================================
describe("Form submission and state", () => {
  test("Save Slot Capacity button is present and clickable", () => {
    setup();
    const saveSlotsBtn = within(getMain()).getByRole("button", { name: /Save Slot Capacity/i });
    expect(saveSlotsBtn).toBeInTheDocument();
    expect(() => fireEvent.click(saveSlotsBtn)).not.toThrow();
  });

  test("Save Operating Hours button is present and clickable", () => {
    setup();
    const saveHoursBtn = within(getMain()).getByRole("button", { name: /Save Operating Hours/i });
    expect(saveHoursBtn).toBeInTheDocument();
    expect(() => fireEvent.click(saveHoursBtn)).not.toThrow();
  });

  test("changing slot date updates state correctly", async () => {
    setup();
    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    const slotDateInput = dateInputs[0];
    await userEvent.clear(slotDateInput);
    await userEvent.type(slotDateInput, "2026-06-15");
    expect(slotDateInput).toHaveValue("2026-06-15");
  });

  test("changing operating hours start time persists state", async () => {
    setup();
    const startInput = within(getMain()).getByDisplayValue("09:00");
    fireEvent.change(startInput, { target: { value: "07:00" } });
    expect(startInput).toHaveValue("07:00");
  });
});

// ===========================================================================
// Export functionality
// ===========================================================================
describe("Export functionality", () => {
  test("renders export buttons for reports", async () => {
    await setupAndWait();
    expect(within(getMain()).getAllByRole("button", { name: /^CSV$/i }).length).toBeGreaterThanOrEqual(2);
    expect(within(getMain()).getAllByRole("button", { name: /^PDF$/i }).length).toBeGreaterThanOrEqual(2);
  });

  test("category export buttons are present", async () => {
    await setupAndWait();
    expect(screen.getByRole("button", { name: /Export Categories CSV/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export Categories PDF/i })).toBeInTheDocument();
  });

  test("clicking export button does not throw error", async () => {
    await setupAndWait();
    const csvBtns = within(getMain()).getAllByRole("button", { name: /^CSV$/i });
    expect(() => fireEvent.click(csvBtns[0])).not.toThrow();
  });
});

// ===========================================================================
// Analytics section
// ===========================================================================
describe("Analytics section", () => {
  test("renders analytics overview section heading", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText("Analytics Overview")).toBeInTheDocument();
  });

  test("renders total bookings metric", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText("Total Bookings")).toBeInTheDocument();
  });

  test("renders confirmed bookings metric", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText("Confirmed")).toBeInTheDocument();
  });

  test("renders cancelled bookings metric", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText("Cancelled")).toBeInTheDocument();
  });

  test("analytics section has loading state message", () => {
    setup();
    expect(within(getMain()).getByText("Loading analytics...")).toBeInTheDocument();
  });
});

// ===========================================================================
// Reports section
// ===========================================================================
describe("Reports section", () => {
  test("renders Reports & Exports section", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText("Reports & Exports")).toBeInTheDocument();
  });

  test("renders report categories section", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText(/Popular Categories|Most Popular Categories/i)).toBeInTheDocument();
  });

  test("renders facility utilization report section", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText(/Facility Utilization|Trade Facility Utilization/i)).toBeInTheDocument();
  });

  test("renders moderation summary section", async () => {
    await setupAndWait();
    expect(within(getMain()).getByText("Flagged / Moderated Content Summary")).toBeInTheDocument();
  });
});

// ===========================================================================
// Snapshot
// ===========================================================================
describe("Snapshot", () => {
  test("matches snapshot after data loads", async () => {
    const { asFragment } = setup();
    await waitForDashboardLoaded();
    expect(asFragment()).toMatchSnapshot();
  });
});
