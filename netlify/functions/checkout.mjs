// POST /api/checkout
// Checks the dates are free, works out the price, and opens a Stripe checkout
// that HOLDS the guest's card (manual capture). Nothing is charged until the owner
// clicks "Capture" on the payment in Stripe.
import { RATES, quote, parseDay, stripe, websiteBookings, airbnbBookings, overlaps, json } from "../lib/booking.mjs";

const fmt = (s) => parseDay(s).toLocaleDateString("en-CA", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" });
const clip = (v, n) => String(v ?? "").trim().slice(0, n);

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  let b;
  try { b = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }

  const guests = parseInt(b.guests, 10);
  const pets = parseInt(b.pets || 0, 10);
  const name = clip(b.name, 100), email = clip(b.email, 200), phone = clip(b.phone, 40), notes = clip(b.notes, 450);
  if (!(guests >= 1 && guests <= RATES.maxGuests)) return json({ error: `Choose 1 to ${RATES.maxGuests} guests.` }, 400);
  if (!(pets >= 0 && pets <= RATES.maxPets)) return json({ error: "Choose up to 2 pets." }, 400);
  if (!name) return json({ error: "Add your full name so we know who's booking." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Add a valid email so we can confirm your stay." }, 400);

  const q = quote(b.checkin, b.checkout, pets);
  if (q.error) return json({ error: q.error }, 400);

  // Availability: Airbnb calendar + holds/bookings already made on this website.
  const start = parseDay(b.checkin), end = parseDay(b.checkout);
  try {
    const [air, web] = await Promise.all([airbnbBookings(), websiteBookings()]);
    if (overlaps(start, end, air) || overlaps(start, end, web))
      return json({ error: "Sorry, some of those nights are already booked. Try different dates.", unavailable: true }, 409);
  } catch (e) {
    console.error(e);
    return json({ error: "We couldn't check availability right now. Please try again in a minute." }, 503);
  }

  const line = (label, amount, quantity = 1) => ({ quantity, price_data: { currency: "cad", unit_amount: amount * 100, product_data: { name: label } } });
  const items = [];
  if (q.wk) items.push(line(`Weeknight (Sun–Thu) × ${q.wk}`, RATES.weekday, q.wk));
  if (q.we) items.push(line(`Weekend night (Fri–Sat) × ${q.we}`, RATES.weekend, q.we));
  items.push(line("Cleaning fee", RATES.cleaning));
  if (pets) items.push(line(`Pet fee × ${pets}`, RATES.pet, pets));

  const metadata = {
    chalet_booking: "1", checkin: b.checkin, checkout: b.checkout, nights: q.nights,
    guests, pets, name, phone, notes: notes || "None",
  };
  const origin = new URL(req.url).origin;
  try {
    const session = await stripe("checkout/sessions", {
      method: "POST",
      params: {
        mode: "payment",
        customer_email: email,
        line_items: items,
        payment_method_types: ["card"],
        payment_intent_data: {
          capture_method: "manual",
          description: `Georgian Bay View Chalet: ${fmt(b.checkin)} to ${fmt(b.checkout)}, ${guests} guests`,
          metadata,
        },
        metadata,
        custom_text: { submit: { message: "Your card is held, not charged. We'll approve your stay within 24 hours, and only then is it charged. If we can't host you, the hold is released." } },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${origin}/?booking=held&session_id={CHECKOUT_SESSION_ID}#book`,
        cancel_url: `${origin}/?booking=cancelled#book`,
      },
    });
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: "We couldn't open the payment page. Please try again, or email us." }, 502);
  }
};

export const config = { path: "/api/checkout" };
