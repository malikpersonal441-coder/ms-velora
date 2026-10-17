"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
let memoryServerInstance = null;
let isUsingMemoryServer = false;
async function connectDatabase() {
    try {
        // Use configured MONGODB_URI
        let mongoUri = env_1.env.MONGODB_URI.trim();
        if (mongoose_1.default.connection.readyState >= 1) {
            return { uri: mongoUri || 'cached', isMemory: isUsingMemoryServer };
        }
        if (!mongoUri) {
            if (process.env.VERCEL || env_1.env.NODE_ENV === 'production') {
                console.warn('[DB] Notice: MONGODB_URI is not set in environment variables. Database operations will be inactive.');
                mongoose_1.default.set('bufferCommands', false);
                return { uri: '', isMemory: false };
            }
            console.log('[DB] No MONGODB_URI configured. Starting embedded MongoDB server for local development/testing...');
            const { MongoMemoryServer } = await Promise.resolve(`${'mongodb-memory-server'}`).then(s => __importStar(require(s)));
            memoryServerInstance = await MongoMemoryServer.create();
            mongoUri = memoryServerInstance.getUri();
            isUsingMemoryServer = true;
        }
        mongoose_1.default.set('strictQuery', true);
        await mongoose_1.default.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`[DB] Connected to MongoDB (${isUsingMemoryServer ? 'Embedded Memory Server' : 'MongoDB Atlas / External Cluster'})`);
        return { uri: mongoUri, isMemory: isUsingMemoryServer };
    }
    catch (error) {
        console.error('[DB] Database connection error:', error);
        throw error;
    }
}
async function disconnectDatabase() {
    await mongoose_1.default.disconnect();
    if (memoryServerInstance) {
        await memoryServerInstance.stop();
        memoryServerInstance = null;
    }
}
