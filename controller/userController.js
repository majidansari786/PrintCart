import { Router } from 'express';
import User from '../models/user.js';
import bcrypt from 'bcrypt';
import redisClient from '../config/redis.js';

const router = Router();

router.post('/register', async (req, res) => {
    const { username, mobile, password } = req.body;
    const ifUserExists = await User.findOne({ mobile });
    if(ifUserExists) {
        return res.status(400).send('User already exists');
    }
    const hashedpassword = await bcrypt.hash(password, 10);
    await User.create({ username, mobile, password: hashedpassword });
    res.send('User registered successfully');
});

router.post('/login', async (req, res) => {
    const { mobile, password } = req.body;
    const user = await User.findOne({ mobile });
    if(!user) {
        return res.status(400).send('User not found');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch) {
        return res.status(400).send('Invalid credentials');
    }
    await redisClient.hset(`user:${mobile}`, req.body);
    await redisClient.expire(`user:${mobile}`, 3600);
    res.send('User logged in successfully');
});

router.get('/profile/:mobile', async (req, res) => {
    const { mobile } = req.params;
    const cachedUser = await redisClient.hgetall(`user:${mobile}`);
    if(cachedUser) {
        return res.json(cachedUser);
    }
    const user = await User.findOne({ mobile });
    if(!user) {
        return res.status(400).send('User not found');
    }
    await redisClient.hset(`user:${mobile}`, user.toObject());
    await redisClient.expire(`user:${mobile}`, 3600);
    res.json(user);
});

export default router;