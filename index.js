import express from 'express';
import dotenv from 'dotenv';
import userRouter from './controller/userController.js';
import connectDB from './config/db.js';

dotenv.config();
await connectDB();

const app = express();

app.use(express.json());
app.use('/api/users', userRouter);

app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});