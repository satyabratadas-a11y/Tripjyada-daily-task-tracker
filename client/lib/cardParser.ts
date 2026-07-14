// Turns raw OCR line data from a scanned business card into structured contact fields, using
// only pattern matching and layout signals (line position/height) — no AI model involved.
//
// Ceiling: this can't truly understand the card the way a vision model can, so name/company/title
// are educated guesses from keyword lists and font-size cues, not semantic reads. Email/phone/
// website are reliable (regex-shaped). This is why the scanner still requires a manual review step
// before saving.

export interface OcrLine {
  text: string;
  /** Line height in pixels — a stand-in for font size; bigger text is usually a logo/brand name. */
  height: number;
  /** Vertical position (top of the line) — used to recover reading order, since sparse-text OCR
   * mode doesn't guarantee lines come back top-to-bottom. */
  y: number;
}

export interface ParsedCardFields {
  name: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  address: string;
}

const JOB_TITLE_KEYWORDS =
  /\b(ceo|cto|cfo|coo|cmo|founder|co-founder|president|vice president|vp|director|manager|head|lead|engineer|designer|developer|consultant|executive|officer|owner|partner|sales|marketing|analyst|specialist|coordinator|supervisor|administrator|associate|representative|agent|advisor|architect)\b/i;

const COMPANY_KEYWORDS =
  /\b(pvt\.?\s*ltd\.?|private limited|limited|ltd\.?|llc|inc\.?|corp\.?|corporation|group|hotels?|resorts?|enterprises?|solutions?|technologies?|industries?|company|co\.?|services?|international|holdings?|ventures?|associates?|agency|studio|labs?)\b/i;

const ADDRESS_KEYWORDS =
  /\b(road|street|st\.|avenue|ave\.|marg|lane|blvd|boulevard|floor|suite|building|sector|nagar|colony)\b/i;
const CITY_STATE_ZIP = /,\s*[A-Za-z\s]+\s*[-–]\s*\d{5,6}/; // e.g. "Gangtok, Sikkim - 737101"
const TRAILING_PINCODE = /\b\d{5,6}\b\s*$/;

function isLikelyLocationTagRow(text: string): boolean {
  // Footer strips like "GANGTOK  NAMCHI  DARJEELING" — 2-5 short all-caps words, no punctuation.
  const words = text.trim().split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  return words.every((w) => /^[A-Z]{3,}$/.test(w));
}

export function extractContactPatterns(rawText: string) {
  const emailMatch = rawText.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // Global match + dedupe so a "primary / secondary" pair isn't truncated to just the first
  // number — "/" isn't in the digit-run character class, so each number comes back separately.
  const phoneCandidates = rawText.match(/\+?\d[\d\s().-]{6,}\d/g) || [];
  const phoneNumbers = [...new Set(phoneCandidates.map((p) => p.trim().replace(/\s{2,}/g, ' ')))].filter(
    (p) => (p.match(/\d/g) || []).length >= 7
  );
  const phone = phoneNumbers.join(' / ');

  const urlMatches = rawText.match(/((https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/\S*)?)/g) || [];
  const website = urlMatches.find((u) => !email.includes(u) && !u.includes('@')) || '';

  return { email, phone, phoneNumbers, website };
}

export function parseCardLines(rawLines: OcrLine[]): ParsedCardFields {
  const lines = [...rawLines].sort((a, b) => a.y - b.y).map((l, i) => ({ ...l, i }));
  const fullText = lines.map((l) => l.text).join('\n');
  const { email, phone, phoneNumbers, website } = extractContactPatterns(fullText);

  const isContactLine = (l: { text: string }) =>
    (!!email && l.text.includes(email)) || phoneNumbers.some((p) => l.text.includes(p)) || (!!website && l.text.includes(website));

  const used = new Set<number>();
  let candidates = lines.filter((l) => l.text.trim().length > 0 && !isContactLine(l));

  const addressLine = candidates.find(
    (l) => CITY_STATE_ZIP.test(l.text) || (TRAILING_PINCODE.test(l.text) && ADDRESS_KEYWORDS.test(l.text)) || ADDRESS_KEYWORDS.test(l.text)
  );
  const address = addressLine?.text.trim() || '';
  if (addressLine) used.add(addressLine.i);

  candidates = candidates.filter((l) => !used.has(l.i) && !isLikelyLocationTagRow(l.text));

  const titleLine = candidates.find((l) => JOB_TITLE_KEYWORDS.test(l.text));
  const jobTitle = titleLine?.text.trim() || '';
  if (titleLine) used.add(titleLine.i);

  const afterTitle = candidates.filter((l) => !used.has(l.i));

  let company = '';
  const companyIdx = afterTitle.findIndex((l) => COMPANY_KEYWORDS.test(l.text));
  if (companyIdx >= 0) {
    const companyLine = afterTitle[companyIdx];
    const prevLine = afterTitle[companyIdx - 1];
    // A logo is often split across two OCR lines (e.g. "YAGI" / "GROUP OF HOTELS") — if the line
    // right before the keyword match is short, treat it as the brand name and prepend it.
    const prevLooksLikeBrandPrefix = prevLine && prevLine.text.trim().split(/\s+/).length <= 3 && prevLine.text.trim().length <= 20;
    company = prevLooksLikeBrandPrefix ? `${prevLine.text.trim()} ${companyLine.text.trim()}` : companyLine.text.trim();
    used.add(companyLine.i);
    if (prevLooksLikeBrandPrefix) used.add(prevLine.i);
  } else if (afterTitle.length > 0) {
    // No recognizable company suffix — fall back to the biggest remaining text, since logos/brand
    // names are usually the most prominent thing on the card.
    const tallest = [...afterTitle].sort((a, b) => b.height - a.height)[0];
    company = tallest.text.trim();
    used.add(tallest.i);
  }

  const remaining = candidates.filter((l) => !used.has(l.i));
  const name = remaining[0]?.text.trim() || '';

  return { name, company, jobTitle, phone, email, website, address };
}
