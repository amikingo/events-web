# Cheche UI fixes made in events-web (25 November 2026), for the library owner

Two fixes were made in `components/ui/`, with the project owner's approval. Every project that shares the library should get them.

1. **`phone-input.tsx` `formatEthiopianPhone`: a pasted or autofilled international number lost digits.**
   - **What happened:** the function cut the digits to nine before removing the country code, so `+251911204412` became `251 911 204`, which then failed validation.
   - **The fix:** a leading `251` before a 7 or 9 is dropped first. An Ethiopian mobile never starts with 2, so this is always the country code. Then the leading `0` is dropped and the result is cut to nine digits.
2. **`date-time-picker.tsx`: the time could show in 24-hour form.**
   - **What happened:** it used the browser's own `<input type="time">` (and `datetime-local` on touch devices), which follows the device locale.
   - **The fix:** the time is now chosen with three of the library's own `Select`s (hour 1–12, minutes in steps of 5, AM/PM), always 12-hour. On touch devices the date still uses the native date picker.
   - **Unchanged:** the value keeps its `YYYY-MM-DDTHH:mm` shape, so callers don't change. A stored minute that isn't on the 5-minute grid stays selectable.
