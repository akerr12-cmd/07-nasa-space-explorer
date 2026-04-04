
// NOTE: You do not need to edit this file.
// This helper handles all date input setup so script.js can stay focused on API + UI.

// APOD data starts on June 16, 1995.
// We use that as the earliest allowed date.
const earliestDate = '1995-06-16';

// Date inputs need YYYY-MM-DD, so we format today's date that way.
const today = new Date().toISOString().split('T')[0];

function setupDateInputs(startInput, endInput) {
  // Keep user selections inside valid APOD dates.
  startInput.min = earliestDate;
  startInput.max = today;
  endInput.min = earliestDate;
  endInput.max = today;

  // Default to a 9-day range (today + previous 8 days).
  // This gives enough content for the gallery without huge requests.
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 8); // minus 8 because it includes today
  startInput.value = lastWeek.toISOString().split('T')[0];
  endInput.value = today;

  // When start date changes, auto-move end date to keep the same 9-day window.
  // Also make sure end date never goes beyond today.
  startInput.addEventListener('change', () => {
    const startDate = new Date(startInput.value);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 8);
    endInput.value = endDate > new Date(today) ? today : endDate.toISOString().split('T')[0];
  });
}
