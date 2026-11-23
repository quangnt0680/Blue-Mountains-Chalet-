// GET /api/status
// Shows whether the booking system can reach Stripe and the Airbnb calendar.
// Never shows the keys themselves.
import { stripe, airbnbBookings, json } from "../lib/booking.mjs";

const env = (n) => (typeof Netlify !== "undefined" ? Netlify.env.get(n) : undefined) ?? process.env[n];

export default async () => {
  const out = {};
  const key = env("STRIPE_SECRET_KEY") || "";
  if (!key) out.stripe = "MISSING: STRIPE_SECRET_KEY isn't reaching the site. Add it under Environment variables and redeploy.";
  else if (!/^(sk|rk)_(test|live)_/.test(key.trim())) out.stripe = "WRONG KEY: it should start with sk_test_ or sk_live_ (not pk_).";
  else {
    try { await stripe("balance"); out.stripe = `OK (${key.includes("_live_") ? "LIVE mode" : "TEST mode"})`; }
    catch (e) { out.stripe = "ERROR: " + String(e.message).replace(/sk_[a-z]+_\S+/g, "sk_***"); }
  }
  if (!env("AIRBNB_ICAL_URL")) out.airbnb = "NOT SET: add AIRBNB_ICAL_URL (optional, but needed to block Airbnb dates).";
  else {
    try { const r = await airbnbBookings(); out.airbnb = `OK (${r.length} booked periods found)`; }
    catch (e) { out.airbnb = "ERROR: " + e.message; }
  }
  out.min_nights = env("MIN_NIGHTS") || "1 (default)";
  return json(out);
};

export const config = { path: "/api/status" };
