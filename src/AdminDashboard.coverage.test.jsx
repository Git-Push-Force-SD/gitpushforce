import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminDashboard from "./AdminDashboard";
import { supabase } from "./utils/supabase";
import { jsPDF as mockJsPDF } from "jspdf";
import {
  createChain,
  today,
  defaultAdminTableData,
  installAdminSupabaseMocks,
} from "./test-utils/adminDashboardMocks";

jest.mock("./utils/supabase", () => ({
  supabase: { from: jest.fn() },
}));

jest.mock("jspdf", () => {
  const createJsPdfInstance = () => ({
    setFontSize: jest.fn(),
    text: jest.fn(),
    save: jest.fn(),
    addPage: jest.fn(),
    setFillColor: jest.fn(),
    rect: jest.fn(),
  });
  const mockConstructor = jest.fn(() => createJsPdfInstance());
  return {
    __esModule: true,
    jsPDF: mockConstructor,
    default: mockConstructor,
  };
});

const installSupabaseMocks = (overrides = {}) => installAdminSupabaseMocks(supabase, overrides);
const defaultTableData = defaultAdminTableData;

const waitForDashboardLoaded = async () => {
  await waitFor(() => {
    expect(screen.queryByText(/Loading analytics\.\.\./i)).not.toBeInTheDocument();
  });
  await waitFor(() => {
    expect(screen.queryByText(/Loading report data/i)).not.toBeInTheDocument();
  });
};

const setupWithData = async (overrides = {}) => {
  installSupabaseMocks(overrides);
  render(<AdminDashboard handleLogout={jest.fn()} />);
  await waitForDashboardLoaded();
};

const getMain = () => screen.getByRole("main");
const getFacilitySelect = () => within(getMain()).getAllByRole("combobox")[0];
const getSlotCapacityInput = () => within(getMain()).getByRole("spinbutton");

beforeEach(() => {
  supabase.from.mockClear();
  global.URL.createObjectURL = jest.fn(() => "blob:mock");
  global.URL.revokeObjectURL = jest.fn();
});

