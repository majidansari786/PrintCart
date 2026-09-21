import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import userRouter from './controller/userController.js';
import orderRouter from './controller/orderController.js';
import connectDB from './config/db.js';

await connectDB();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);

app.get('/api/config/razorpay', (req, res) => {
  res.json({ keyId: process.env.RAZORPAY_KEY_ID });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});