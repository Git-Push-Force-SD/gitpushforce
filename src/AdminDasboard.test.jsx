import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminDashboard from "./AdminDashboard";

const setup = () => render(<AdminDashboard />);

// ---------------------------------------------------------------------------
// Helpers — grab landmark regions once so duplicate-text errors never occur
// ---------------------------------------------------------------------------
const getSidebar = () => screen.getByRole("complementary"); // <aside>
const getHeader = () => screen.getByRole("banner");         // <header>
const getMain = () => screen.getByRole("main");             // <main>
const getFooter = () => screen.getByRole("contentinfo");    // <footer>

// ===========================================================================
// Layout & static content
// ===========================================================================
describe("Layout & static content", () => {
  test("renders the Uni-Mart brand name in the sidebar", () => {
    setup();
    expect(within(getSidebar()).getByText("Uni-Mart")).toBeInTheDocument();
  });

  test("renders 'Admin Portal' subtitle in the sidebar", () => {
    setup();
    expect(within(getSidebar()).getByText("Admin Portal")).toBeInTheDocument();
  });

  test("renders all six primary navigation items inside the sidebar nav", () => {
    setup();
    const nav = within(getSidebar()).getByRole("navigation");
    ["Dashboard", "Users", "Listings", "Reports", "Analytics", "Settings"].forEach((label) => {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    });
  });

  test("renders Support and Logout in the bottom nav", () => {
    setup();
    expect(within(getSidebar()).getByText("Support")).toBeInTheDocument();
    expect(within(getSidebar()).getByText("Logout")).toBeInTheDocument();
  });

  test("renders the top-bar title 'Create Staff Profile' inside the header", () => {
    setup();
    // The header <span> contains the text; the button in <main> also has it,
    // so we scope to the banner region.
    expect(within(getHeader()).getByText("Create Staff Profile")).toBeInTheDocument();
  });

  test("renders breadcrumb 'Users' inside the header (not the nav)", () => {
    setup();
    expect(within(getHeader()).getByText("Users")).toBeInTheDocument();
  });

  test("renders breadcrumb 'Add Staff' inside the header", () => {
    setup();
    expect(within(getHeader()).getByText("Add Staff")).toBeInTheDocument();
  });

  test("renders the search placeholder text", () => {
    setup();
    expect(screen.getByText("Search resources...")).toBeInTheDocument();
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

  test("renders Create Staff Profile button inside main", () => {
    setup();
    // Scoped to main so it doesn't collide with the header span
    expect(
      within(getMain()).getByRole("button", { name: /Create Staff Profile/i })
    ).toBeInTheDocument();
  });

  test("renders footer copyright text", () => {
    setup();
    expect(
      within(getFooter()).getByText(/© 2024 Uni-Mart Campus Marketplace\. All Rights Reserved\./i)
    ).toBeInTheDocument();
  });

  test("renders footer links: Privacy Policy, Security Standards, System Status", () => {
    setup();
    const footer = getFooter();
    expect(within(footer).getByText("Privacy Policy")).toBeInTheDocument();
    expect(within(footer).getByText("Security Standards")).toBeInTheDocument();
    expect(within(footer).getByText("System Status")).toBeInTheDocument();
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
    expect(screen.getByRole("combobox")).toHaveValue("");
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
    await userEvent.selectOptions(screen.getByRole("combobox"), "Library Commons Zone");
    expect(screen.getByRole("combobox")).toHaveValue("Library Commons Zone");
  });

  test("selecting each facility option works correctly", async () => {
    setup();
    const select = screen.getByRole("combobox");
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
    const select = screen.getByRole("combobox");
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
// Create Staff Profile button
// ===========================================================================
describe("Create Staff Profile button", () => {
  test("button is present inside main", () => {
    setup();
    expect(
      within(getMain()).getByRole("button", { name: /Create Staff Profile/i })
    ).toBeInTheDocument();
  });

  test("button is enabled by default", () => {
    setup();
    expect(
      within(getMain()).getByRole("button", { name: /Create Staff Profile/i })
    ).not.toBeDisabled();
  });

  test("button is clickable without throwing", () => {
    setup();
    expect(() =>
      fireEvent.click(within(getMain()).getByRole("button", { name: /Create Staff Profile/i }))
    ).not.toThrow();
  });

  test("clicking Create Staff Profile does not reset form fields", async () => {
    setup();
    const input = screen.getByPlaceholderText(/e\.g\. Alexander Pierce/i);
    await userEvent.type(input, "Professor X");
    fireEvent.click(within(getMain()).getByRole("button", { name: /Create Staff Profile/i }));
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
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  test("both action buttons are accessible via role and name", () => {
    setup();
    expect(screen.getByRole("button", { name: /Discard/i })).toBeInTheDocument();
    expect(
      within(getMain()).getByRole("button", { name: /Create Staff Profile/i })
    ).toBeInTheDocument();
  });

  test("page renders a top-level heading for the form section", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: /Trade Facilitator Staff/i })
    ).toBeInTheDocument();
  });

  test("sidebar renders a navigation landmark", () => {
    setup();
    expect(within(getSidebar()).getByRole("navigation")).toBeInTheDocument();
  });
});

// ===========================================================================
// Snapshot
// ===========================================================================
describe("Snapshot", () => {
  test("matches snapshot on initial render", () => {
    const { asFragment } = setup();
    expect(asFragment()).toMatchSnapshot();
  });
});