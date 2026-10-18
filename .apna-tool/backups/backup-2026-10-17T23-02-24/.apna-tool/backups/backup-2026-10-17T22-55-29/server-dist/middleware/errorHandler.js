"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const env_1 = require("../config/env");
class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
function errorHandler(err, _req, res, _next) {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }
    if (err instanceof zod_1.ZodError) {
        const errors = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));
        res.status(400).json({
            success: false,
            message: errors[0]?.message || 'Validation failed',
            errors,
        });
        return;
    }
    const mongoErr = err;
    if (mongoErr && mongoErr.code === 11000) {
        const field = mongoErr.keyValue ? Object.keys(mongoErr.keyValue)[0] : 'field';
        res.status(409).json({
            success: false,
            message: `Duplicate value for ${field}. Please use a unique value.`,
        });
        return;
    }
    if (mongoErr && mongoErr.name === 'CastError') {
        res.status(400).json({
            success: false,
            message: 'Invalid resource identifier format.',
        });
        return;
    }
    if (env_1.env.NODE_ENV !== 'test') {
        console.error('[Server Error]:', err);
    }
    res.status(500).json({
        success: false,
        message: 'An unexpected server error occurred. Please try again later.',
    });
}
