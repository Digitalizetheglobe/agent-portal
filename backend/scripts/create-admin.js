require('dotenv').config();
const { User } = require('../models');
const { connectDB } = require('../config/db');
const { passwordProblem } = require('../utils/security');

// Usage: npm run create-admin -- <email> [name] [staffRole]
// The password is read from the ADMIN_PASSWORD environment variable, never from the command line
// (command lines end up in shell history and process lists) and there is no default.
//   PowerShell:  $env:ADMIN_PASSWORD='...'; npm run create-admin -- boss@company.com "Boss"
//   bash:        ADMIN_PASSWORD='...' npm run create-admin -- boss@company.com "Boss"
// staffRole (optional): account_manager | head_recruitment | head_admission | accounts. Omit for super admin.
const STAFF_ROLES = ['account_manager', 'head_recruitment', 'head_admission', 'accounts'];

async function run() {
  const args = process.argv.slice(2);
  const email = args[0] || process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = args[1] || 'Admin';
  const staffRole = args[2] || null;

  if (!email) {
    console.error('❌ Provide the admin email: npm run create-admin -- <email> [name] [staffRole]');
    process.exit(1);
  }
  if (!password) {
    console.error('❌ Set the ADMIN_PASSWORD environment variable for this command (see the usage note at the top of this file).');
    process.exit(1);
  }
  const weak = passwordProblem(password);
  if (weak) {
    console.error(`❌ ${weak}`);
    process.exit(1);
  }
  if (staffRole && !STAFF_ROLES.includes(staffRole)) {
    console.error(`❌ staffRole must be one of: ${STAFF_ROLES.join(', ')}`);
    process.exit(1);
  }

  console.log('Connecting to database...');
  await connectDB();

  const normalizedEmail = email.toLowerCase().trim();

  let user = await User.findOne({ where: { email: normalizedEmail } });

  if (user) {
    console.log(`User ${normalizedEmail} already exists. Updating role to admin and resetting password...`);
    user.role = 'admin';
    user.staffRole = staffRole;
    user.status = 'active';
    user.isVerified = true;
    user.verificationStatus = 'approved';
    user.password = password; // Trigger beforeUpdate hook to rehash
    await user.save();
    console.log('✅ Admin account updated successfully!');
  } else {
    console.log(`Creating new admin account for ${normalizedEmail}...`);
    user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: 'admin',
      staffRole,
      status: 'active',
      isVerified: true,
      verificationStatus: 'approved'
    });
    console.log('✅ Admin account created successfully!');
  }

  console.log(`Email: ${normalizedEmail}`);
  console.log(`Role:  admin${staffRole ? ` (${staffRole})` : ' (super admin)'}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Error creating admin account:', err.message);
  process.exit(1);
});
