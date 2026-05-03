import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔄 Testing MongoDB connection...');
    console.log('URI:', process.env.MONGO_URI.replace(/:[^:]*@/, ':***@'));
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
    
    console.log('✅ Database connected successfully!');
    console.log('Host:', conn.connection.host);
    console.log('Database:', conn.connection.name);
    
    // List collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\n📋 Troubleshooting:');
    console.error('1. Check if MongoDB Atlas cluster is ACTIVE (not paused)');
    console.error('2. Verify your IP is whitelisted in Network Access');
    console.error('3. Ensure database name is in connection string');
    console.error('4. Check credentials are URL-encoded properly');
    process.exit(1);
  }
};

testConnection();
