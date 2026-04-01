import mongoose from 'mongoose';
import { User } from './models.js';
import { Response, NextFunction } from 'express';

export const seedAdmin = async () => {
  try {
    const adminEmail = 'tukebamartinspedrolury@gmail.com';
    let admin = await User.findOne({ emailOrPhone: adminEmail });
    
    if (!admin) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      admin = new User({
        emailOrPhone: adminEmail,
        password: adminPassword, // In a real app, this should be hashed, but we're removing auth
        name: 'Admin',
        role: 'admin'
      });
      await admin.save();
      console.log('Admin user seeded successfully');
    } else if (admin.role !== 'admin') {
      // Ensure existing user has admin role
      admin.role = 'admin';
      await admin.save();
      console.log('Admin user role updated to admin');
    }
  } catch (err) {
    console.error('Error seeding admin user:', err);
  }
};

export const authenticate = async (req: any, res: Response, next: NextFunction) => {
  try {
    const adminEmail = 'tukebamartinspedrolury@gmail.com';
    const user = await User.findOne({ emailOrPhone: adminEmail });
    if (user) {
      req.userId = user._id;
    }
    next();
  } catch (err) {
    next();
  }
};
