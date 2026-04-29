require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/speedcopy_auth';

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    name: String,
    role: String,
}, { timestamps: true });

const User = mongoose.model('User', userSchema, 'users');

(async () => {
    try {
        await mongoose.connect(MONGO_URI, { family: 4 });
        console.log('Connected to MongoDB');
        
        const user = await User.findOne({ email: 'vendor@speedcopy.com' }).select('+password');
        
        if (user) {
            console.log('\nVendor user found:');
            console.log('Email:', user.email);
            console.log('Name:', user.name);
            console.log('Role:', user.role);
            console.log('Has password:', !!user.password);
            console.log('Password starts with:', user.password ? user.password.substring(0, 10) + '...' : 'N/A');
        } else {
            console.log('\nVendor user NOT found!');
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
