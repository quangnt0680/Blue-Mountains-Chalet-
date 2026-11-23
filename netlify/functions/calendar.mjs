// GET /api/calendar.ics
// A calendar of dates booked or on hold through the website.
// Import this link into Airbnb (Calendar > Availability > Connect calendars > Import calendar)
// so Airbnb blocks those dates automatically.
import { websiteBookings, toICS } from "../lib/booking.mjs";

export default async () => {
  try {
    const ranges = await websiteBookings();
    return new Response(toICS(ranges), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return new Response("Calendar unavailable", { status: 503 });
  }
};

export const config = { path: "/api/calendar.ics" };
