// §11 Phase 3 — WhatsApp Business API adapter.
// Configure with env: WHATSAPP_API_URL, WHATSAPP_TOKEN, WHATSAPP_FROM.
// When unconfigured it operates in "stub" mode (logs + returns a stub result)
// so the rest of the CRM can call it safely in development.

const CONFIG = {
  url: process.env.WHATSAPP_API_URL,
  token: process.env.WHATSAPP_TOKEN,
  from: process.env.WHATSAPP_FROM,
};

const isConfigured = () => !!(CONFIG.url && CONFIG.token);

async function sendWhatsApp(to, message) {
  if (!to) return { ok: false, error: 'No recipient' };

  if (!isConfigured()) {
    console.log(`[WhatsApp:stub] → ${to}: ${message}`);
    return { ok: true, stub: true, to, message };
  }

  // Real send via the configured WhatsApp Business API (Cloud API shape).
  const res = await fetch(CONFIG.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CONFIG.token}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return { ok: false, error: `WhatsApp API ${res.status}: ${err}` };
  }
  return { ok: true, stub: false, response: await res.json().catch(() => ({})) };
}

module.exports = { sendWhatsApp, isConfigured };
