const mongoose = require('mongoose');
const Staff = require('../models/staff.model');
const config = require('../config');

const MONGO_URI = config.mongoUri;

const testStaff = [
  {
    email: 'ops@speedcopy.in',
    password: 'ops123456',
    name: 'Ops Manager',
    role: 'ops',
    permissions: ['view_orders', 'reassign_vendor', 'raise_clarification'],
    mfaEnabled: true,
    status: 'active',
  },
  {
    email: 'support@speedcopy.in',
    password: 'support123456',
    name: 'Support Lead',
    role: 'support',
    permissions: ['view_tickets', 'reply_ticket', 'close_ticket', 'escalate_ticket'],
    mfaEnabled: true,
    status: 'active',
  },
  {
    email: 'finance@speedcopy.in',
    password: 'finance123456',
    name: 'Finance Officer',
    role: 'finance',
    permissions: ['view_refunds', 'approve_refund', 'credit_wallet', 'debit_wallet'],
    mfaEnabled: true,
    status: 'active',
  },
  {
    email: 'marketing@speedcopy.in',
    password: 'marketing123456',
    name: 'Marketing Manager',
    role: 'marketing',
    permissions: ['create_coupon', 'create_targeting', 'view_campaigns'],
    mfaEnabled: true,
    status: 'active',
  },
  {
    email: 'admin@speedcopy.in',
    password: 'admin123456',
    name: 'Admin',
    role: 'admin',
    permissions: ['*'],
    mfaEnabled: true,
    status: 'active',
  },
];

async function seedStaff() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing staff
    await Staff.deleteMany({});
    console.log('Cleared existing staff');

    // Insert test staff
    const result = await Staff.insertMany(testStaff);
    console.log(`✅ Seeded ${result.length} staff members`);

    console.log('\n📋 Test Staff Credentials:');
    testStaff.forEach((staff) => {
      console.log(`\n${staff.role.toUpperCase()}:`);
      console.log(`  Email: ${staff.email}`);
      console.log(`  Password: ${staff.password}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Seeding complete');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedStaff();
