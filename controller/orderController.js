import orderModel from '../models/order'
import { Router } from 'express';
import bcrypt from 'bcrypt';
import redisClient from '../config/redis.js';

const router = Router();

async function printDoc(file_path) {
    
}

router.post('/create', async (req,res)=>{
    const { file_path, user_id } = req.body;
    await redisClient.set(`order:${file_path}`)
    const printDocs = printDoc(file_path)
    if(printDocs){

    }
})