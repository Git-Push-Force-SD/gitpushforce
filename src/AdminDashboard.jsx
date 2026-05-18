import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { supabase } from "./utils/supabase";
import { DEFAULT_TIME_SLOTS } from "./utils/bookingConstants";

const NAV_ITEMS = [
  { icon: "calendar_month", label: "Slot Capacity", active: false },
  { icon: "schedule", label: "Operating Hours", active: false },
  { icon: "analytics", label: "Analytics", active: true },
];

const BOTTOM_NAV = [
  { icon: "logout", label: "Logout" },
];


function generateHourlySlots(start, end) {
  const slots = [];
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let cur = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  while (cur + 60 <= endMin) {
    slots.push(`${fmt(cur)} - ${fmt(cur + 60)}`);
    cur += 60;
  }
  return slots;
}

export default function AdminDashboard({ handleLogout }) {
  const [slotDate, setSlotDate] = useState(new Date().toISOString().slice(0, 10));
  const [slotTime, setSlotTime] = useState(DEFAULT_TIME_SLOTS[0] || "");
  const [slotCapacity, setSlotCapacity] = useState(5);
  const [slotTaken, setSlotTaken] = useState(0);
  const [slotMessage, setSlotMessage] = useState("");
  const [slotError, setSlotError] = useState("");
  const [hoursDate,  setHoursDate]  = useState(new Date().toISOString().slice(0, 10));
  const [hoursStart, setHoursStart] = useState("09:00");
  const [hoursEnd,   setHoursEnd]   = useState("17:00");
  const [hoursMessage, setHoursMessage] = useState("");
  const [hoursError, setHoursError] = useState("");
  const [slotSaving, setSlotSaving] = useState(false);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [analytics, setAnalytics] = useState({
    bookings: { total: 0, confirmed: 0, cancelled: 0 },
    users: { total: 0, roles: {}, newThisMonth: 0 },
    revenue: { total: 0, average: 0, methods: {} },
    listings: { total: 0, active: 0, categories: {} },
    facilityUsage: [],
  });
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [reports, setReports] = useState({
    categories: {},
    completedTransactionsByDate: [],
    facilityUsage: [],
    flaggedSummary: { flaggedMessagesCount: 0, flaggedReviewsCount: 0, flaggedSamples: [] },
  });
  const [reportsError, setReportsError] = useState("");
  const [reportsLoading, setReportsLoading] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [moderationReviews, setModerationReviews] = useState([]);
  const [moderationReviewsLoading, setModerationReviewsLoading] = useState(true);
  const [moderationReviewsError, setModerationReviewsError] = useState('');

  const handleNavClick = (label) => {
    if (label === "Analytics") {
      document.getElementById("analytics-overview")?.scrollIntoView({ behavior: "smooth" });
    } else if (label === "Slot Capacity") {
      document.getElementById("slot-capacity-section")?.scrollIntoView({ behavior: "smooth" });
    } else if (label === "Operating Hours") {
      document.getElementById("operating-hours-section")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const escapeCSV = (value) => {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const downloadCSV = (filename, headers, rows) => {
    const headerLine = headers.map(escapeCSV).join(",");
    const lines = rows.map((row) => headers.map((key) => escapeCSV(row[key])).join(","));
    const blob = new Blob([`${headerLine}\n${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCategoriesAsCSV = () => {
    const headers = ["category", "listings"];
    const rows = Object.entries(reports.categories).map(([category, count]) => ({ category, listings: count }));
    downloadCSV("category_report.csv", headers, rows);
  };

  const exportCategoriesAsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Most Popular Categories", 40, 50);
    doc.setFontSize(11);
    const headers = ["category", "listings"];
    const rows = Object.entries(reports.categories).map(([category, count]) => ({ category, listings: count }));
    let y = 75;
    const lineHeight = 16;
    const headerLine = headers.join(" | ");
    doc.text(headerLine, 40, y);
    y += lineHeight;
    rows.forEach((row) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      const line = `${row.category} | ${row.listings}`;
      doc.text(line, 40, y);
      y += lineHeight;
    });

    // Add bar chart
    y += 20;
    doc.setFontSize(14);
    doc.text("Category Distribution Chart", 40, y);
    y += 20;
    const chartHeight = 100;
    const barWidth = 30;
    const maxCount = Math.max(...Object.values(reports.categories));
    const categories = Object.keys(reports.categories);
    categories.forEach((category, index) => {
      const count = reports.categories[category];
      const barH = maxCount > 0 ? (count / maxCount) * chartHeight : 0;
      const x = 40 + index * (barWidth + 10);
      const barY = y + chartHeight - barH;
      doc.setFillColor(100, 100, 255);
      doc.rect(x, barY, barWidth, barH, 'F');
      doc.setFontSize(8);
      doc.text(category.substring(0, 10), x, y + chartHeight + 10);
      doc.text(count.toString(), x, barY - 5);
    });

    doc.save("category_report.pdf");
  };

  const exportFacilityUtilizationAsCSV = () => {
    const headers = ["date", "time_slot", "capacity", "booked", "utilization"];
    downloadCSV("facility_utilization.csv", headers, reports.facilityUsage);
  };

  const exportFacilityUtilizationAsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Trade Facility Utilization", 40, 50);
    doc.setFontSize(11);
    const headers = ["date", "time_slot", "capacity", "booked", "utilization"];
    let y = 75;
    const lineHeight = 16;
    const headerLine = headers.join(" | ");
    doc.text(headerLine, 40, y);
    y += lineHeight;
    reports.facilityUsage.forEach((row) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      const line = `${row.date} | ${row.time_slot} | ${row.capacity} | ${row.booked} | ${row.utilization}%`;
      doc.text(line, 40, y);
      y += lineHeight;
    });

    // Add bar chart for utilization
    y += 20;
    doc.setFontSize(14);
    doc.text("Utilization Chart", 40, y);
    y += 20;
    const chartHeight = 100;
    const barWidth = 20;
    reports.facilityUsage.slice(0, 10).forEach((slot, index) => { // Limit to 10 for space
      const util = slot.utilization;
      const barH = (util / 100) * chartHeight;
      const x = 40 + index * (barWidth + 5);
      const barY = y + chartHeight - barH;
      doc.setFillColor(255, 100, 100);
      doc.rect(x, barY, barWidth, barH, 'F');
      doc.setFontSize(6);
      doc.text(`${slot.date.slice(-5)} ${slot.time_slot}`, x, y + chartHeight + 10, { angle: 90 });
      doc.text(`${util}%`, x, barY - 5);
    });

    doc.save("facility_utilization.pdf");
  };

  const exportFlaggedSummaryAsCSV = () => {
    const headers = ["type", "detail", "reference"];
    downloadCSV("flagged_content.csv", headers, reports.flaggedSummary.flaggedSamples);
  };

  const exportFlaggedSummaryAsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Flagged Content Summary", 40, 50);
    doc.setFontSize(11);
    let y = 75;
    const lineHeight = 16;
    doc.text(`Flagged Messages: ${reports.flaggedSummary.flaggedMessagesCount}`, 40, y);
    y += lineHeight;
    doc.text(`Flagged Reviews: ${reports.flaggedSummary.flaggedReviewsCount}`, 40, y);
    y += lineHeight;
    doc.text("Samples:", 40, y);
    y += lineHeight;
    reports.flaggedSummary.flaggedSamples.forEach((sample) => {
      /* istanbul ignore next */
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.text(`${sample.type}: ${sample.detail} (${sample.reference})`, 40, y);
      y += lineHeight;
    });

    // Add simple bar chart for counts
    y += 20;
    doc.setFontSize(14);
    doc.text("Flagged Content Counts", 40, y);
    y += 20;
    const chartHeight = 50;
    const barWidth = 40;
    const msgCount = reports.flaggedSummary.flaggedMessagesCount;
    const revCount = reports.flaggedSummary.flaggedReviewsCount;
    const maxCount = Math.max(msgCount, revCount) || 1;
    // Messages bar
    const msgBarH = (msgCount / maxCount) * chartHeight;
    const msgX = 40;
    const msgBarY = y + chartHeight - msgBarH;
    doc.setFillColor(255, 200, 100);
    doc.rect(msgX, msgBarY, barWidth, msgBarH, 'F');
    doc.setFontSize(10);
    doc.text("Messages", msgX, y + chartHeight + 15);
    doc.text(msgCount.toString(), msgX, msgBarY - 5);
    // Reviews bar
    const revBarH = (revCount / maxCount) * chartHeight;
    const revX = msgX + barWidth + 20;
    const revBarY = y + chartHeight - revBarH;
    doc.setFillColor(100, 255, 100);
    doc.rect(revX, revBarY, barWidth, revBarH, 'F');
    doc.text("Reviews", revX, y + chartHeight + 15);
    doc.text(revCount.toString(), revX, revBarY - 5);

    doc.save("flagged_content.pdf");
  };

  const makeModerationSummary = (messages = [], reviews = []) => {
    const flags = ["report", "flag", "abuse", "policy", "inappropriate", "spam", "violat"];
    const flaggedMessages = messages.filter((message) =>
      flags.some((keyword) => message.body?.toLowerCase().includes(keyword))
    );
    const flaggedReviews = reviews.filter((review) =>
      flags.some((keyword) => review.comment?.toLowerCase().includes(keyword))
    );

    const flaggedSamples = [
      ...flaggedMessages.slice(0, 3).map((message) => ({
        type: "Message",
        detail: message.body,
        reference: message.listing_id || message.conversation_id || "N/A",
      })),
      ...flaggedReviews.slice(0, 3).map((review) => ({
        type: "Review",
        detail: review.comment,
        reference: review.listing_id || "N/A",
      })),
    ];

    return {
      flaggedMessagesCount: flaggedMessages.length,
      flaggedReviewsCount: flaggedReviews.length,
      flaggedSamples,
    };
  };

  const fetchSlotCountByDateTime = (bookings, slot) =>
    bookings.filter(
      (booking) => booking.date === slot.date && booking.time_slot === slot.time_slot && booking.status !== "cancelled"
    ).length;

  const fetchReports = async () => {
    setReportsLoading(true);
    setReportsError("");

    try {
      const [{ data: bookings = [] }, { data: orders = [] }, { data: listings = [] }, { data: facilitySlots = [] }, { data: messages = [] }, { data: reviews = [] }] =
        await Promise.all([
          supabase.from("bookings").select("date, time_slot, status"),
          supabase.from("orders").select("placed_at, status"),
          supabase.from("listings").select("category, created_at"),
          supabase.from("facility_slots").select("date, time_slot, capacity"),
          supabase.from("messages").select("body, listing_id, conversation_id"),
          supabase.from("reviews").select("comment, listing_id"),
        ]);

      const categoryCounts = listings.reduce((acc, listing) => {
        const category = listing.category || "Uncategorized";
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      const completedBookingDates = bookings
        .filter((booking) => booking.status === "collected")
        .reduce((acc, booking) => {
          const date = booking.date || "Unknown";
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

      const completedOrderDates = orders
        .filter((order) => order.status === "completed")
        .reduce((acc, order) => {
          const date = order.placed_at ? new Date(order.placed_at).toISOString().slice(0, 10) : "Unknown";
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

      const completedTransactionsByDate = Array.from(
        new Set([...Object.keys(completedBookingDates), ...Object.keys(completedOrderDates)])
      )
        .sort()
        .map((date) => ({
          date,
          completedBookings: completedBookingDates[date] || 0,
          completedOrders: completedOrderDates[date] || 0,
          totalCompleted: (completedBookingDates[date] || 0) + (completedOrderDates[date] || 0),
        }));

      const facilityUsage = facilitySlots
        .map((slot) => {
          const booked = fetchSlotCountByDateTime(bookings, slot);
          return {
            date: slot.date,
            time_slot: slot.time_slot,
            capacity: slot.capacity,
            booked,
            utilization: slot.capacity ? Math.round((booked / slot.capacity) * 100) : 0,
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot));

      const flaggedSummary = makeModerationSummary(messages, reviews);

      setReports({
        categories: categoryCounts,
        completedTransactionsByDate,
        facilityUsage,
        flaggedSummary,
      });
    } catch (error) {
      console.error("[AdminDashboard] reports fetch error:", error);
      setReportsError("Failed to load reports.");
    } finally {
      setReportsLoading(false);
    }
  };

  const fetchSlotStatus = async () => {
    if (!slotDate || !slotTime) return;

    try {
      const { data: slotRecords, error: slotError } = await supabase
        .from("facility_slots")
        .select("capacity")
        .eq("date", slotDate)
        .eq("time_slot", slotTime);

      if (slotError) {
        throw slotError;
      }

      if (slotRecords && slotRecords.length > 0) {
        setSlotCapacity(slotRecords[0].capacity);
      } else {
        setSlotCapacity(5);
      }

      const { data: bookings = [], error: bookingsError } = await supabase
        .from("bookings")
        .select("id")
        .eq("date", slotDate)
        .eq("time_slot", slotTime)
        .neq("status", "cancelled");

      if (bookingsError) {
        throw bookingsError;
      }

      setSlotTaken(bookings.length);
    } catch (error) {
      console.error("[AdminDashboard] fetch slot status error:", error);
    }
  };

  useEffect(() => {
    fetchSlotStatus();
  }, [slotDate, slotTime]);

  useEffect(() => {
    fetchAnalytics();
    fetchReports();
    fetchModerationReviews();
  }, []);

  const handleSaveSlotCapacity = async () => {
    setSlotError("");
    setSlotMessage("");

    if (!slotDate || !slotTime || slotCapacity < 1) {
      setSlotError("Please choose a date, time slot, and a capacity of at least 1.");
      return;
    }

    if (slotCapacity < slotTaken) {
      setSlotError(`Capacity cannot be lower than ${slotTaken} existing booking(s).`);
      return;
    }

    setSlotSaving(true);
    try {
      const { data: existing, error: checkError } = await supabase
        .from("facility_slots")
        .select("id")
        .eq("date", slotDate)
        .eq("time_slot", slotTime)
        .maybeSingle();

      if (checkError) throw checkError;

      let saveError;
      if (existing) {
        const { error } = await supabase
          .from("facility_slots")
          .update({ capacity: slotCapacity })
          .eq("date", slotDate)
          .eq("time_slot", slotTime);
        saveError = error;
      } else {
        const { error } = await supabase
          .from("facility_slots")
          .insert([{ date: slotDate, time_slot: slotTime, capacity: slotCapacity }]);
        saveError = error;
      }

      if (saveError) throw saveError;
      setSlotMessage("Slot capacity saved successfully.");
    } catch (error) {
      console.error("[AdminDashboard] slot capacity save error:", error);
      setSlotError("Failed to save slot capacity. Please try again.");
    } finally {
      setSlotSaving(false);
    }
  };

  const handleBulkUpdateCapacity = async (scope) => {
    setBulkError("");
    setBulkMessage("");

    if (slotCapacity < 1) {
      setBulkError("Capacity must be at least 1.");
      return;
    }

    if (scope === "date" && !slotDate) {
      setBulkError("Please select a date first.");
      return;
    }

    setBulkSaving(true);
    try {
      // Determine which dates to target
      let dates;
      if (scope === "date") {
        dates = [slotDate];
      } else {
        const { data: allRows, error: datesError } = await supabase
          .from("facility_slots")
          .select("date");
        if (datesError) throw datesError;
        dates = [...new Set((allRows || []).map(s => s.date))];
        if (dates.length === 0) {
          setBulkMessage("No configured dates found. Use 'All slots on [date]' to set up a specific date first.");
          return;
        }
      }

      let totalInserted = 0;
      let totalUpdated = 0;

      for (const date of dates) {
        // Find which DEFAULT_TIME_SLOTS already have a row for this date
        const { data: existing, error: fetchError } = await supabase
          .from("facility_slots")
          .select("time_slot")
          .eq("date", date)
          .in("time_slot", DEFAULT_TIME_SLOTS);
        if (fetchError) throw fetchError;

        const existingSet = new Set((existing || []).map(s => s.time_slot));
        const toInsert = DEFAULT_TIME_SLOTS.filter(ts => !existingSet.has(ts));
        const toUpdate = DEFAULT_TIME_SLOTS.filter(ts => existingSet.has(ts));

        if (toInsert.length > 0) {
          const { error } = await supabase
            .from("facility_slots")
            .insert(toInsert.map(ts => ({ date, time_slot: ts, capacity: slotCapacity })));
          if (error) throw error;
          totalInserted += toInsert.length;
        }

        if (toUpdate.length > 0) {
          const { error } = await supabase
            .from("facility_slots")
            .update({ capacity: slotCapacity })
            .eq("date", date)
            .in("time_slot", toUpdate);
          if (error) throw error;
          totalUpdated += toUpdate.length;
        }
      }

      const total = totalInserted + totalUpdated;
      setBulkMessage(
        `Capacity set to ${slotCapacity} for ${total} slot${total !== 1 ? "s" : ""} across ${dates.length} date${dates.length !== 1 ? "s" : ""} (${totalInserted} new, ${totalUpdated} updated).`
      );
      fetchSlotStatus();
    } catch (err) {
      console.error("[AdminDashboard] bulk capacity update error:", err);
      setBulkError("Failed to bulk update capacity. Please try again.");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleSaveOperatingHours = async () => {
    setHoursError("");
    setHoursMessage("");

    if (!hoursDate || !hoursStart || !hoursEnd) {
      setHoursError("Please select a date, start time, and end time.");
      return;
    }

    setHoursSaving(true);
    try {
      const timeSlots = generateHourlySlots(hoursStart, hoursEnd);

      if (timeSlots.length === 0) {
        setHoursError("No slots generated — end time must be at least 1 hour after start time.");
        setHoursSaving(false);
        return;
      }

      const allSlots = timeSlots.map(ts => ({ date: hoursDate, time_slot: ts, capacity: slotCapacity }));
      const dates = [hoursDate];

      const { data: existing, error: fetchError } = await supabase
        .from("facility_slots")
        .select("date, time_slot")
        .eq("date", hoursDate);

      if (fetchError) throw fetchError;

      const newSlotSet = new Set(allSlots.map(s => `${s.date}|${s.time_slot}`));
      const existingSet = new Set((existing || []).map(s => `${s.date}|${s.time_slot}`));

      const toInsert = allSlots.filter(s => !existingSet.has(`${s.date}|${s.time_slot}`));
      const toUpdate = allSlots.filter(s => existingSet.has(`${s.date}|${s.time_slot}`));
      const toDelete = (existing || []).filter(s => !newSlotSet.has(`${s.date}|${s.time_slot}`));

      let deleted = 0;
      let skipped = 0;

      if (toDelete.length > 0) {
        const deleteDates = [...new Set(toDelete.map(s => s.date))];
        const deleteTimeSlots = [...new Set(toDelete.map(s => s.time_slot))];

        // Single query to find which of these slots have active bookings
        const { data: activeBookings } = await supabase
          .from("bookings")
          .select("date, time_slot")
          .in("date", deleteDates)
          .in("time_slot", deleteTimeSlots)
          .neq("status", "cancelled");

        const bookedSet = new Set(
          (activeBookings || []).map(b => `${b.date}|${b.time_slot}`)
        );

        const canDelete = toDelete.filter(s => !bookedSet.has(`${s.date}|${s.time_slot}`));
        skipped = toDelete.length - canDelete.length;

        // One delete query per date using .in() for the time slots
        for (const date of deleteDates) {
          const slots = canDelete.filter(s => s.date === date).map(s => s.time_slot);
          if (slots.length === 0) continue;
          const { error } = await supabase
            .from("facility_slots")
            .delete()
            .eq("date", date)
            .in("time_slot", slots);
          if (error) throw error;
          deleted += slots.length;
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from("facility_slots").insert(toInsert);
        if (error) throw error;
      }

      for (const slot of toUpdate) {
        const { error } = await supabase
          .from("facility_slots")
          .update({ capacity: slot.capacity })
          .eq("date", slot.date)
          .eq("time_slot", slot.time_slot);
        if (error) throw error;
      }

      const parts = [];
      if (toInsert.length > 0) parts.push(`${toInsert.length} added`);
      if (toUpdate.length > 0) parts.push(`${toUpdate.length} updated`);
      if (deleted > 0) parts.push(`${deleted} removed`);
      if (skipped > 0) parts.push(`${skipped} kept (has bookings)`);
      setHoursMessage(`Operating hours saved. ${parts.join(", ") || "no changes"}.`);
    } catch (error) {
      console.error("[AdminDashboard] operating hours save error:", error);
      setHoursError("Failed to save operating hours. Please try again.");
    } finally {
      setHoursSaving(false);
    }
  };

  const fetchModerationReviews = async () => {
    setModerationReviewsLoading(true);
    setModerationReviewsError('');
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, status, listing:listing_id(title), reviewer:reviewer_id(username), reviewee:reviewee_id(username)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setModerationReviews(data || []);
    } catch (err) {
      console.error('[AdminDashboard] moderation reviews fetch error:', err);
      setModerationReviewsError('Failed to load reviews.');
    } finally {
      setModerationReviewsLoading(false);
    }
  };

  const handleRemoveReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to remove this review?')) return;
    const { error } = await supabase
      .from('reviews')
      .update({ status: 'removed' })
      .eq('id', reviewId);
    if (error) {
      alert(error.message);
      return;
    }
    setModerationReviews(prev => prev.filter(r => r.id !== reviewId));
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
        const { data: completedOrders = [] } = await supabase
          .from("orders")
          .select("amount_due")
          .eq("status", "completed");

        const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.amount_due || 0), 0);
        const averageRevenue = completedOrders.length ? totalRevenue / completedOrders.length : 0;
        const methods = {};

        revenueStats = {
          total: totalRevenue,
          average: averageRevenue,
          methods,
        };
      } catch (err) {
        console.warn("[AdminDashboard] revenue analytics not available:", err);
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

  return (
    <section className="min-h-screen bg-offwhite text-slate-900">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 lg:px-6 h-16">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-2xl bg-indigo-600 grid place-items-center text-white text-base font-bold">
              U
            </div>
            <div className="min-w-0">
              <div className="font-display text-base lg:text-lg font-semibold text-slate-900 truncate">UNIMART</div>
              <div className="text-[10px] lg:text-xs uppercase tracking-[0.18em] text-slate-500 truncate">Admin Portal</div>
            </div>
            <div className="hidden md:block h-8 w-px bg-slate-200 mx-1" aria-hidden="true" />
            <div className="hidden md:block text-sm font-semibold text-slate-900 truncate">Admin Workspace</div>
          </div>

          <nav
            className="hidden lg:flex flex-1 items-center justify-center gap-1 max-w-3xl mx-4"
            aria-label="Dashboard navigation"
          >
            {NAV_ITEMS.map(({ icon, label, active }) => (
              <button
                key={label}
                type="button"
                onClick={() => handleNavClick(label)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="material-symbols-outlined text-lg">{icon}</span>
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {BOTTOM_NAV.map(({ icon, label }) => (
              <button
                key={label}
                type="button"
                onClick={label === "Logout" ? handleLogout : undefined}
                className="hidden lg:flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-lg">{icon}</span>
                {label}
              </button>
            ))}
            <div className="hidden sm:grid w-9 h-9 rounded-full bg-indigo-600 place-items-center text-white text-sm font-semibold">
              A
            </div>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              className="lg:hidden text-slate-900 p-1"
              aria-label="Toggle navigation"
              aria-expanded={isMobileNavOpen}
            >
              <span className="material-symbols-outlined text-3xl">
                {isMobileNavOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {isMobileNavOpen && (
          <nav
            className="lg:hidden border-t border-slate-200 px-4 py-3 grid grid-cols-2 gap-2"
            aria-label="Mobile dashboard navigation"
          >
            {NAV_ITEMS.map(({ icon, label, active }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  handleNavClick(label);
                }}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-medium transition ${
                  active ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="material-symbols-outlined text-lg">{icon}</span>
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Logout
            </button>
          </nav>
        )}
      </header>

      <section className="pt-16 min-h-screen flex flex-col">
        <main
          className="flex-1 flex items-start justify-center p-4 sm:p-6 lg:p-8"
        >
          <section
            className="w-full max-w-3xl rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 lg:p-10"
          >
            <section id="slot-capacity-section">
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

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                <section style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: "#6b7280" }}>
                    Booked: {slotTaken}
                  </span>
                  <span style={{ fontSize: 14, color: "#6b7280" }}>
                    Remaining: {Math.max(slotCapacity - slotTaken, 0)}
                  </span>
                </section>
                {slotCapacity < slotTaken && (
                  <section style={{ marginTop: 8, color: "#b91c1c", fontSize: 14 }}>
                    Capacity cannot be lower than the current bookings for this slot.
                  </section>
                )}
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

              <section className="flex justify-end mt-6">
                <button
                  onClick={handleSaveSlotCapacity}
                  disabled={slotSaving}
                  className="w-full sm:w-auto"
                  style={{
                    padding: "12px 26px",
                    fontSize: 14,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 10,
                    background: slotSaving ? "#9ca3af" : "#4f46e5",
                    color: "#ffffff",
                    cursor: slotSaving ? "not-allowed" : "pointer",
                  }}
                >
                  {slotSaving ? "Saving…" : "Save Slot Capacity"}
                </button>
              </section>

              <section style={{ marginTop: 28, paddingTop: 24, borderTop: "1px dashed #e8e8f0" }}>
                <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Bulk Apply
                </p>
                <p style={{ margin: "0 0 16px", fontSize: 14, color: "#6b7280" }}>
                  Apply the capacity value above to multiple slots at once.
                </p>
                <section style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleBulkUpdateCapacity("date")}
                    disabled={bulkSaving}
                    style={{
                      padding: "10px 20px",
                      fontSize: 14,
                      fontWeight: 500,
                      border: "1px solid #4f46e5",
                      borderRadius: 10,
                      background: "#f5f3ff",
                      color: "#4f46e5",
                      cursor: bulkSaving ? "not-allowed" : "pointer",
                      opacity: bulkSaving ? 0.6 : 1,
                    }}
                  >
                    All slots on {slotDate || "selected date"}
                  </button>
                </section>
                {bulkError && (
                  <p style={{ marginTop: 12, color: "#b91c1c", fontSize: 14 }}>{bulkError}</p>
                )}
                {bulkMessage && (
                  <p style={{ marginTop: 12, color: "#166534", fontSize: 14 }}>{bulkMessage}</p>
                )}
              </section>
            </section>

            <section id="operating-hours-section" style={{ marginTop: 40, paddingTop: 40, borderTop: "1px solid #e8e8f0" }}>
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

              <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <section>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={hoursDate}
                    onChange={(e) => setHoursDate(e.target.value)}
                    style={{ width: "100%", padding: "12px 16px", fontSize: 15, border: "1px solid #d1d5db", borderRadius: 10, outline: "none", color: "#1a1a2e", background: "#ffffff", boxSizing: "border-box" }}
                  />
                </section>
                <section>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={hoursStart}
                    onChange={(e) => setHoursStart(e.target.value)}
                    style={{ width: "100%", padding: "12px 16px", fontSize: 15, border: "1px solid #d1d5db", borderRadius: 10, outline: "none", color: "#1a1a2e", background: "#ffffff", boxSizing: "border-box" }}
                  />
                </section>
                <section>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={hoursEnd}
                    onChange={(e) => setHoursEnd(e.target.value)}
                    style={{ width: "100%", padding: "12px 16px", fontSize: 15, border: "1px solid #d1d5db", borderRadius: 10, outline: "none", color: "#1a1a2e", background: "#ffffff", boxSizing: "border-box" }}
                  />
                </section>
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

              <section className="flex justify-end mt-6">
                <button
                  onClick={handleSaveOperatingHours}
                  disabled={hoursSaving}
                  className="w-full sm:w-auto"
                  style={{
                    padding: "12px 26px",
                    fontSize: 14,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 10,
                    background: hoursSaving ? "#9ca3af" : "#4f46e5",
                    color: "#ffffff",
                    cursor: hoursSaving ? "not-allowed" : "pointer",
                  }}
                >
                  {hoursSaving ? "Saving…" : "Save Operating Hours"}
                </button>
              </section>
            </section>

            <section style={{ marginTop: 40, paddingTop: 40, borderTop: "1px solid #e8e8f0" }}>
              <section style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" }}>
                  Content Moderation — Reviews
                </h2>
                <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                  Remove inappropriate or abusive reviews. Removed reviews are hidden from all users.
                </p>
              </section>

              {moderationReviewsLoading ? (
                <p style={{ color: "#6b7280", fontSize: 14 }}>Loading reviews...</p>
              ) : moderationReviewsError ? (
                <p style={{ color: "#b91c1c", fontSize: 14 }}>{moderationReviewsError}</p>
              ) : moderationReviews.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: 14 }}>No active reviews to moderate.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        {["Reviewer", "Reviewee", "Listing", "Rating", "Comment", "Date", "Actions"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "10px 8px", color: "#6b7280", fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {moderationReviews.map(review => (
                        <tr key={review.id}>
                          <td style={{ padding: "10px 8px", borderTop: "1px solid #e5e7eb" }}>{review.reviewer?.username || "—"}</td>
                          <td style={{ padding: "10px 8px", borderTop: "1px solid #e5e7eb" }}>{review.reviewee?.username || "—"}</td>
                          <td style={{ padding: "10px 8px", borderTop: "1px solid #e5e7eb" }}>{review.listing?.title || "—"}</td>
                          <td style={{ padding: "10px 8px", borderTop: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>
                            {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                          </td>
                          <td style={{ padding: "10px 8px", borderTop: "1px solid #e5e7eb", maxWidth: 240 }}>
                            {review.comment?.length > 80 ? review.comment.slice(0, 80) + "..." : review.comment || "—"}
                          </td>
                          <td style={{ padding: "10px 8px", borderTop: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>
                            {new Date(review.created_at).toLocaleDateString("en-ZA")}
                          </td>
                          <td style={{ padding: "10px 8px", borderTop: "1px solid #e5e7eb" }}>
                            <button
                              onClick={() => handleRemoveReview(review.id)}
                              style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                  <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
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
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div style={{ padding: 20, border: "1px solid #e8e8f0", borderRadius: 10 }}>
                        <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textTransform: "uppercase" }}>
                          Total Revenue
                        </p>
                        <p style={{ marginTop: 12, fontSize: 24, fontWeight: 700 }}>
                          ${analytics.revenue.total.toFixed(2)}
                        </p>
                      </div>
                      <div style={{ padding: 20, border: "1px solid #e8e8f0", borderRadius: 10 }}>
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
                    <div className="mt-4 grid grid-cols-2 gap-5">
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

                  <section style={{ marginTop: 36, padding: 28, border: "1px solid #e8e8f0", borderRadius: 16, background: "#fafafb" }}>
                    <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>
                          Reports & Exports
                        </h3>
                        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#6b7280" }}>
                          Download the latest category, facility, and moderation reports as CSV or PDF.
                        </p>
                      </div>
                      <section className="flex flex-wrap gap-3">
                        <button
                          onClick={exportCategoriesAsCSV}
                          style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#ffffff", cursor: "pointer" }}
                        >
                          Export Categories CSV
                        </button>
                        <button
                          onClick={exportCategoriesAsPDF}
                          style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #4f46e5", background: "#4f46e5", color: "#ffffff", cursor: "pointer" }}
                        >
                          Export Categories PDF
                        </button>
                      </section>
                    </section>

                    <section style={{ marginTop: 24, display: "grid", gap: 24 }}>
                      <section>
                        <h4 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
                          Most Popular Categories & Completed Transactions
                        </h4>
                        <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
                          Tracks which item categories are most listed and how many completed transactions happened each day.
                        </p>
                        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                          {reportsLoading ? (
                            <span style={{ color: "#6b7280" }}>Loading report data...</span>
                          ) : reportsError ? (
                            <span style={{ color: "#b91c1c" }}>{reportsError}</span>
                          ) : (
                            <section style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                              {Object.entries(reports.categories).map(([category, count]) => (
                                <span key={category} style={{ padding: "10px 14px", borderRadius: 999, background: "#ffffff", border: "1px solid #e5e7eb", color: "#1a1a2e", fontSize: 14 }}>
                                  {category}: {count}
                                </span>
                              ))}
                            </section>
                          )}
                        </div>
                      </section>

                      <section style={{ padding: 20, border: "1px solid #e8e8f0", borderRadius: 10, background: "#ffffff" }}>
                        <h4 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
                          Completed Transactions Over Time
                        </h4>
                        {reportsLoading ? (
                          <p style={{ color: "#6b7280" }}>Loading transactions...</p>
                        ) : reportsError ? (
                          <p style={{ color: "#b91c1c" }}>{reportsError}</p>
                        ) : reports.completedTransactionsByDate.length ? (
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                              <tr>
                                {['Date', 'Collected', 'Completed Orders', 'Total'].map((heading) => (
                                  <th key={heading} style={{ textAlign: 'left', padding: '10px 8px', color: '#6b7280', fontWeight: 600 }}>{heading}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {reports.completedTransactionsByDate.slice(0, 6).map((row) => (
                                <tr key={row.date}>
                                  <td style={{ padding: '10px 8px', borderTop: '1px solid #e5e7eb' }}>{row.date}</td>
                                  <td style={{ padding: '10px 8px', borderTop: '1px solid #e5e7eb' }}>{row.completedBookings}</td>
                                  <td style={{ padding: '10px 8px', borderTop: '1px solid #e5e7eb' }}>{row.completedOrders}</td>
                                  <td style={{ padding: '10px 8px', borderTop: '1px solid #e5e7eb' }}>{row.totalCompleted}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p style={{ color: '#6b7280', margin: 0 }}>No completed transactions found.</p>
                        )}
                      </section>

                      <section style={{ padding: 24, border: '1px solid #e8e8f0', borderRadius: 16, background: '#ffffff' }}>
                        <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>
                            Trade Facility Utilization
                          </h4>
                          <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button
                              onClick={exportFacilityUtilizationAsCSV}
                              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#ffffff', cursor: 'pointer' }}
                            >
                              CSV
                            </button>
                            <button
                              onClick={exportFacilityUtilizationAsPDF}
                              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #4f46e5', background: '#4f46e5', color: '#ffffff', cursor: 'pointer' }}
                            >
                              PDF
                            </button>
                          </section>
                        </section>
                        <div style={{ marginTop: 18 }}>
                          {reportsLoading ? (
                            <p style={{ color: '#6b7280' }}>Loading facility metrics...</p>
                          ) : reportsError ? (
                            <p style={{ color: '#b91c1c' }}>{reportsError}</p>
                          ) : reports.facilityUsage.length ? (
                            <section style={{ display: 'grid', gap: 12 }}>
                              {reports.facilityUsage.slice(0, 5).map((slot) => (
                                <div key={`${slot.date}-${slot.time_slot}`} style={{ padding: 14, borderRadius: 12, background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{slot.date} · {slot.time_slot}</span>
                                  <span style={{ fontWeight: 600 }}>{slot.booked}/{slot.capacity} ({slot.utilization}%)</span>
                                </div>
                              ))}
                            </section>
                          ) : (
                            <p style={{ color: '#6b7280' }}>No facility usage data available.</p>
                          )}
                        </div>
                      </section>

                      <section style={{ padding: 24, border: '1px solid #e8e8f0', borderRadius: 16, background: '#ffffff' }}>
                        <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>
                            Flagged / Moderated Content Summary
                          </h4>
                          <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button
                              onClick={exportFlaggedSummaryAsCSV}
                              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#ffffff', cursor: 'pointer' }}
                            >
                              CSV
                            </button>
                            <button
                              onClick={exportFlaggedSummaryAsPDF}
                              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #4f46e5', background: '#4f46e5', color: '#ffffff', cursor: 'pointer' }}
                            >
                              PDF
                            </button>
                          </section>
                        </section>
                        <div style={{ marginTop: 18 }}>
                          {reportsLoading ? (
                            <p style={{ color: '#6b7280' }}>Loading moderation insights...</p>
                          ) : reportsError ? (
                            <p style={{ color: '#b91c1c' }}>{reportsError}</p>
                          ) : (
                            <>
                              <p style={{ margin: '0 0 12px', color: '#374151' }}>
                                Flagged messages: {reports.flaggedSummary.flaggedMessagesCount}, flagged reviews: {reports.flaggedSummary.flaggedReviewsCount}
                              </p>
                              {reports.flaggedSummary.flaggedSamples.length ? (
                                <section style={{ display: 'grid', gap: 12 }}>
                                  {reports.flaggedSummary.flaggedSamples.map((item, index) => (
                                    <div key={`${item.type}-${index}`} style={{ padding: 14, borderRadius: 12, border: '1px solid #e5e7eb', background: '#f8fafc' }}>
                                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{item.type}</p>
                                      <p style={{ margin: '6px 0 0', fontSize: 13, color: '#4b5563' }}>{item.detail}</p>
                                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280' }}>Reference: {item.reference}</p>
                                    </div>
                                  ))}
                                </section>
                              ) : (
                                <p style={{ margin: 0, color: '#6b7280' }}>No flagged content detected in messages or reviews.</p>
                              )}
                            </>
                          )}
                        </div>
                      </section>
                    </section>
                  </section>
                </>
              )}
            </section>
          </section>
        </main>

        {/* Footer */}
        <footer className="h-14 bg-white border-t border-slate-200 px-6 flex items-center justify-center text-sm text-slate-500">
          <span>© 2026 UNIMART. All Rights Reserved.</span>
        </footer>
      </section>
    </section>
  );
}