"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const seedData_1 = require("./seedData");
async function runCliSeed() {
    try {
        await (0, db_1.connectDatabase)();
        await (0, seedData_1.seedDatabase)(true);
        console.log('[Seed CLI] Completed successfully.');
    }
    catch (err) {
        console.error('[Seed CLI] Failed:', err);
        process.exitCode = 1;
    }
    finally {
        await (0, db_1.disconnectDatabase)();
    }
}
runCliSeed();
