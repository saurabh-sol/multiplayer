"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./client");
async function initDatabase() {
    console.log('🔧 Initializing database tables...');
    try {
        // Create Users table
        await (0, client_1.sql) `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        wallet_address TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        last_seen TIMESTAMP DEFAULT NOW()
      )
    `;
        console.log('✅ Users table created');
        // Create Inventory Items table
        await (0, client_1.sql) `
      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_type TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        metadata TEXT,
        UNIQUE(user_id, item_type)
      )
    `;
        console.log('✅ Inventory Items table created');
        // Create Buildings table
        await (0, client_1.sql) `
      CREATE TABLE IF NOT EXISTS buildings (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        building_type TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        stored_points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, building_type)
      )
    `;
        console.log('✅ Buildings table created');
        // Create Pending Tokens table
        await (0, client_1.sql) `
      CREATE TABLE IF NOT EXISTS pending_tokens (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        source TEXT,
        claimed BOOLEAN DEFAULT FALSE,
        claimed_at TIMESTAMP,
        claim_address TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
        console.log('✅ Pending Tokens table created');
        console.log('\n🎉 Database initialized successfully!');
        // Verify tables exist
        const tables = await (0, client_1.sql) `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
        console.log('\n📋 Tables in database:', tables.map(t => t.table_name).join(', '));
    }
    catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}
initDatabase();
//# sourceMappingURL=init.js.map