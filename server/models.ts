import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  emailOrPhone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  settings: {
    currency: { type: String, enum: ['BRL', 'USD', 'EUR', 'MZN', 'KZ'], default: 'BRL' },
    language: { type: String, enum: ['pt', 'en'], default: 'pt' },
    lowStockThreshold: { type: Number, default: 10 }
  }
}, { timestamps: true });

const StockEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  brand: { type: String, required: true },
  quantity: { type: Number, required: true },
  type: { type: String, enum: ['3P', 'Meio', 'Completa'], required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  description: { type: String }
}, { timestamps: true });

const SaleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  brand: { type: String, required: true },
  quantity: { type: Number, required: true },
  type: { type: String, enum: ['3P', 'Meio', 'Completa'], required: true },
  price: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true }
}, { timestamps: true });

const CustomerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  totalSpent: { type: Number, default: 0 },
  lastPurchaseDate: { type: Date }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const StockEntry = mongoose.models.StockEntry || mongoose.model('StockEntry', StockEntrySchema);
export const Sale = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);
export const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
