// GET /api/availability
// Booked date ranges (Airbnb + website), so the booking form can warn guests before checkout.
import { websiteBookings, airbnbBookings, isoDay, json } from "../lib/booking.mjs";

export default async () => {
  try {
    const res = await Promise.allSettled([airbnbBookings(), websiteBookings()]);
    const [air, web] = res.map((r) => (r.status === "fulfilled" ? r.value : []));
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const booked = [...air, ...web].filter((r) => r.end > today).map((r) => [isoDay(r.start), isoDay(r.end)]);
    return json({ booked });
  } catch (e) {
    console.error(e);
    return json({ booked: [], error: "unavailable" }, 503);
  }
};

export const config = { path: "/api/availability" };
