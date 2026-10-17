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
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const SavedAddressSchema = new mongoose_1.Schema({
    label: { type: String, required: true, trim: true, default: 'Home' },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    streetAddress: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: 'Pakistan' },
    isDefault: { type: Boolean, default: false },
}, { _id: true });
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    phone: { type: String, default: '', trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer',
        index: true,
    },
    status: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active',
        index: true,
    },
    tokenVersion: { type: Number, default: 0 },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    addresses: { type: [SavedAddressSchema], default: [] },
    wishlist: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' }],
    lastLoginAt: { type: Date },
}, { timestamps: true });
UserSchema.methods.comparePassword = async function (candidate) {
    return bcryptjs_1.default.compare(candidate, this.passwordHash);
};
// Single-administrator store: the database itself rejects a second admin account
UserSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'admin' }, name: 'single_admin' });
exports.User = mongoose_1.default.model('User', UserSchema);
