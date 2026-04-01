import express from 'express';
import { StockEntry, Sale, Customer, User } from './models.js';
import { authenticate } from './auth.js';

const router = express.Router();

// User Settings
router.get('/user/profile', authenticate, async (req: any, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/user/settings', authenticate, async (req: any, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.userId, { settings: req.body }, { new: true });
    res.json(user?.settings);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Stock Entries
router.get('/stock', authenticate, async (req: any, res) => {
  try {
    const entries = await StockEntry.find({ userId: req.userId }).sort({ date: -1 });
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/stock', authenticate, async (req: any, res) => {
  try {
    const entry = new StockEntry({ ...req.body, userId: req.userId });
    await entry.save();
    res.status(201).json(entry);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/stock/:id', authenticate, async (req: any, res) => {
  try {
    const entry = await StockEntry.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true });
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/stock/:id', authenticate, async (req: any, res) => {
  try {
    await StockEntry.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Sales
router.get('/sales', authenticate, async (req: any, res) => {
  try {
    const sales = await Sale.find({ userId: req.userId }).sort({ date: -1 });
    res.json(sales);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/sales', authenticate, async (req: any, res) => {
  try {
    const sale = new Sale({ ...req.body, userId: req.userId });
    await sale.save();
    
    // Update customer total spent
    if (req.body.customerId) {
        await Customer.findByIdAndUpdate(req.body.customerId, {
            $inc: { totalSpent: req.body.totalPrice },
            $set: { lastPurchaseDate: req.body.date }
        });
    }
    
    res.status(201).json(sale);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/sales/:id', authenticate, async (req: any, res) => {
  try {
    const sale = await Sale.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (sale && sale.customerId) {
        await Customer.findByIdAndUpdate(sale.customerId, {
            $inc: { totalSpent: -sale.totalPrice }
        });
    }
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Customers
router.get('/customers', authenticate, async (req: any, res) => {
  try {
    const customers = await Customer.find({ userId: req.userId }).sort({ name: 1 });
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/customers', authenticate, async (req: any, res) => {
  try {
    const customer = new Customer({ ...req.body, userId: req.userId });
    await customer.save();
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/customers/:id', authenticate, async (req: any, res) => {
  try {
    const customer = await Customer.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, req.body, { new: true });
    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/customers/:id', authenticate, async (req: any, res) => {
  try {
    await Customer.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
