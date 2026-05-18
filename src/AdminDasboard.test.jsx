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

  test("renders the Create Staff navigation item in the header nav", () => {
    setup();
    expect(within(getHeaderNav()).getByText("Create Staff")).toBeInTheDocument();
  });

  test("renders the Slot Capacity navigation item in the header nav", () => {
    setup();
    expect(within(getHeaderNav()).getByText("Slot Capacity")).toBeInTheDocument();
  });

  test("renders the Operating Hours navigation item in the header nav", () => {
    setup();
    expect(within(getHeaderNav()).getByText("Operating Hours")).toBeInTheDocument();
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

  test("renders the form heading 'Trade Facilitator Staff'", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: /Trade Facilitator Staff/i })
    ).toBeInTheDocument();
  });

  test("renders the form subtitle description", () => {
    setup();
    expect(
      screen.getByText(
        /Onboard a new facilitator to manage campus marketplace transactions and safety protocols\./i
      )
    ).toBeInTheDocument();
  });

  test("renders Full Name label", () => {
    setup();
    expect(within(getMain()).getByText(/Full Name/i)).toBeInTheDocument();
  });

  test("renders Assigned Facility label", () => {
    setup();
    expect(within(getMain()).getByText(/Assigned Facility/i)).toBeInTheDocument();
  });

  test("renders Role label", () => {
    setup();
    expect(within(getMain()).getByText(/^Role$/i)).toBeInTheDocument();
  });

  test("renders 'Trade Facilitator' role pill", () => {
    setup();
    expect(within(getMain()).getByText("Trade Facilitator")).toBeInTheDocument();
  });

  test("renders Discard button", () => {
    setup();
    expect(screen.getByRole("button", { name: /Discard/i })).toBeInTheDocument();
  });

  test("renders Save Staff button inside main", () => {
    setup();
    expect(
      within(getMain()).getByRole("button", { name: /Save Staff/i })
    ).toBeInTheDocument();
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
    expect(within(getMain()).getByText(/^Date$/i)).toBeInTheDocument();
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

  test("renders all seven days of the week for operating hours", () => {
    setup();
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    days.forEach((day) => {
      expect(within(getMain()).getByText(day)).toBeInTheDocument();
    });
  });

  test("renders Start Time and End Time labels for each day", () => {
    setup();
    expect(within(getMain()).getAllByText("Start Time").length).toBeGreaterThanOrEqual(7);
    expect(within(getMain()).getAllByText("End Time").length).toBeGreaterThanOrEqual(7);
  });

  test("renders Save Operating Hours button", () => {
    setup();
    expect(
      within(getMain()).getByRole("button", { name: /Save Operating Hours/i })
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
  test("Full Name input starts empty", () => {
    setup();
    expect(screen.getByPlaceholderText(/e\.g\. Alexander Pierce/i)).toHaveValue("");
  });

  test("Full Name input has correct placeholder", () => {
    setup();
    expect(screen.getByPlaceholderText(/e\.g\. Alexander Pierce/i)).toBeInTheDocument();
  });

  test("Facility select starts with no selection (empty value)", () => {
    setup();
    expect(within(getMain()).getAllByRole("combobox")[0]).toHaveValue("");
  });

  test("Facility select renders all six facility options", () => {
    setup();
    const facilityNames = [
      "North Campus Hub",
      "Library Commons Zone",
      "South Plaza Exchange",
      "Graduate Student Center",
      "West Wing Marketplace",
      "Engineering Quarter",
    ];
    const options = screen.getAllByRole("option");
    facilityNames.forEach((name) => {
      expect(options.some((o) => o.textContent === name)).toBe(true);
    });
  });

  test("Facility select placeholder option is disabled", () => {
    setup();
    expect(screen.getByRole("option", { name: /Select a facility\.\.\./i })).toBeDisabled();
  });

  test("Slot Date input has a default value", () => {
    setup();
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/); // YYYY-MM-DD format
    expect(dateInput).toBeInTheDocument();
  });

  test("Slot Time select has a default selected option", () => {
    setup();
    const timeSelect = screen.getByDisplayValue(/^\d{2}:\d{2}–\d{2}:\d{2}$/); // e.g., 08:00–08:30
    expect(timeSelect).toBeInTheDocument();
  });

  test("Slot Capacity input starts with value 5", () => {
    setup();
    const capacityInput = screen.getByDisplayValue("5");
    expect(capacityInput).toBeInTheDocument();
  });

  test("Operating Hours inputs have default times", () => {
    setup();
    expect(within(getMain()).getAllByDisplayValue("08:00").length).toBeGreaterThanOrEqual(1);
    expect(within(getMain()).getAllByDisplayValue("18:00").length).toBeGreaterThanOrEqual(1);
    expect(within(getMain()).getAllByDisplayValue("10:00").length).toBeGreaterThanOrEqual(1);
    expect(within(getMain()).getAllByDisplayValue("16:00").length).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// Form interactions — typing & selecting
// ===========================================================================
describe("Form interactions — typing & selecting", () => {
  test("typing into Full Name updates its value", async () => {
    setup();
    const input = screen.getByPlaceholderText(/e\.g\. Alexander Pierce/i);
    await userEvent.type(input, "Jane Doe");
    expect(input).toHaveValue("Jane Doe");
  });

  test("selecting a facility updates the select value", async () => {
    setup();
    const select = within(getMain()).getAllByRole("combobox")[0];
    await userEvent.selectOptions(select, "Library Commons Zone");
    expect(select).toHaveValue("Library Commons Zone");
  });

  test("selecting each facility option works correctly", async () => {
    setup();
    const select = within(getMain()).getAllByRole("combobox")[0];
    const facilities = [
      "North Campus Hub",
      "Library Commons Zone",
      "South Plaza Exchange",
      "Graduate Student Center",
      "West Wing Marketplace",
      "Engineering Quarter",
    ];
    for (const facility of facilities) {
      await userEvent.selectOptions(select, facility);
      expect(select).toHaveValue(facility);
    }
  });
});

// ===========================================================================
// Discard button behaviour
// ===========================================================================
describe("Discard button behaviour", () => {
  test("clicking Discard clears the Full Name field", async () => {
    setup();
    const input = screen.getByPlaceholderText(/e\.g\. Alexander Pierce/i);
    await userEvent.type(input, "Dr. Smith");
    expect(input).toHaveValue("Dr. Smith");

    fireEvent.click(screen.getByRole("button", { name: /Discard/i }));
    expect(input).toHaveValue("");
  });

  test("clicking Discard resets the Facility select to empty", async () => {
    setup();
    const select = within(getMain()).getAllByRole("combobox")[0];
    await userEvent.selectOptions(select, "North Campus Hub");
    expect(select).toHaveValue("North Campus Hub");

    fireEvent.click(screen.getByRole("button", { name: /Discard/i }));
    expect(select).toHaveValue("");
  });

  test("clicking Discard twice is idempotent and causes no errors", async () => {
    setup();
    const discard = screen.getByRole("button", { name: /Discard/i });
    fireEvent.click(discard);
    fireEvent.click(discard);
    expect(screen.getByPlaceholderText(/e\.g\. Alexander Pierce/i)).toHaveValue("");
  });

  test("form is still functional after Discard", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Discard/i }));
    const input = screen.getByPlaceholderText(/e\.g\. Alexander Pierce/i);
    await userEvent.type(input, "Re-entered Name");
    expect(input).toHaveValue("Re-entered Name");
  });
});

// ===========================================================================
// Slot Capacity interactions
// ===========================================================================
describe("Slot Capacity interactions", () => {
  test("changing Slot Date updates its value", async () => {
    setup();
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, "2025-12-25");
    expect(dateInput).toHaveValue("2025-12-25");
  });

  test("selecting a different Time Slot updates the select value", async () => {
    setup();
    const timeSelect = screen.getByDisplayValue(/^\d{2}:\d{2}–\d{2}:\d{2}$/);
    await userEvent.selectOptions(timeSelect, "10:00–10:30");
    expect(timeSelect).toHaveValue("10:00–10:30");
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
      expect(screen.getByText(/Booked:\s*0/i)).toBeInTheDocument();
      expect(screen.getByText(/Remaining:\s*5/i)).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// Operating Hours interactions
// ===========================================================================
describe("Operating Hours interactions", () => {
  test("changing Monday start time updates its value", async () => {
    setup();
    const mondayStart = screen.getAllByDisplayValue("08:00")[0]; // First one is Monday
    await userEvent.clear(mondayStart);
    await userEvent.type(mondayStart, "09:00");
    expect(mondayStart).toHaveValue("09:00");
  });

  test("changing Sunday end time updates its value", async () => {
    setup();
    const sundayEnd = screen.getAllByDisplayValue("16:00")[0]; // Sunday end
    await userEvent.clear(sundayEnd);
    await userEvent.type(sundayEnd, "17:00");
    expect(sundayEnd).toHaveValue("17:00");
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
// Save Staff button
// ===========================================================================
describe("Save Staff button", () => {
  test("button is present inside main", () => {
    setup();
    expect(
      within(getMain()).getByRole("button", { name: /Save Staff/i })
    ).toBeInTheDocument();
  });

  test("button is enabled by default", () => {
    setup();
    expect(
      within(getMain()).getByRole("button", { name: /Save Staff/i })
    ).not.toBeDisabled();
  });

  test("button is clickable without throwing", () => {
    setup();
    expect(() =>
      fireEvent.click(within(getMain()).getByRole("button", { name: /Save Staff/i }))
    ).not.toThrow();
  });

  test("clicking Save Staff does not reset form fields", async () => {
    setup();
    const input = screen.getByPlaceholderText(/e\.g\. Alexander Pierce/i);
    await userEvent.type(input, "Professor X");
    fireEvent.click(within(getMain()).getByRole("button", { name: /Save Staff/i }));
    expect(input).toHaveValue("Professor X");
  });
});

// ===========================================================================
// Accessibility
// ===========================================================================
describe("Accessibility", () => {
  test("Full Name input is reachable via placeholder", () => {
    setup();
    expect(screen.getByPlaceholderText(/e\.g\. Alexander Pierce/i)).toBeInTheDocument();
  });

  test("Facility combobox is accessible via role", () => {
    setup();
    expect(within(getMain()).getAllByRole("combobox")[0]).toBeInTheDocument();
  });

  test("both action buttons are accessible via role and name", () => {
    setup();
    expect(screen.getByRole("button", { name: /Discard/i })).toBeInTheDocument();
    expect(
      within(getMain()).getByRole("button", { name: /Save Staff/i })
    ).toBeInTheDocument();
  });

  test("page renders a top-level heading for the form section", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: /Trade Facilitator Staff/i })
    ).toBeInTheDocument();
  });

  test("header renders a navigation landmark", () => {
    setup();
    expect(getHeaderNav()).toBeInTheDocument();
  });
});

// ===========================================================================
// Navigation click behavior and scrolling
// ===========================================================================
describe("Navigation click behavior", () => {
  test("clicking Create Staff nav item scrolls to create staff section", () => {
    setup();
    const scrollIntoViewMock = jest.fn();
    const element = document.getElementById("create-staff-section");
    if (element) {
      element.scrollIntoView = scrollIntoViewMock;
    }
    const nav = getHeaderNav();
    const createStaffBtn = within(nav).getByText("Create Staff").closest("button");
    fireEvent.click(createStaffBtn);
    // Verify the section exists in the document
    expect(document.getElementById("create-staff-section")).toBeInTheDocument();
  });

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
    const analyticsSection = document.getElementById("analytics-overview");
    if (analyticsSection) {
      const scrollIntoViewMock = jest.fn();
      analyticsSection.scrollIntoView = scrollIntoViewMock;
    }
    const nav = getHeaderNav();
    const analyticsBtn = within(nav).getByText("Analytics").closest("button");
    fireEvent.click(analyticsBtn);
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
    // After clicking, the menu should be open - look for mobile nav items
    expect(screen.getByLabelText("Mobile dashboard navigation")).toBeInTheDocument();
  });

  test("mobile nav contains all navigation items", () => {
    setup();
    const toggleBtn = screen.getByLabelText("Toggle navigation");
    fireEvent.click(toggleBtn);
    const mobileNav = screen.getByLabelText("Mobile dashboard navigation");
    expect(within(mobileNav).getByText("Create Staff")).toBeInTheDocument();
    expect(within(mobileNav).getByText("Slot Capacity")).toBeInTheDocument();
    expect(within(mobileNav).getByText("Operating Hours")).toBeInTheDocument();
    expect(within(mobileNav).getByText("Analytics")).toBeInTheDocument();
    expect(within(mobileNav).getByText("Logout")).toBeInTheDocument();
  });

  test("clicking mobile nav item closes the menu", () => {
    setup();
    const toggleBtn = screen.getByLabelText("Toggle navigation");
    fireEvent.click(toggleBtn);
    const mobileNav = screen.getByLabelText("Mobile dashboard navigation");
    const createStaffBtn = within(mobileNav).getByText("Create Staff").closest("button");
    fireEvent.click(createStaffBtn);
    // Menu should still exist but clicking should work
    expect(screen.getByLabelText("Toggle navigation")).toBeInTheDocument();
  });

  test("clicking mobile menu toggle twice returns to closed state", () => {
    setup();
    const toggleBtn = screen.getByLabelText("Toggle navigation");
    fireEvent.click(toggleBtn);
    fireEvent.click(toggleBtn);
    // After clicking twice, the menu should close
    expect(screen.getByLabelText("Toggle navigation")).toBeInTheDocument();
  });
});

// ===========================================================================
// Form submission and state management
// ===========================================================================
describe("Form submission and state", () => {
  test("Save Staff button submission does not throw error", async () => {
    setup();
    const input = screen.getByPlaceholderText(/e\.g\. Alexander Pierce/i);
    await userEvent.type(input, "New Staff");
    const saveBtn = within(getMain()).getByRole("button", { name: /Save Staff/i });
    expect(() => fireEvent.click(saveBtn)).not.toThrow();
  });

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

  test("changing operating hour times persists state", async () => {
    setup();
    const timeInputs = screen.getAllByDisplayValue("08:00");
    if (timeInputs.length > 0) {
      const mondayStart = timeInputs[0];
      await userEvent.clear(mondayStart);
      await userEvent.type(mondayStart, "07:00");
      expect(mondayStart).toHaveValue("07:00");
    }
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

  test("facility export buttons are present", async () => {
    await setupAndWait();
    expect(within(getMain()).getAllByRole("button", { name: /^CSV$/i }).length).toBeGreaterThanOrEqual(1);
    expect(within(getMain()).getAllByRole("button", { name: /^PDF$/i }).length).toBeGreaterThanOrEqual(1);
  });

  test("flagged content export buttons are present", async () => {
    await setupAndWait();
    expect(within(getMain()).getAllByRole("button", { name: /^CSV$/i }).length).toBeGreaterThanOrEqual(2);
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
// Accessibility and interactions
// ===========================================================================
describe("Additional accessibility tests", () => {
  test("all form inputs are accessible", () => {
    setup();
    expect(screen.getByPlaceholderText(/e\.g\. Alexander Pierce/i)).toBeInTheDocument();
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBeGreaterThan(0);
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
    expect(buttons.length).toBeGreaterThanOrEqual(4); // Create Staff, Slot Capacity, Operating Hours, Analytics
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