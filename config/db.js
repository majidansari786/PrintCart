import mongoose from 'mongoose';

const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/printer');
    console.log('Connected to MongoDB');
};

export default connectDB;