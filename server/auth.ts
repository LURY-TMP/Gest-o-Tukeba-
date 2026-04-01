import mongoose from 'mongoose';
import { User } from './models.js';
import { Response, NextFunction } from 'express';
import connectDB from './db.js';
import bcrypt from 'bcryptjs';

export const seedAdmin = async () => {
  try {
    await connectDB();
    const adminEmail = 'tukebamartinspedrolury@gmail.com';
    const admin = await User.findOne({ emailOrPhone: adminEmail });
    
    if (!admin) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const newAdmin = new User({
        emailOrPhone: adminEmail,
        password: hashedPassword,
        name: 'Admin',
        role: 'admin',
        settings: {
          currency: 'MZN',
          language: 'pt',
          lowStockThreshold: 10
        }
      });
      await newAdmin.save();
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
    await connectDB();
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
