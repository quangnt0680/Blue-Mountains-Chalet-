// ======================================================================
//  PRICES FOR GEORGIAN BAY VIEW CHALET (all amounts in CAD)
//
//  How to change prices:
//   1. On GitHub, open this file and click the pencil icon (Edit).
//   2. Change only the numbers. Keep the commas and quote marks as they are.
//   3. Click "Commit changes". The website updates in about 1 minute.
//   4. In Netlify, check Deploys says "Published". If it says "Failed",
//      there's a typo in this file; the old prices stay live until it's fixed.
//
//  weeknight = Sunday to Thursday nights.  weekend = Friday and Saturday nights.
//  Guests never see these per-night numbers, only the total for their stay.
// ======================================================================

export const PRICES = {

  // Used for any month that isn't listed under "months" below.
  default: { weeknight: 600, weekend: 1400 },

  // Price for each month. Add next year's months the same way.
  months: {
    "2026-12": { weeknight: 600, weekend: 1400 },
    "2027-01": { weeknight: 600, weekend: 1400 },
    "2027-02": { weeknight: 600, weekend: 1400 },
    "2027-03": { weeknight: 600, weekend: 1400 },
    "2027-04": { weeknight: 600, weekend: 1400 },
    "2027-05": { weeknight: 600, weekend: 1400 },
    "2027-06": { weeknight: 600, weekend: 1400 },
    "2027-07": { weeknight: 600, weekend: 1400 },
    "2027-08": { weeknight: 600, weekend: 1400 },
    "2027-09": { weeknight: 600, weekend: 1400 },
    "2027-10": { weeknight: 600, weekend: 1400 },
    "2027-11": { weeknight: 600, weekend: 1400 },
    "2027-12": { weeknight: 600, weekend: 1400 },
  },

  // Special prices for single nights (holidays, long weekends, events).
  // These replace the month price for that night. Example:
  //   "2026-12-24": 2000,
  //   "2026-12-31": 2500,
  special_nights: {
  },

  cleaning_fee: 350,   // once per stay
  pet_fee: 100,        // per pet, per stay
};
