/**
 * seeders/seed.js
 * Inserts realistic sample data for all 23 VoyageCRM collections.
 *
 * Usage:
 *   MONGODB_URI=mongodb://localhost:27017/travel_crm node seeders/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const {
  Tenant, User, AuditLog, TagDefinition, Contact, ContactTag,
  ContactRelationship, PipelineStage, Activity, Notification,
  EmailTemplate, EmailSend, Quote, Booking, BookingPassenger,
  BookingSegment, ItineraryVersion, Supplier, SupplierContract,
  FinancialEvent, PaymentSchedule, Commission, Document,
} = require('../models');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_crm';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  // ── Wipe existing data ──────────────────────────────────────────────────────
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  console.log('🗑  Cleared all collections');

  // ── 1. Tenants ──────────────────────────────────────────────────────────────
  const [tenant] = await Tenant.insertMany([
    {
      name: 'Voyage Elite Travel',
      plan: 'enterprise',
      settings: { currency: 'INR', timezone: 'Asia/Kolkata', logo_url: '' },
    },
  ]);
  console.log('✅ Tenants seeded');

  // ── 2. Users ─────────────────────────────────────────────────────────────────
  const [adminUser, agentUser, managerUser] = await User.insertMany([
    {
      tenant_id: tenant._id,
      email: 'admin@voyageelite.com',
      phone: '+917890000001',
      password_hash: '$2a$10$qNmBZ78W3xyISc8TI5bupe7b.PNCIJ0agnGBOgebq.sE0q1nEWuBe',
      role: 'admin',
      commission_tier: 'director',
      is_active: true,
      last_login_at: new Date(),
    },
    {
      tenant_id: tenant._id,
      email: 'rahul.agent@voyageelite.com',
      phone: '+917890000002',
      password_hash: '$2a$10$qNmBZ78W3xyISc8TI5bupe7b.PNCIJ0agnGBOgebq.sE0q1nEWuBe',
      role: 'agent',
      commission_tier: 'senior',
      is_active: true,
      last_login_at: new Date(Date.now() - 86400000),
    },
    {
      tenant_id: tenant._id,
      email: 'priya.manager@voyageelite.com',
      phone: '+917890000003',
      password_hash: '$2a$10$qNmBZ78W3xyISc8TI5bupe7b.PNCIJ0agnGBOgebq.sE0q1nEWuBe',
      role: 'manager',
      commission_tier: 'standard',
      is_active: true,
    },
  ]);
  console.log('✅ Users seeded');

  // ── 3. Tag Definitions ───────────────────────────────────────────────────────
  const [tagHoneymoon, tagVIP, tagLapsed] = await TagDefinition.insertMany([
    { tenant_id: tenant._id, name: 'Honeymoon', color_hex: '#FF6B9D', category: 'Interest' },
    { tenant_id: tenant._id, name: 'VIP Client', color_hex: '#FFD700', category: 'Lifecycle' },
    { tenant_id: tenant._id, name: 'Lapsed',     color_hex: '#FF4444', category: 'Lifecycle' },
  ]);
  console.log('✅ TagDefinitions seeded');

  // ── 4. Pipeline Stages ───────────────────────────────────────────────────────
  const [stageEnquiry, stageProposal, , stageConfirmed, stageClosed] =
    await PipelineStage.insertMany([
      { tenant_id: tenant._id, name: 'Enquiry',     position: 1, color: '#00A0E3', probability: 10,  is_closed_won: false, is_closed_lost: false },
      { tenant_id: tenant._id, name: 'Proposal',    position: 2, color: '#E19D19', probability: 40,  is_closed_won: false, is_closed_lost: false },
      { tenant_id: tenant._id, name: 'Negotiation', position: 3, color: '#EF7F1A', probability: 70,  is_closed_won: false, is_closed_lost: false },
      { tenant_id: tenant._id, name: 'Confirmed',   position: 4, color: '#009846', probability: 100, is_closed_won: true,  is_closed_lost: false },
      { tenant_id: tenant._id, name: 'Lost',        position: 5, color: '#E53935', probability: 0,   is_closed_won: false, is_closed_lost: true  },
    ]);
  console.log('✅ PipelineStages seeded');

  // ── 5. Contacts ──────────────────────────────────────────────────────────────
  const [contactA, contactB] = await Contact.insertMany([
    {
      tenant_id:       tenant._id,
      assigned_to:     agentUser._id,
      email:           'ayesha.khan@email.com',
      phone:           '+919876543210',
      full_name:       'Ayesha Khan',
      source:          'referral',
      lifecycle_stage: 'active',
      lead_score:      85,
      profile:         { preferred_destinations: ['Maldives', 'Europe'], anniversary: '2020-03-15' },
      gdpr_consent_at: new Date('2024-01-10'),
      last_contacted_at: new Date(Date.now() - 3 * 86400000),
    },
    {
      tenant_id:       tenant._id,
      assigned_to:     agentUser._id,
      email:           'rohan.mehta@email.com',
      phone:           '+919812345678',
      full_name:       'Rohan Mehta',
      source:          'web',
      lifecycle_stage: 'prospect',
      lead_score:      60,
      profile:         { preferred_destinations: ['Japan', 'Thailand'] },
      gdpr_consent_at: new Date('2024-03-05'),
    },
  ]);
  console.log('✅ Contacts seeded');

  // ── 6. Contact Tags ───────────────────────────────────────────────────────────
  await ContactTag.insertMany([
    { contact_id: contactA._id, tag_id: tagHoneymoon._id },
    { contact_id: contactA._id, tag_id: tagVIP._id },
    { contact_id: contactB._id, tag_id: tagLapsed._id },
  ]);
  console.log('✅ ContactTags seeded');

  // ── 7. Contact Relationships ─────────────────────────────────────────────────
  await ContactRelationship.insertMany([
    {
      tenant_id:         tenant._id,
      from_contact_id:   contactA._id,
      to_contact_id:     contactB._id,
      relationship_type: 'colleague',
      notes:             'Work at the same firm',
    },
  ]);
  console.log('✅ ContactRelationships seeded');

  // ── 8. Suppliers ─────────────────────────────────────────────────────────────
  const [supplierHotel, supplierAirline] = await Supplier.insertMany([
    {
      tenant_id:             tenant._id,
      type:                  'hotel',
      name:                  'Sun & Sea Resort Maldives',
      commission_pct:        12,
      contact_email:         'contracts@sunseamaldives.com',
      primary_contact_name:  'Ali Hassan',
      primary_contact_phone: '+9601234567',
      payment_terms:         30,
      is_preferred:          true,
    },
    {
      tenant_id:             tenant._id,
      type:                  'airline',
      name:                  'IndiGo Airlines',
      commission_pct:        5,
      contact_email:         'agents@indigo.in',
      primary_contact_name:  'Sneha Rao',
      primary_contact_phone: '+912212345678',
      payment_terms:         15,
      is_preferred:          false,
    },
  ]);
  console.log('✅ Suppliers seeded');

  // ── 9. Supplier Contracts ─────────────────────────────────────────────────────
  const [contract] = await SupplierContract.insertMany([
    {
      tenant_id:               tenant._id,
      supplier_id:             supplierHotel._id,
      name:                    'FY2025 Preferred Rate Agreement',
      net_rate_multiplier:     0.85,
      commission_override_pct: 15,
      markup_floor_pct:        20,
      valid_from:              new Date('2025-01-01'),
      valid_until:             new Date('2025-12-31'),
      is_active:               true,
      notes:                   'Negotiated preferred rate for high-volume bookings.',
    },
  ]);
  console.log('✅ SupplierContracts seeded');

  // ── 10. Quotes ───────────────────────────────────────────────────────────────
  const [quote] = await Quote.insertMany([
    {
      tenant_id:        tenant._id,
      contact_id:       contactA._id,
      stage_id:         stageProposal._id,
      assigned_to:      agentUser._id,
      status:           'sent',
      currency_code:    'INR',
      total_sell_cents: 450000,   // ₹4,500.00
      travel_dates:     { start: new Date('2025-10-05'), end: new Date('2025-10-14') },
      destinations:     ['Maldives'],
      pax_count:        2,
      notes:            'Honeymoon package – beach villa with sunset view.',
      expires_at:       new Date('2025-08-01'),
    },
  ]);
  console.log('✅ Quotes seeded');

  // ── 11. Bookings ─────────────────────────────────────────────────────────────
  const [booking] = await Booking.insertMany([
    {
      tenant_id:        tenant._id,
      contact_id:       contactA._id,
      stage_id:         stageConfirmed._id,
      assigned_to:      agentUser._id,
      quote_id:         quote._id,
      status:           'confirmed',
      currency_code:    'INR',
      total_cost_cents: 360000,   // ₹3,600 net cost
      total_sell_cents: 450000,   // ₹4,500 sell price
      margin_pct:       20,
      itinerary_version:1,
      travel_dates:     { start: new Date('2025-10-05'), end: new Date('2025-10-14') },
      destination:      'Maldives Honeymoon',
    },
  ]);
  console.log('✅ Bookings seeded');

  // ── 12. Booking Passengers ───────────────────────────────────────────────────
  await BookingPassenger.insertMany([
    {
      booking_id:      booking._id,
      first_name:      'Ayesha',
      last_name:       'Khan',
      dob:             new Date('1993-05-20'),
      passport_num:    'P1234567',
      passport_expiry: new Date('2028-05-19'),
      nationality:     'IN',
    },
    {
      booking_id:      booking._id,
      first_name:      'Imran',
      last_name:       'Khan',
      dob:             new Date('1990-11-10'),
      passport_num:    'P7654321',
      passport_expiry: new Date('2027-11-09'),
      nationality:     'IN',
    },
  ]);
  console.log('✅ BookingPassengers seeded');

  // ── 13. Booking Segments ─────────────────────────────────────────────────────
  await BookingSegment.insertMany([
    {
      booking_id:          booking._id,
      supplier_id:         supplierAirline._id,
      segment_type:        'flight',
      status:              'confirmed',
      is_on_request:       false,
      start_at:            new Date('2025-10-05T06:00:00Z'),
      end_at:              new Date('2025-10-05T10:30:00Z'),
      cost_cents:          60000,
      sell_cents:          75000,
      confirmation_ref:    'IG-20251005-001',
      supplier_ref:        '6E-3421',
    },
    {
      booking_id:          booking._id,
      supplier_id:         supplierHotel._id,
      contract_id:         contract._id,
      segment_type:        'hotel',
      status:              'confirmed',
      is_on_request:       false,
      start_at:            new Date('2025-10-05T14:00:00Z'),
      end_at:              new Date('2025-10-14T11:00:00Z'),
      cost_cents:          300000,
      sell_cents:          375000,
      cancellation_policy: 'Free cancellation until 30 days before check-in.',
      confirmation_ref:    'HRES-MV-2025-8871',
    },
  ]);
  console.log('✅ BookingSegments seeded');

  // ── 14. Itinerary Versions ───────────────────────────────────────────────────
  await ItineraryVersion.insertMany([
    {
      booking_id:  booking._id,
      created_by:  agentUser._id,
      version_num: 1,
      share_token: 'itinerary-share-abc123xyz',
      content: {
        days: [
          { day: 1, title: 'Arrival in Malé', activities: ['Airport transfer', 'Check-in villa'] },
          { day: 2, title: 'Snorkeling & Spa', activities: ['Lagoon snorkeling', 'Couples spa'] },
        ],
      },
    },
  ]);
  console.log('✅ ItineraryVersions seeded');

  // ── 15. Payment Schedules ────────────────────────────────────────────────────
  const [installment1, installment2] = await PaymentSchedule.insertMany([
    {
      booking_id:         booking._id,
      installment_number: 1,
      label:              'Deposit (20%)',
      amount_cents:       90000,
      due_date:           new Date('2025-07-15'),
      status:             'paid',
    },
    {
      booking_id:         booking._id,
      installment_number: 2,
      label:              'Final Balance (80%)',
      amount_cents:       360000,
      due_date:           new Date('2025-09-05'),
      status:             'pending',
    },
  ]);
  console.log('✅ PaymentSchedules seeded');

  // ── 16. Financial Events ─────────────────────────────────────────────────────
  await FinancialEvent.insertMany([
    {
      tenant_id:           tenant._id,
      booking_id:          booking._id,
      payment_schedule_id: installment1._id,
      recorded_by:         agentUser._id,
      event_type:          'deposit',
      amount_cents:        90000,
      currency:            'INR',
      due_date:            new Date('2025-07-15'),
      paid_at:             new Date('2025-07-12'),
      stripe_pi_id:        'pi_3Oa1BCLkdIwHu7ih0D7aBcDe',
      recorded_at:         new Date('2025-07-12'),
    },
  ]);
  console.log('✅ FinancialEvents seeded');

  // ── 17. Commissions ──────────────────────────────────────────────────────────
  await Commission.insertMany([
    {
      booking_id:     booking._id,
      supplier_id:    supplierHotel._id,
      agent_id:       agentUser._id,
      expected_cents: 45000,  // 15% of hotel sell price $3,750
      received_cents: 0,
      status:         'pending',
    },
  ]);
  console.log('✅ Commissions seeded');

  // ── 18. Activities ───────────────────────────────────────────────────────────
  await Activity.insertMany([
    {
      tenant_id:    tenant._id,
      contact_id:   contactA._id,
      booking_id:   booking._id,
      user_id:      agentUser._id,
      type:         'call',
      note:         'Discussed honeymoon package options. Client very interested in beach villa.',
      scheduled_at: new Date(Date.now() - 5 * 86400000),
    },
    {
      tenant_id:    tenant._id,
      contact_id:   contactA._id,
      booking_id:   booking._id,
      user_id:      agentUser._id,
      type:         'email',
      note:         'Sent confirmed booking vouchers and itinerary PDF.',
      scheduled_at: new Date(Date.now() - 2 * 86400000),
    },
  ]);
  console.log('✅ Activities seeded');

  // ── 19. Notifications ────────────────────────────────────────────────────────
  await Notification.insertMany([
    {
      tenant_id: tenant._id,
      user_id:   agentUser._id,
      type:      'payment_due',
      payload:   { booking_id: booking._id.toString(), label: 'Final Balance', due_date: '2025-09-05' },
      channel:   'in_app',
      read_at:   null,
    },
    {
      tenant_id: tenant._id,
      user_id:   managerUser._id,
      type:      'booking_update',
      payload:   { booking_id: booking._id.toString(), message: 'New booking confirmed by Rahul' },
      channel:   'email',
      read_at:   new Date(),
    },
  ]);
  console.log('✅ Notifications seeded');

  // ── 20. Email Templates ──────────────────────────────────────────────────────
  const [templateConfirmation] = await EmailTemplate.insertMany([
    {
      tenant_id:  tenant._id,
      name:       'Booking Confirmation',
      subject:    'Your booking is confirmed – {{booking_ref}}',
      body_html:  '<p>Dear {{first_name}},</p><p>Your booking is confirmed.</p>',
      body_text:  'Dear {{first_name}}, your booking is confirmed.',
      variables:  ['first_name', 'booking_ref', 'travel_dates', 'agent_name'],
      category:   'confirmation',
      is_active:  true,
    },
    {
      tenant_id:  tenant._id,
      name:       'Payment Reminder',
      subject:    'Payment due on {{due_date}} – {{booking_ref}}',
      body_html:  '<p>Hi {{first_name}},</p><p>Your payment of {{amount}} is due on {{due_date}}.</p>',
      body_text:  'Hi {{first_name}}, payment of {{amount}} due on {{due_date}}.',
      variables:  ['first_name', 'booking_ref', 'amount', 'due_date'],
      category:   'payment_reminder',
      is_active:  true,
    },
  ]);
  console.log('✅ EmailTemplates seeded');

  // ── 21. Email Sends ──────────────────────────────────────────────────────────
  await EmailSend.insertMany([
    {
      tenant_id:   tenant._id,
      template_id: templateConfirmation._id,
      contact_id:  contactA._id,
      booking_id:  booking._id,
      sent_by:     agentUser._id,
      to_email:    'ayesha.khan@email.com',
      subject:     'Your booking is confirmed – BK-2025-001',
      status:      'opened',
      sent_at:     new Date(Date.now() - 2 * 86400000),
      opened_at:   new Date(Date.now() - 2 * 86400000 + 3600000),
    },
  ]);
  console.log('✅ EmailSends seeded');

  // ── 22. Audit Logs ───────────────────────────────────────────────────────────
  await AuditLog.insertMany([
    {
      tenant_id:   tenant._id,
      user_id:     agentUser._id,
      entity_type: 'Booking',
      entity_id:   booking._id,
      action:      'create',
      diff:        { after: { status: 'confirmed', total_sell_cents: 450000 } },
    },
    {
      tenant_id:   tenant._id,
      user_id:     agentUser._id,
      entity_type: 'Contact',
      entity_id:   contactA._id,
      action:      'update',
      diff:        { before: { lifecycle_stage: 'prospect' }, after: { lifecycle_stage: 'active' } },
    },
  ]);
  console.log('✅ AuditLogs seeded');

  // ── 23. Documents ────────────────────────────────────────────────────────────
  await Document.insertMany([
    {
      tenant_id:   tenant._id,
      booking_id:  booking._id,
      contact_id:  contactA._id,
      uploaded_by: agentUser._id,
      type:        'passport',
      storage_key: 'tenants/voyage-elite/contacts/ayesha-khan/passport.pdf',
      filename:    'ayesha_passport.pdf',
      mime_type:   'application/pdf',
      size_bytes:  204800,
    },
    {
      tenant_id:   tenant._id,
      booking_id:  booking._id,
      uploaded_by: agentUser._id,
      type:        'voucher',
      storage_key: 'tenants/voyage-elite/bookings/bk-2025-001/hotel-voucher.pdf',
      filename:    'sun_sea_voucher.pdf',
      mime_type:   'application/pdf',
      size_bytes:  512000,
    },
  ]);
  console.log('✅ Documents seeded');

  console.log('\n🎉 All 23 collections seeded successfully!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
