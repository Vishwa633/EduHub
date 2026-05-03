import 'dotenv/config';
import mongoose from "mongoose";
import dns from "node:dns";

const resolver = new dns.Resolver();

/**
 * Custom lookup function that bypasses the OS resolver using Node's internal DNS (c-ares).
 * This helps resolve Atlas shard hostnames when the OS resolver is broken or intercepted.
 */
const customLookup = (hostname, options, callback) => {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }

    const family = options.family || 0;

    const resolve = async () => {
        try {
            let addresses = [];
            if (family === 4) {
                addresses = await resolver.resolve4(hostname);
            } else if (family === 6) {
                addresses = await resolver.resolve6(hostname);
            } else {
                try {
                    addresses = await resolver.resolve4(hostname);
                } catch {
                    addresses = await resolver.resolve6(hostname);
                }
            }

            if (addresses && addresses.length > 0) {
                callback(null, addresses[0], family || 4);
                return;
            }
            throw new Error("No addresses found");
        } catch (err) {
            // Fallback to standard OS lookup if internal resolve fails
            dns.lookup(hostname, options, callback);
        }
    };

    resolve();
};

const configureMongoDns = () => {
    // Check for DNS_SERVERS or MONGO_DNS_SERVERS
    const dnsServers = process.env.DNS_SERVERS || process.env.MONGO_DNS_SERVERS;
    
    let servers = [];
    if (dnsServers) {
        servers = dnsServers.split(",").map(s => s.trim()).filter(Boolean);
    } else {
        // Auto-detect if we're only using localhost resolvers
        const currentServers = dns.getServers();
        const isLocalOnly = currentServers.every(s => 
            s === "127.0.0.1" || s === "::1" || s === "localhost"
        );
        
        if (isLocalOnly) {
            servers = ["1.1.1.1", "8.8.8.8"];
        }
    }

    if (servers.length > 0) {
        try {
            dns.setServers(servers);
            resolver.setServers(servers);
            console.log(`Applied DNS resolvers for MongoDB: ${servers.join(", ")}`);
        } catch (error) {
            console.warn("Failed to apply custom DNS servers:", error.message);
        }
    }
};

export const connectDB = async () => {
    try {
        configureMongoDns();

        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI is not defined");
        }

        const conn = await mongoose.connect(mongoUri, {
            lookup: customLookup,
            serverSelectionTimeoutMS: 10000,
            family: 4, // Force IPv4 to avoid dual-stack resolution issues
        });
        
        console.log(`Database connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error("Error connecting to database:", error.message);
        throw error;
    }
};
