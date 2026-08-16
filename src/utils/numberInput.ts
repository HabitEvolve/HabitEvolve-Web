/**
 * Helpers for `<input type="number">` fields whose valid range never includes 0
 * (i.e. the field's own declared `min` is already >= 1).
 *
 * Binding such a field directly to `value={form.x}` with
 * `onChange={e => setX(Number(e.target.value))}` has a well-known bug: clearing
 * the field makes `e.target.value === ""`, and `Number("")` is `0` — so the
 * field can never actually go empty, it snaps back to showing "0" instead, and
 * a fresh digit typed right after reads as appended to that "0" until the next
 * render catches up. Using `0` in state as the "field is empty" sentinel fixes
 * this cleanly and is safe specifically because the field's own minimum
 * already excludes 0 as a real value — there's nothing legitimate `0` could
 * mean here.
 */

/** What to pass as the input's `value` — blanks the box instead of showing 0. */
export const positiveIntDisplay = (n: number): number | string => (n === 0 ? "" : n);

/** What to store from the input's `onChange` — empty stays 0 (pending), anything else floors at `floor`. */
export const parsePositiveInt = (raw: string, floor = 1): number =>
    raw === "" ? 0 : Math.max(floor, Math.round(Number(raw)) || floor);
