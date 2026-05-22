const bcrypt = require('bcryptjs');
const CRMUser = require('../models/CRMUser');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const BillingItem = require('../models/BillingItem');
const Payment = require('../models/Payment');
const Supplier = require('../models/Supplier');
const SupplierRate = require('../models/SupplierRate');
const Customer = require('../models/Customer');

const seedDatabase = async () => {
  try {
    const userCount = await CRMUser.countDocuments();
    if (userCount > 0) {
      console.log('🍃 Database already contains data. Skipping CRM seeding.');
      return;
    }

    console.log('🌱 Seeding default CRM users...');
    const seedUsers = [
      { id: 'U-001', name: 'SuperUser', email: 'superadmin@nexus.com', password: bcrypt.hashSync('nexus123', 10), role: 'Super Admin', status: 'Active' },
      { id: 'U-002', name: 'Bhargav', email: 'admin@nexus.com', password: bcrypt.hashSync('nexus123', 10), role: 'Admin', status: 'Active' },
      { id: 'U-003', name: 'Priya', email: 'ops@nexus.com', password: bcrypt.hashSync('nexus123', 10), role: 'Ops Staff', status: 'Active' },
      { id: 'U-004', name: 'Ravi', email: 'accounts@nexus.com', password: bcrypt.hashSync('nexus123', 10), role: 'Accountant', status: 'Active' },
      { id: 'U-005', name: 'Manager', email: 'manager@nexus.com', password: bcrypt.hashSync('nexus123', 10), role: 'Ops Manager', status: 'Active' },
      { id: 'U-006', name: 'Travel Admin', email: 'flights@kanan.co', password: bcrypt.hashSync('Kanan123', 10), role: 'Admin', status: 'Active' }
    ];
    await CRMUser.insertMany(seedUsers);
    console.log(`✅ Successfully seeded ${seedUsers.length} users.`);

    console.log('🌱 Seeding demo lead...');
    const demoLead = {
      id: 'L-1001',
      first_name: 'Rajesh',
      last_name: 'Kumar',
      email: 'rajesh@example.com',
      mobile: '9876543210',
      status: 'New',
      priority: 'Hot',
      no_adults: 2,
      no_children: 1,
      no_infants: 0,
      destination: 'Dubai',
      lead_source: 'Website',
      assigned_to: 'Bhargav',
      travel_start_date: '2026-06-10',
      travel_end_date: '2026-06-17',
      enquiry_types: ['Flight', 'Hotel'],
      enquiry_data: { flight_class: 'Economy', hotel_stars: '5 Star' },
      notes: 'Wants a private yacht experience on one of the days.',
      tags: ['Family', 'Premium']
    };
    await Lead.create(demoLead);

    console.log('🌱 Seeding lead activities...');
    await Activity.create({
      id: 'act-1',
      lead_id: 'L-1001',
      type: 'System',
      text: 'Lead created via Website',
      user_name: 'System'
    });

    console.log('🌱 Seeding billing items...');
    await BillingItem.create({
      id: 'item-1',
      lead_id: 'L-1001',
      description: 'Dubai Holiday Package (7N/8D)',
      qty: 1,
      price: 85000,
      tax: 5
    });

    console.log('🌱 Seeding payments...');
    await Payment.create({
      id: 'pay-1',
      lead_id: 'L-1001',
      amount: 25000,
      date: new Date().toISOString(),
      method: 'Bank Transfer',
      reference: 'TXN-001',
      note: 'Advance payment',
      type: 'received',
      created_by: 'Bhargav'
    });

    console.log('🌱 Seeding suppliers...');
    const seedSuppliers = [
      { id: 'S-001', name: 'Sunrise Hotels', email: 'sunrise@hotels.com', phone: '9900012345', service_type: 'Hotel', rating: 4.5, is_preferred: 1 },
      { id: 'S-002', name: 'BlueWave Stays', email: 'bw@stays.com', phone: '9900054321', service_type: 'Hotel', rating: 4.2, is_preferred: 0 },
      { id: 'S-003', name: 'Swift Airways', email: 'swift@air.com', phone: '9811112222', service_type: 'Flight', rating: 4.7, is_preferred: 1 }
    ];
    await Supplier.insertMany(seedSuppliers);

    console.log('🌱 Seeding supplier rates...');
    const seedRates = [
      { id: 'R-001', supplier_id: 'S-001', service: 'Hotel', details: 'Deluxe Room', rate: 4500, currency: 'INR' },
      { id: 'R-002', supplier_id: 'S-002', service: 'Hotel', details: 'Deluxe Room', rate: 4200, currency: 'INR' },
      { id: 'R-003', supplier_id: 'S-003', service: 'Flight', details: 'Economy Return', rate: 12000, currency: 'INR' }
    ];
    await SupplierRate.insertMany(seedRates);

    console.log('🌱 Seeding high-fidelity customers...');
    const seedCustomers = [
      {
        id: 'C-001',
        salutation: 'Mr.',
        first_name: 'Rajesh',
        last_name: 'Kumar',
        email: 'rajesh@example.com',
        mobile: '9876543210',
        phone: '022-2435678',
        city: 'Mumbai',
        address: 'Flat 402, Sea Breeze Apartments, Bandra West',
        date_of_birth: '1988-04-12',
        anniversary: '2014-11-23',
        customer_type: 'Regular',
        source: 'Website',
        tags: ['Premium', 'Family'],
        notes: 'Highly prefers window seats on flights.',
        created_by: 'SuperUser',
        preferred_currency: 'INR',
        lead_score: 85,
        preferences_json: JSON.stringify({ tags: ['Premium', 'Family'] })
      },
      {
        id: 'C-002',
        salutation: 'Mrs.',
        first_name: 'Anita',
        last_name: 'Sharma',
        email: 'anita@example.com',
        mobile: '9812345678',
        phone: '011-2567890',
        city: 'New Delhi',
        address: 'B-24, Greater Kailash 1',
        date_of_birth: '1992-08-25',
        customer_type: 'VIP',
        source: 'Referral',
        tags: ['Luxury', 'Solo'],
        notes: 'Always books 5-star properties, vegetarian meals.',
        created_by: 'Bhargav',
        preferred_currency: 'INR',
        lead_score: 95,
        preferences_json: JSON.stringify({ tags: ['Luxury', 'Solo'] })
      },
      {
        id: 'C-003',
        salutation: 'Mr.',
        first_name: 'Vikram',
        last_name: 'Singh',
        email: 'vikram.singh@gmail.com',
        mobile: '9765432109',
        city: 'Bangalore',
        address: '12th Cross, Indiranagar',
        date_of_birth: '1985-01-30',
        customer_type: 'Individual',
        source: 'Social Media',
        tags: ['Adventure', 'Corporate'],
        notes: 'Interested in mountain trekking and safari packages.',
        created_by: 'Priya',
        preferred_currency: 'INR',
        lead_score: 75,
        preferences_json: JSON.stringify({ tags: ['Adventure', 'Corporate'] })
      }
    ];
    await Customer.insertMany(seedCustomers);

    console.log('✅ CRM Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during CRM seeding:', error);
  }
};

module.exports = { seedDatabase };
