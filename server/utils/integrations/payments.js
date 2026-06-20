// §11 Phase 3 — payment-gateway adapter (e.g. Razorpay / Stripe payment links).
// Configure with env: PAYMENT_PROVIDER, PAYMENT_API_KEY, PAYMENT_API_SECRET.
// Stub mode returns a fake link so deposit/booking flows are demoable offline.

const CONFIG = {
  provider: process.env.PAYMENT_PROVIDER, // 'razorpay' | 'stripe' | ...
  key: process.env.PAYMENT_API_KEY,
  secret: process.env.PAYMENT_API_SECRET,
};

const isConfigured = () => !!(CONFIG.provider && CONFIG.key);

// Create a payment link for an amount (in rupees). Returns { ok, url, stub }.
async function createPaymentLink({ amount, description = 'Travel booking', customer = {} } = {}) {
  const amt = Number(amount) || 0;
  if (amt <= 0) return { ok: false, error: 'Amount must be positive' };

  if (!isConfigured()) {
    const ref = `STUB-${Date.now()}`;
    console.log(`[Payments:stub] link for ₹${amt} (${description})`);
    return { ok: true, stub: true, url: `https://pay.example/stub/${ref}`, reference: ref, amount: amt };
  }

  // Real provider integration would go here (provider-specific request).
  // Left as a single integration point so only this file changes when wired.
  throw new Error(`Payment provider "${CONFIG.provider}" configured but not yet implemented`);
}

module.exports = { createPaymentLink, isConfigured };
