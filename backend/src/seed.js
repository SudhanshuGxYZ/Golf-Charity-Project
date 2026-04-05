import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import supabase from './utils/supabase.js';

dotenv.config();

async function seedAdmin() {
  try {
    console.log('🌱 Seeding admin user...');

    const adminEmail = 'admin@golfcharity.com';
    const adminPassword = 'Admin@1234';

    // Check if admin already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();

    if (existing) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Create admin user
    const { data: admin, error } = await supabase
      .from('users')
      .insert({
        email: adminEmail,
        password_hash: passwordHash,
        full_name: 'Admin',
        role: 'admin',
        is_active: true,
      })
      .select('id, email, full_name, role')
      .single();

    if (error) {
      console.error('❌ Error creating admin user:', error.message);
      process.exit(1);
    }

    console.log('✅ Admin user created successfully');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${admin.role}`);
  } catch (err) {
    console.error('❌ Seed script error:', err.message);
    process.exit(1);
  }
}

seedAdmin();
