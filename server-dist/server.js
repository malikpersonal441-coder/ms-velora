"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const seedData_1 = require("./seed/seedData");
async function bootstrap() {
    try {
        await (0, db_1.connectDatabase)();
        await (0, seedData_1.seedDatabase)(false);
        app_1.default.listen(env_1.env.PORT, () => {
            console.log(`=========================================================`);
            console.log(`  MS VELORA BACKEND API SERVER`);
            console.log(`  Port: ${env_1.env.PORT} | Environment: ${env_1.env.NODE_ENV}`);
            console.log(`  Admin Login: ${env_1.env.ADMIN_EMAIL}`);
            console.log(`=========================================================`);
        });
    }
    catch (err) {
        console.error('[Server Bootstrap Failed]:', err);
        process.exit(1);
    }
}
bootstrap();
