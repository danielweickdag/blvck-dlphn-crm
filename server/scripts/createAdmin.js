const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import User model
const User = require('../models/User');

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blvck-dlphn-crm');
    console.log(`MongoDB Connected: ${conn.connection.host}`.green);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Create admin user
const createAdminUser = async () => {
  try {
    await connectDB();

    // Admin credentials
    const adminData = {
      username: 'danielw@blvckdlphn.com',
      email: 'danielw@blvckdlphn.com',
      password: 'Mougouli05172023!!#$$!!*',
      firstName: 'Daniel',
      lastName: 'Williams',
      role: 'admin',
      permissions: [
        'view_deals',
        'create_deals',
        'edit_deals',
        'delete_deals',
        'view_analytics',
        'manage_users',
        'system_admin',
        'generate_contracts',
        'access_funding'
      ],
      isActive: true,
      isVerified: true
    };

    // Check if admin user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: adminData.email },
        { username: adminData.username }
      ]
    });

    if (existingUser) {
      console.log('Admin user already exists. Updating credentials...');
      
      // Update existing user
      existingUser.password = adminData.password;
      existingUser.role = 'admin';
      existingUser.permissions = adminData.permissions;
      existingUser.isActive = true;
      existingUser.isVerified = true;
      
      await existingUser.save();
      console.log('✅ Admin user updated successfully!');
    } else {
      // Create new admin user
      const adminUser = new User(adminData);
      await adminUser.save();
      console.log('✅ Admin user created successfully!');
    }

    console.log('\n📋 Admin Credentials:');
    console.log(`Email/Username: ${adminData.email}`);
    console.log(`Password: ${adminData.password}`);
    console.log(`Role: ${adminData.role}`);
    console.log('\n🚀 You can now login to the CRM system with these credentials.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

// Run the script
createAdminUser();