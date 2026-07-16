// The card scanner (and manual entry) packs multiple numbers/emails from one card into a single
// " / "-separated string (see server/src/utils/gemini.js) — e.g. a hotel's front-desk and
// reservations lines both end up in one `phone` field. Splitting it back out for display turns a
// single run-on line into one value per row, which is what "more structured" means here.
export function splitContactValues(value?: string): string[] {
  if (!value) return [];
  return value
    .split('/')
    .map((v) => v.trim())
    .filter(Boolean);
}

// State/pincode are their own fields (for Mailer Cloud's import structure) but read most
// naturally folded back into the street address for compact list/card views.
export function formatFullAddress(address?: string, state?: string, pincode?: string): string {
  return [address, state, pincode].filter(Boolean).join(', ');
}
