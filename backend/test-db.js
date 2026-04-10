require('dotenv').config();
const mongoose = require('mongoose');

const testConnection = async () => {
    try {
        console.log('Testing MongoDB connection...');
        console.log('MongoDB URL:', process.env.MONGO_URL);
        
        await mongoose.connect(process.env.MONGO_URL);
        
        console.log('✅ Successfully connected to MongoDB');
        console.log('Database name:', mongoose.connection.db.databaseName);
        
        // List collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name).join(', ') || 'No collections yet');
        
        await mongoose.disconnect();
        console.log('✅ MongoDB connection test completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.log('\nTroubleshooting tips:');
        console.log('1. Make sure MongoDB is running on your system');
        console.log('2. Check if MONGO_URL in .env file is correct');
        console.log('3. For local MongoDB, typically: mongodb://localhost:27017/yourdbname');
        console.log('4. For MongoDB Atlas, use your connection string from Atlas');
        process.exit(1);
    }
};

testConnection();
