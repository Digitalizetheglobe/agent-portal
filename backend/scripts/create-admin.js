require('dotenv').config();
const { User } = require('../models');
const { connectDB, sequelize } = require('../config/db');

async function run() {
  const args = process.argv.slice(2);
  const email = args[0] || process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = args[1] || process.env.ADMIN_PASSWORD || 'admin123';
  const name = args[2] || 'Admin';

  console.log(`Connecting to database...`);
  await connectDB();

  const normalizedEmail = email.toLowerCase().trim();

  let user = await User.findOne({ where: { email: normalizedEmail } });

  if (user) {
    console.log(`User ${normalizedEmail} already exists. Updating role to admin and resetting password...`);
    user.role = 'admin';
    user.status = 'active';
    user.isVerified = true;
    user.verificationStatus = 'approved';
    user.password = password; // Trigger beforeUpdate hook to rehash
    await user.save();
    console.log(`✅ Admin account updated successfully!`);
  } else {
    console.log(`Creating new admin account for ${normalizedEmail}...`);
    user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: 'admin',
      status: 'active',
      isVerified: true,
      verificationStatus: 'approved'
    });
    console.log(`✅ Admin account created successfully!`);
  }

  console.log(`----------------------------------------`);
  console.log(`Email:    ${normalizedEmail}`);
  console.log(`Password: ${password}`);
  console.log(`Role:     admin`);
  console.log(`----------------------------------------`);

  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Error creating admin account:', err);
  process.exit(1);
});
