// GET /api/booking?session_id=...
// After checkout, the website asks for the booking details so it can show the guest
// a confirmation and email the owner. Only returns details for a completed checkout.
import { stripe, json } from "../lib/booking.mjs";

export default async (req) => {
  const id = new URL(req.url).searchParams.get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: "Invalid session." }, 400);
  try {
    const s = await stripe(`checkout/sessions/${id}`);
    if (s.status !== "complete") return json({ error: "Checkout not completed." }, 404);
    const m = s.metadata || {};
    return json({
      name: m.name, email: s.customer_details?.email || s.customer_email, phone: m.phone,
      checkin: m.checkin, checkout: m.checkout, nights: m.nights, guests: m.guests, pets: m.pets,
      notes: m.notes, availability: m.availability, total: (s.amount_total || 0) / 100, live: s.livemode,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Couldn't look up the booking." }, 502);
  }
};

export const config = { path: "/api/booking" };