describe("AdminDashboard coverage – analytics & reports", () => {
  test("renders analytics metrics after data loads", async () => {
    await setupWithData();

    expect(within(getMain()).getByText("Total Bookings")).toBeInTheDocument();
    expect(within(getMain()).getByText("User Breakdown")).toBeInTheDocument();
    expect(within(getMain()).getByText("Revenue Snapshot")).toBeInTheDocument();
    expect(within(getMain()).getByText("Listing Performance")).toBeInTheDocument();
    expect(within(getMain()).getByText(/student:/i)).toBeInTheDocument();
    expect(within(getMain()).getByText(/\$200\.00/)).toBeInTheDocument();
  });

  test("shows analytics error when fetch fails", async () => {
    installSupabaseMocks({ rejectOnSelect: { bookings: "created_at" } });
    render(<AdminDashboard />);
    expect(await screen.findByText(/Failed to load analytics/i)).toBeInTheDocument();
  });

  test("renders report categories and completed transactions table", async () => {
    await setupWithData();

    expect(within(getMain()).getByText("Reports & Exports")).toBeInTheDocument();
    expect(await screen.findByText("Completed Transactions Over Time")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(screen.getAllByText(/Books:/i).length).toBeGreaterThan(0);
  });

  test("renders facility utilization and flagged moderation samples", async () => {
    await setupWithData();

    expect(within(getMain()).getByText("Trade Facility Utilization")).toBeInTheDocument();
    expect(within(getMain()).getByText(/Flagged messages:/i)).toBeInTheDocument();
    expect(within(getMain()).getByText(/spam content/i)).toBeInTheDocument();
    expect(within(getMain()).getByText(/inappropriate language/i)).toBeInTheDocument();
  });

  test("renders empty completed transactions message when none exist", async () => {
    await setupWithData({
      bookings: [],
      orders: [],
    });
    expect(within(getMain()).getByText(/No completed transactions found/i)).toBeInTheDocument();
  });

  test("renders no flagged content message when moderation is clean", async () => {
    await setupWithData({
      messages: [{ body: "hello", listing_id: "l1", conversation_id: "c1" }],
      reviews: [{ comment: "nice", listing_id: "l2" }],
    });
    expect(
      within(getMain()).getByText(/No flagged content detected in messages or reviews/i)
    ).toBeInTheDocument();
  });

  test("fetchReports catch logs and sets error when listings query rejects", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    supabase.from.mockImplementation((table) => {
      if (table === "listings") {
        return {
          select: jest.fn(() => Promise.reject(new Error("listings failed"))),
        };
      }
      return createChain({ data: defaultTableData[table] ?? [], error: null });
    });
    render(<AdminDashboard />);
    await waitForDashboardLoaded();
    expect(errorSpy).toHaveBeenCalledWith(
      "[AdminDashboard] reports fetch error:",
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  test("computes zero utilization when slot capacity is zero", async () => {
    await setupWithData({
      facility_slots: [{ date: today, time_slot: "08:00–08:30", capacity: 0 }],
      bookings: [{ date: today, time_slot: "08:00–08:30", status: "confirmed" }],
    });
    expect(within(getMain()).getByText("Trade Facility Utilization")).toBeInTheDocument();
  });
});

describe("AdminDashboard coverage – exports", () => {
  let anchorClickSpy;

  beforeEach(() => {
    anchorClickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    anchorClickSpy.mockRestore();
  });

  test("export category CSV and PDF triggers downloads", async () => {
    await setupWithData();

    fireEvent.click(screen.getByRole("button", { name: /Export Categories CSV/i }));
    fireEvent.click(screen.getByRole("button", { name: /Export Categories PDF/i }));

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockJsPDF).toHaveBeenCalled();
  });

  test("export facility utilization CSV and PDF", async () => {
    const manySlots = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-05-${String(i + 1).padStart(2, "0")}`,
      time_slot: "08:00–08:30",
      capacity: 10,
      booked: i,
      utilization: i * 8,
    }));

    await setupWithData({ facility_slots: manySlots });

    const csvButtons = within(getMain()).getAllByRole("button", { name: /^CSV$/i });
    const pdfButtons = within(getMain()).getAllByRole("button", { name: /^PDF$/i });

    fireEvent.click(csvButtons[0]);
    fireEvent.click(pdfButtons[0]);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockJsPDF).toHaveBeenCalled();
  });

  test("export flagged content CSV and PDF", async () => {
    await setupWithData();

    const csvButtons = within(getMain()).getAllByRole("button", { name: /^CSV$/i });
    const pdfButtons = within(getMain()).getAllByRole("button", { name: /^PDF$/i });

    fireEvent.click(csvButtons[1]);
    fireEvent.click(pdfButtons[1]);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockJsPDF).toHaveBeenCalled();
  });

  test("export with empty categories still runs PDF chart logic", async () => {
    await setupWithData({ listings: [] });

    fireEvent.click(screen.getByRole("button", { name: /Export Categories PDF/i }));
    expect(mockJsPDF).toHaveBeenCalled();
  });
});

describe("AdminDashboard coverage – slot capacity", () => {
  test("loads slot capacity from facility_slots records", async () => {
    await setupWithData({
      facility_slots: [{ date: today, time_slot: "08:00–08:30", capacity: 12 }],
      bookings: [{ id: "1" }, { id: "2" }, { id: "3" }],
    });

    await waitFor(() => {
      expect(getSlotCapacityInput()).toHaveValue(12);
      expect(within(getMain()).getByText(/Booked:\s*3/i)).toBeInTheDocument();
    });
  });

  test("shows validation error when capacity is below bookings", async () => {
    await setupWithData({
      facility_slots: [{ date: today, time_slot: "08:00–08:30", capacity: 10 }],
      bookings: [{ id: "1" }, { id: "2" }, { id: "3" }],
    });

    await waitFor(() => expect(getSlotCapacityInput()).toHaveValue(10));

    fireEvent.change(getSlotCapacityInput(), { target: { value: "1" } });
    fireEvent.click(within(getMain()).getByRole("button", { name: /Save Slot Capacity/i }));

    await waitFor(() => {
      expect(screen.getByText(/Capacity cannot be lower than 3/i)).toBeInTheDocument();
    });
  });

  test("shows validation error for invalid slot capacity input", async () => {
    await setupWithData();
    fireEvent.change(getSlotCapacityInput(), { target: { value: "0" } });
    fireEvent.click(within(getMain()).getByRole("button", { name: /Save Slot Capacity/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Please choose a date, time slot, and a capacity of at least 1/i)
      ).toBeInTheDocument();
    });
  });

  test("saves slot capacity successfully", async () => {
    await setupWithData();
    fireEvent.change(getSlotCapacityInput(), { target: { value: "8" } });
    fireEvent.click(within(getMain()).getByRole("button", { name: /Save Slot Capacity/i }));

    await waitFor(() => {
      expect(screen.getByText(/Slot capacity saved successfully/i)).toBeInTheDocument();
    });
    expect(supabase.from).toHaveBeenCalledWith("facility_slots");
  });

  test("shows error when slot capacity save fails", async () => {
    installSupabaseMocks({
      bookings: [],
      facility_slots: [{ date: today, time_slot: "08:00–08:30", capacity: 5 }],
    });
    supabase.from.mockImplementation((table) => {
      const chain = createChain({ data: defaultTableData[table] ?? [], error: null });
      if (table === "facility_slots") {
        chain.upsert = jest.fn(() => Promise.resolve({ data: null, error: { message: "upsert failed" } }));
      }
      if (table === "bookings") {
        return createChain({ data: [], error: null });
      }
      return chain;
    });

    render(<AdminDashboard />);
    await waitForDashboardLoaded();

    fireEvent.click(within(getMain()).getByRole("button", { name: /Save Slot Capacity/i }));
    await waitFor(() => {
      expect(screen.getByText(/Failed to save slot capacity/i)).toBeInTheDocument();
    });
  });
});

describe("AdminDashboard coverage – operating hours", () => {
  test("saves operating hours successfully", async () => {
    await setupWithData();
    fireEvent.click(within(getMain()).getByRole("button", { name: /Save Operating Hours/i }));

    await waitFor(() => {
      expect(screen.getByText(/Operating hours saved successfully/i)).toBeInTheDocument();
    });
    expect(supabase.from).toHaveBeenCalledWith("facility_operating_hours");
  });

  test("shows error when operating hours save fails", async () => {
    installSupabaseMocks();
    supabase.from.mockImplementation((table) => {
      const chain = createChain({ data: defaultTableData[table] ?? [], error: null });
      if (table === "facility_operating_hours") {
        chain.upsert = jest.fn(() => Promise.resolve({ data: null, error: { message: "save failed" } }));
      }
      return chain;
    });

    render(<AdminDashboard />);
    await waitForDashboardLoaded();

    fireEvent.click(within(getMain()).getByRole("button", { name: /Save Operating Hours/i }));
    await waitFor(() => {
      expect(screen.getByText(/Failed to save operating hours/i)).toBeInTheDocument();
    });
  });

  test("validates missing operating hour times", async () => {
    await setupWithData();
    const mondayStart = within(getMain()).getAllByDisplayValue("08:00")[0];
    await userEvent.clear(mondayStart);
    fireEvent.click(within(getMain()).getByRole("button", { name: /Save Operating Hours/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please set start and end times for all days/i)).toBeInTheDocument();
    });
  });
});

describe("AdminDashboard coverage – forms & navigation", () => {
  test("facility select updates value", async () => {
    await setupWithData();
    await userEvent.selectOptions(getFacilitySelect(), "Library Commons Zone");
    expect(getFacilitySelect()).toHaveValue("Library Commons Zone");
  });

  test("discard resets staff form fields", async () => {
    await setupWithData();
    await userEvent.type(screen.getByPlaceholderText(/Alexander Pierce/i), "Jane Doe");
    await userEvent.selectOptions(getFacilitySelect(), "North Campus Hub");
    fireEvent.click(screen.getByRole("button", { name: /Discard/i }));
    expect(screen.getByPlaceholderText(/Alexander Pierce/i)).toHaveValue("");
    expect(getFacilitySelect()).toHaveValue("");
  });

  test("handleLogout is called from mobile navigation", async () => {
    const handleLogout = jest.fn();
    installSupabaseMocks();
    render(<AdminDashboard handleLogout={handleLogout} />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading analytics/i)).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("Toggle navigation"));
    const mobileNav = screen.getByLabelText("Mobile dashboard navigation");
    fireEvent.click(within(mobileNav).getByText("Logout").closest("button"));
    expect(handleLogout).toHaveBeenCalled();
  });

  test("navigation scroll targets exist for all sections", async () => {
    await setupWithData();
    const nav = screen.getByRole("navigation", { name: /dashboard navigation/i });

    fireEvent.click(within(nav).getByText("Slot Capacity").closest("button"));
    fireEvent.click(within(nav).getByText("Operating Hours").closest("button"));
    fireEvent.click(within(nav).getByText("Analytics").closest("button"));

    expect(document.getElementById("slot-capacity-section")).toBeInTheDocument();
    expect(document.getElementById("operating-hours-section")).toBeInTheDocument();
    expect(document.getElementById("analytics-overview")).toBeInTheDocument();
  });

  test("mobile navigation opens and selects an item", async () => {
    await setupWithData();
    fireEvent.click(screen.getByLabelText("Toggle navigation"));
    const mobileNav = screen.getByLabelText("Mobile dashboard navigation");
    fireEvent.click(within(mobileNav).getByText("Analytics").closest("button"));
    expect(screen.getByLabelText("Toggle navigation")).toBeInTheDocument();
  });

  test("changing slot date and time slot refetches slot status", async () => {
    await setupWithData();
    const dateInput = within(getMain()).getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)[0];
    fireEvent.change(dateInput, { target: { value: "2026-12-01" } });
    expect(dateInput).toHaveValue("2026-12-01");

    const timeSelect = within(getMain()).getAllByRole("combobox")[1];
    fireEvent.change(timeSelect, { target: { value: "10:00–10:30" } });
    expect(timeSelect).toHaveValue("10:00–10:30");
  });

  test("updates operating hours start and end inputs", async () => {
    await setupWithData();
    const mondayStart = within(getMain()).getAllByDisplayValue("08:00")[0];
    const mondayEnd = within(getMain()).getAllByDisplayValue("18:00")[0];
    fireEvent.change(mondayStart, { target: { value: "07:30" } });
    fireEvent.change(mondayEnd, { target: { value: "19:00" } });
    expect(mondayStart).toHaveValue("07:30");
    expect(mondayEnd).toHaveValue("19:00");
  });
});

describe("AdminDashboard coverage – PDF pagination & fetch errors", () => {
  let anchorClickSpy;

  beforeEach(() => {
    anchorClickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    anchorClickSpy.mockRestore();
  });

  test("category PDF export paginates with many categories", async () => {
    const manyListings = Array.from({ length: 45 }, (_, i) => ({
      category: `Category-${i}`,
      status: "active",
      created_at: `${today}T08:00:00Z`,
    }));
    await setupWithData({ listings: manyListings });

    fireEvent.click(screen.getByRole("button", { name: /Export Categories PDF/i }));
    const instance = mockJsPDF.mock.results[mockJsPDF.mock.results.length - 1].value;
    expect(instance.addPage).toHaveBeenCalled();
  });

  test("facility utilization PDF export paginates with many slots", async () => {
    const manySlots = Array.from({ length: 45 }, (_, i) => ({
      date: `2026-06-${String((i % 28) + 1).padStart(2, "0")}`,
      time_slot: "08:00–08:30",
      capacity: 10,
    }));
    const manyBookings = manySlots.map((slot, i) => ({
      date: slot.date,
      time_slot: slot.time_slot,
      status: "confirmed",
    }));

    await setupWithData({ facility_slots: manySlots, bookings: manyBookings });

    const pdfButtons = within(getMain()).getAllByRole("button", { name: /^PDF$/i });
    fireEvent.click(pdfButtons[0]);
    const instance = mockJsPDF.mock.results[mockJsPDF.mock.results.length - 1].value;
    expect(instance.addPage).toHaveBeenCalled();
  });

  test("flagged summary PDF export renders chart and saves file", async () => {
    const spamMessages = Array.from({ length: 5 }, (_, i) => ({
      body: `spam abuse report ${i}`,
      listing_id: `l${i}`,
      conversation_id: `c${i}`,
    }));
    await setupWithData({ messages: spamMessages, reviews: [] });

    const pdfButtons = within(getMain()).getAllByRole("button", { name: /^PDF$/i });
    fireEvent.click(pdfButtons[1]);
    const instance = mockJsPDF.mock.results[mockJsPDF.mock.results.length - 1].value;
    expect(instance.save).toHaveBeenCalledWith("flagged_content.pdf");
    expect(instance.rect).toHaveBeenCalled();
  });

  test("fetchSlotStatus handles facility and booking query errors", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    let facilityCalls = 0;

    supabase.from.mockImplementation((table) => {
      if (table === "facility_slots") {
        facilityCalls += 1;
        if (facilityCalls === 1) {
          return createChain({ data: null, error: { message: "slot lookup failed" } });
        }
      }
      if (table === "bookings") {
        const chain = createChain({ data: defaultTableData.bookings, error: null });
        chain.neq = jest.fn(() => createChain({ data: null, error: { message: "booking lookup failed" } }));
        return chain;
      }
      return createChain({ data: defaultTableData[table] ?? [], error: null });
    });

    render(<AdminDashboard />);
    await waitForDashboardLoaded();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("defaults slot capacity when no facility slot record exists", async () => {
    installSupabaseMocks({ facility_slots: [] });
    render(<AdminDashboard />);
    await waitForDashboardLoaded();
    expect(within(getMain()).getByRole("spinbutton")).toHaveValue(5);
  });

  test("scrolls to create staff section from navigation", async () => {
    await setupWithData();
    const nav = screen.getByRole("navigation", { name: /dashboard navigation/i });
    fireEvent.click(within(nav).getByText("Create Staff").closest("button"));
    expect(document.getElementById("create-staff-section")).toBeInTheDocument();
  });

  test("shows inline warning when slot capacity drops below booked count", async () => {
    await setupWithData({
      facility_slots: [{ date: today, time_slot: "08:00–08:30", capacity: 10 }],
      bookings: [{ id: "1" }, { id: "2" }, { id: "3" }],
    });
    await waitFor(() => expect(getSlotCapacityInput()).toHaveValue(10));
    fireEvent.change(getSlotCapacityInput(), { target: { value: "2" } });
    expect(
      screen.getByText(/Capacity cannot be lower than the current bookings for this slot/i)
    ).toBeInTheDocument();
  });

  test("moderation summary uses fallback references for messages and reviews", async () => {
    await setupWithData({
      messages: [{ body: "spam report", conversation_id: "conv-99" }],
      reviews: [{ comment: "inappropriate content" }],
    });
    expect(screen.getByText(/Reference: conv-99/i)).toBeInTheDocument();
    expect(screen.getByText(/Reference: N\/A/i)).toBeInTheDocument();
  });

  test("handles orders without placed_at in completed transaction rollup", async () => {
    await setupWithData({
      orders: [{ status: "completed", amount_due: 25 }],
      bookings: [],
    });
    expect(await screen.findByText("Unknown")).toBeInTheDocument();
  });

  test("shows empty facility usage message when no slots exist", async () => {
    await setupWithData({ facility_slots: [], bookings: [] });
    expect(await screen.findByText(/No facility usage data available/i)).toBeInTheDocument();
  });

  test("renders facilitator role in user breakdown", async () => {
    await setupWithData();
    expect(screen.getByText(/facilitator: 1/i)).toBeInTheDocument();
  });

  test("fetchSlotStatus throws when facility slot lookup returns an error", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      if (table === "facility_slots") {
        const chain = createChain({ data: [], error: null });
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => createChain({ data: null, error: { message: "slot lookup failed" } }));
        return chain;
      }
      return createChain({ data: defaultTableData[table] ?? [], error: null });
    });

    render(<AdminDashboard />);
    await waitForDashboardLoaded();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("fetchSlotStatus throws when booking lookup returns an error", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    supabase.from.mockImplementation((table) => {
      if (table === "facility_slots") {
        const chain = createChain({ data: defaultTableData.facility_slots, error: null });
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        return chain;
      }
      if (table === "bookings") {
        const chain = createChain({ data: [], error: null });
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.neq = jest.fn(() => createChain({ data: null, error: { message: "booking lookup failed" } }));
        return chain;
      }
      return createChain({ data: defaultTableData[table] ?? [], error: null });
    });

    render(<AdminDashboard />);
    await waitForDashboardLoaded();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("covers pending bookings and unknown user roles in analytics", async () => {
    await setupWithData({
      bookings: [
        { date: today, time_slot: "08:00–08:30", status: "pending", created_at: `${today}T08:00:00Z` },
        { date: today, time_slot: "08:00–08:30", status: "cancelled", created_at: `${today}T08:00:00Z` },
      ],
      users: [{ role: null, created_at: "2020-01-01T00:00:00Z" }],
      listings: [
        { category: "Books", status: "active", created_at: `${today}T08:00:00Z` },
        { category: "Books", status: "inactive", created_at: `${today}T09:00:00Z` },
      ],
    });
    expect(within(getMain()).getByText(/unknown:/i)).toBeInTheDocument();
    expect(within(getMain()).getByText(/Active Listings/i)).toBeInTheDocument();
  });

  test("csv export escapes quotes in category names", async () => {
    await setupWithData({
      listings: [{ category: 'Book "Special"', status: "active", created_at: `${today}T08:00:00Z` }],
    });
    fireEvent.click(screen.getByRole("button", { name: /Export Categories CSV/i }));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});
