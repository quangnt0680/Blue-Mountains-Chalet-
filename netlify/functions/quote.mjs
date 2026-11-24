// GET /api/quote?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&pets=0
// Returns the total for the dates without revealing nightly rates.
import { RATES, quote, json } from "../lib/booking.mjs";

export default async (req) => {
  const p = new URL(req.url).searchParams;
  const pets = parseInt(p.get("pets") || "0", 10);
  if (!(pets >= 0 && pets <= RATES.maxPets)) return json({ error: "Choose up to 2 pets." }, 400);
  const q = quote(p.get("checkin"), p.get("checkout"), pets);
  if (q.error) return json({ error: q.error }, 400);
  return json({ nights: q.nights, stay: q.stay, cleaning: q.cleaning, pets, petFee: q.petFee, total: q.total });
};

export const config = { path: "/api/quote" };
