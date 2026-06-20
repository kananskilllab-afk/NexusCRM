// §11 Phase 3 — GDS (Amadeus / Sabre) flight-search adapter.
// Configure with env: GDS_PROVIDER, GDS_API_URL, GDS_API_KEY.
// Stub mode returns deterministic mock offers so the itinerary builder works
// offline; swap in the real provider call when credentials are available.

const CONFIG = {
  provider: process.env.GDS_PROVIDER, // 'amadeus' | 'sabre'
  url: process.env.GDS_API_URL,
  key: process.env.GDS_API_KEY,
};

const isConfigured = () => !!(CONFIG.provider && CONFIG.url && CONFIG.key);

// Search flights. Returns { ok, stub, offers: [{ carrier, from, to, price_cents, depart }] }.
async function searchFlights({ from, to, date } = {}) {
  if (!from || !to) return { ok: false, error: 'from and to are required' };

  if (!isConfigured()) {
    const offers = [
      { carrier: 'AI', from, to, price_cents: 1850000, depart: date || null, cabin: 'economy' },
      { carrier: '6E', from, to, price_cents: 1420000, depart: date || null, cabin: 'economy' },
    ];
    return { ok: true, stub: true, offers };
  }

  // Real GDS call would go here.
  throw new Error(`GDS provider "${CONFIG.provider}" configured but not yet implemented`);
}

module.exports = { searchFlights, isConfigured };
