const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'nexuscrm.db');

let db;

const getDb = () => {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
  }
  return db;
};

const initializeDatabase = () => {
  const db = getDb();

  // --- USERS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Viewer',
      status TEXT NOT NULL DEFAULT 'Active',
      area TEXT,
      mobile TEXT,
      assigned_to TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // --- LEADS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      mobile TEXT,
      status TEXT DEFAULT 'New',
      priority TEXT DEFAULT 'Normal',
      no_adults INTEGER DEFAULT 1,
      no_children INTEGER DEFAULT 0,
      no_infants INTEGER DEFAULT 0,
      destination TEXT,
      lead_source TEXT,
      assigned_to TEXT,
      travel_start_date TEXT,
      travel_end_date TEXT,
      enquiry_types TEXT DEFAULT '[]',
      enquiry_data TEXT DEFAULT '{}',
      notes TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // --- ACTIVITIES TABLE (Unified Timeline) ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      type TEXT DEFAULT 'Note',
      text TEXT NOT NULL,
      user_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );
  `);

  // --- FOLLOW UPS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      date TEXT NOT NULL,
      method TEXT DEFAULT 'Phone',
      notes TEXT,
      outcome TEXT,
      next_date TEXT,
      status TEXT DEFAULT 'Pending',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );
  `);

  // --- BILLING ITEMS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS billing_items (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      description TEXT NOT NULL,
      qty INTEGER DEFAULT 1,
      price REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );
  `);

  // --- PAYMENTS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      method TEXT DEFAULT 'Cash',
      reference TEXT,
      note TEXT,
      type TEXT DEFAULT 'received',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );
  `);

  // --- SUPPLIERS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      service_type TEXT,
      gst TEXT,
      address TEXT,
      city TEXT,
      status TEXT DEFAULT 'Active',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // --- SUPPLIER RATES TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_rates (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      service TEXT NOT NULL,
      details TEXT,
      rate REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      valid_from TEXT,
      valid_to TEXT,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
    );
  `);

  // --- ASSIGNED SUPPLIERS (per lead) TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS assigned_suppliers (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      supplier_id TEXT,
      supplier_name TEXT NOT NULL,
      service_type TEXT NOT NULL,
      rate REAL NOT NULL,
      markup REAL DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'Pending',
      paid_amount REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );
  `);

  // --- COMMUNICATIONS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS communications (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      direction TEXT DEFAULT 'outbound',
      template_name TEXT,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'Sent',
      sent_by TEXT,
      sent_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );
  `);

  // --- CUSTOMERS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      salutation TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      email TEXT,
      mobile TEXT,
      phone TEXT,
      city TEXT,
      address TEXT,
      date_of_birth TEXT,
      anniversary TEXT,
      customer_type TEXT DEFAULT 'Individual',
      source TEXT,
      tags TEXT DEFAULT '[]',
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // --- NOTIFICATIONS TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      lead_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // --- AUDIT LOG TABLE ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_name TEXT,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // --- Seed default users if table is empty ---
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    console.log('🌱 Seeding default users...');
    const seedUsers = [
      { id: 'U-001', name: 'SuperUser', email: 'superadmin@nexus.com', password: bcrypt.hashSync('nexus123', 10), role: 'Super Admin', status: 'Active' },
      { id: 'U-002', name: 'Bhargav', email: 'admin@nexus.com', password: bcrypt.hashSync('nexus123', 10), role: 'Admin', status: 'Active' },
      { id: 'U-003', name: 'Priya', email: 'ops@nexus.com', password: bcrypt.hashSync('nexus123', 10), role: 'Ops Staff', status: 'Active' },
      { id: 'U-004', name: 'Ravi', email: 'accounts@nexus.com', password: bcrypt.hashSync('nexus123', 10), role: 'Accountant', status: 'Active' },
      { id: 'U-005', name: 'Manager', email: 'manager@nexus.com', password: bcrypt.hashSync('nexus123', 10), role: 'Ops Manager', status: 'Active' }
    ];
    const insertUser = db.prepare('INSERT INTO users (id, name, email, password, role, status) VALUES (@id, @name, @email, @password, @role, @status)');
    seedUsers.forEach(u => insertUser.run(u));

    // Seed demo lead
    console.log('🌱 Seeding demo lead...');
    db.prepare(`INSERT INTO leads (id, first_name, last_name, email, mobile, status, priority, no_adults, no_children, destination, lead_source, assigned_to, travel_start_date, travel_end_date, enquiry_types)
      VALUES ('L-1001', 'Rajesh', 'Kumar', 'rajesh@example.com', '9876543210', 'New', 'Hot', 2, 1, 'Dubai', 'Website', 'Bhargav', '2026-05-10', '2026-05-17', '["Flight","Hotel"]')`).run();

    db.prepare(`INSERT INTO activities (id, lead_id, type, text, user_name) VALUES ('act-1', 'L-1001', 'System', 'Lead created via Website', 'System')`).run();

    db.prepare(`INSERT INTO billing_items (id, lead_id, description, qty, price, tax) VALUES ('item-1', 'L-1001', 'Dubai Holiday Package (7N/8D)', 1, 85000, 5)`).run();

    db.prepare(`INSERT INTO payments (id, lead_id, amount, date, method, reference, note) VALUES ('pay-1', 'L-1001', 25000, datetime('now'), 'Bank Transfer', 'TXN-001', 'Advance payment')`).run();

    // Seed suppliers
    db.prepare(`INSERT INTO suppliers (id, name, email, phone, service_type) VALUES ('S-001', 'Sunrise Hotels', 'sunrise@hotels.com', '9900012345', 'Hotel')`).run();
    db.prepare(`INSERT INTO suppliers (id, name, email, phone, service_type) VALUES ('S-002', 'BlueWave Stays', 'bw@stays.com', '9900054321', 'Hotel')`).run();
    db.prepare(`INSERT INTO suppliers (id, name, email, phone, service_type) VALUES ('S-003', 'Swift Airways', 'swift@air.com', '9811112222', 'Flight')`).run();

    db.prepare(`INSERT INTO supplier_rates (id, supplier_id, service, details, rate) VALUES ('R-001', 'S-001', 'Hotel', 'Deluxe Room', 4500)`).run();
    db.prepare(`INSERT INTO supplier_rates (id, supplier_id, service, details, rate) VALUES ('R-002', 'S-002', 'Hotel', 'Deluxe Room', 4200)`).run();
    db.prepare(`INSERT INTO supplier_rates (id, supplier_id, service, details, rate) VALUES ('R-003', 'S-003', 'Flight', 'Economy Return', 12000)`).run();
  }

  console.log('✅ Database initialized');
  return db;
};

module.exports = { getDb, initializeDatabase };
