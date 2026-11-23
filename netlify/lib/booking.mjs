// Shared booking logic for the Netlify functions.
// Prices are always worked out here, on the server, so a guest can't change them in their browser.

export const RATES = {
  weekday: 600,   // Sunday to Thursday nights, CAD
  weekend: 1400,  // Friday and Saturday nights, CAD
  cleaning: 350,  // once per stay
  pet: 100,       // per pet
  maxGuests: 16,
  maxPets: 2,
};

const env = (name) => (typeof Netlify !== "undefined" ? Netlify.env.get(name) : undefined) ?? process.env[name];
export const MIN_NIGHTS = () => Math.max(1, parseInt(env("MIN_NIGHTS") || "1", 10));

const DAY = 86400000;

export function parseDay(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  return isNaN(d) || d.toISOString().slice(0, 10) !== s ? null : d;
}
export const isoDay = (d) => d.toISOString().slice(0, 10);

export function quote(checkin, checkout, pets = 0) {
  const a = parseDay(checkin), b = parseDay(checkout);
  if (!a || !b) return { error: "Choose valid check-in and check-out dates." };
  const nights = Math.round((b - a) / DAY);
  if (nights < 1) return { error: "Check out must be after check in." };
  if (nights < MIN_NIGHTS()) return { error: `The minimum stay is ${MIN_NIGHTS()} nights.` };
  if (nights > 30) return { error: "For stays over 30 nights, please email us." };
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  if (a < new Date(today - DAY)) return { error: "Check in can't be in the past." };
  let wk = 0, we = 0;
  for (let i = 0; i < nights; i++) {
    const day = new Date(a.getTime() + i * DAY).getUTCDay();
    day === 5 || day === 6 ? we++ : wk++;
  }
  const total = wk * RATES.weekday + we * RATES.weekend + RATES.cleaning + pets * RATES.pet;
  return { nights, wk, we, pets, total };
}

// ---------- Stripe (plain REST calls, no extra packages needed) ----------

function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") encode(v, key, out);
    else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(v));
  }
  return out;
}

export async function stripe(path, { method = "GET", params } = {}) {
  const key = env("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set in Netlify.");
  const qs = params ? encode(params).join("&") : "";
  const url = `https://api.stripe.com/v1/${path}` + (method === "GET" && qs ? `?${qs}` : "");
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: method === "GET" ? undefined : qs,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  return json;
}

// Dates held or paid through the website (holds you haven't declined, and approved bookings).
export async function websiteBookings() {
  const ranges = [];
  let starting_after;
  for (let page = 0; page < 5; page++) {
    const list = await stripe("payment_intents", { params: { limit: 100, starting_after } });
    for (const pi of list.data) {
      const m = pi.metadata || {};
      if (m.chalet_booking !== "1") continue;
      if (!["requires_capture", "succeeded", "processing"].includes(pi.status)) continue;
      const s = parseDay(m.checkin), e = parseDay(m.checkout);
      if (s && e) ranges.push({ start: s, end: e, id: pi.id, status: pi.status });
    }
    if (!list.has_more) break;
    starting_after = list.data[list.data.length - 1].id;
  }
  return ranges;
}

// ---------- Airbnb calendar ----------

export function parseICS(text) {
  const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const ranges = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") { if (cur?.start && cur?.end) ranges.push(cur); cur = null; }
    else if (cur) {
      const m = line.match(/^(DTSTART|DTEND)[^:]*:(\d{4})(\d{2})(\d{2})/);
      if (m) cur[m[1] === "DTSTART" ? "start" : "end"] = parseDay(`${m[2]}-${m[3]}-${m[4]}`);
    }
  }
  return ranges;
}

export async function airbnbBookings() {
  const url = env("AIRBNB_ICAL_URL");
  if (!url) return [];
  const res = await fetch(url, { headers: { "User-Agent": "GeorgianBayViewChalet/1.0" } });
  if (!res.ok) throw new Error("Couldn't read the Airbnb calendar.");
  return parseICS(await res.text());
}

export const overlaps = (aStart, aEnd, ranges) => ranges.some((r) => aStart < r.end && r.start < aEnd);

export function toICS(ranges) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const d = (x) => isoDay(x).replace(/-/g, "");
  const events = ranges.map((r) => [
    "BEGIN:VEVENT",
    `UID:${r.id}@georgianbayviewchalet`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d(r.start)}`,
    `DTEND;VALUE=DATE:${d(r.end)}`,
    `SUMMARY:${r.status === "succeeded" ? "Direct booking" : "Direct booking (pending approval)"}`,
    "END:VEVENT",
  ].join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Georgian Bay View Chalet//Direct bookings//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR", ""].join("\r\n");
}

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
