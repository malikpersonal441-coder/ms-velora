import crypto from 'crypto';
import mongoose from 'mongoose';
import { AuditLog, IAuditLog } from '../models/AuditLog';
import { Coupon, ICoupon } from '../models/Coupon';
import { IUser } from '../models/User';

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateSku(brand: string, model: string): string {
  const b = brand.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'MSV';
  const m = model.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'JWL';
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${b}-${m}-${rand}`;
}

/**
 * Temporary reference given when a customer places an order (e.g. REQ-7K2M9Q).
 * The permanent MS-001 style number is only assigned when the admin approves it.
 */
export function generateOrderNumber(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid misreading
  const bytes = crypto.randomBytes(6);
  return `REQ-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
}

export const isApprovedOrderNumber = (n: string) => /^MS-\d+$/.test(n);

/** Formats an approved sequence number: 1 -> MS-001, 1234 -> MS-1234. */
export const formatApprovedOrderNumber = (seq: number) => `MS-${String(seq).padStart(3, '0')}`;

export async function logAudit(params: {
  user?: IUser;
  action: string;
  entityType: IAuditLog['entityType'];
  entityId?: string;
  details: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await AuditLog.create({
      actorId: params.user?._id as mongoose.Types.ObjectId | undefined,
      actorName: params.user?.name || 'System',
      actorEmail: params.user?.email || 'system@msvelora.pk',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      ipAddress: params.ipAddress,
    });
  } catch (err) {
    console.error('[AuditLog Error]:', err);
  }
}

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  discountAmount: number;
  coupon?: ICoupon;
}

export async function evaluateCoupon(params: {
  code: string;
  subtotal: number;
  userId?: string;
  userEmail?: string;
  items?: { productId: string; categoryId?: string; lineTotal: number }[];
}): Promise<CouponValidationResult> {
  const normalizedCode = params.code.trim().toUpperCase();
  if (!normalizedCode) {
    return { valid: false, message: 'Please enter a coupon code.', discountAmount: 0 };
  }

  const coupon = await Coupon.findOne({ code: normalizedCode });
  if (!coupon || !coupon.isActive) {
    return { valid: false, message: 'Invalid or inactive coupon code.', discountAmount: 0 };
  }

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) {
    return { valid: false, message: 'This promotional code is not active yet.', discountAmount: 0 };
  }

  if (now > coupon.expiryDate) {
    return { valid: false, message: 'This coupon code has expired.', discountAmount: 0 };
  }

  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: 'This coupon has reached its maximum usage limit.', discountAmount: 0 };
  }

  if (params.subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      message: `Minimum order subtotal of Rs. ${coupon.minOrderAmount.toLocaleString()} is required for coupon ${coupon.code}.`,
      discountAmount: 0,
    };
  }

  // Check per-customer usage limit
  if (params.userId || params.userEmail) {
    const emailLower = params.userEmail?.toLowerCase();
    const customerUses = coupon.usedByUsers.filter(
      (u) =>
        (params.userId && u.userId && String(u.userId) === String(params.userId)) ||
        (emailLower && u.email === emailLower)
    ).length;

    if (customerUses >= (coupon.perCustomerLimit || 1)) {
      return {
        valid: false,
        message: 'You have already reached the usage limit for this coupon code.',
        discountAmount: 0,
      };
    }
  }

  // Check product or category restrictions if configured
  let eligibleSubtotal = params.subtotal;
  const hasProductRestriction = coupon.applicableProducts && coupon.applicableProducts.length > 0;
  const hasCategoryRestriction = coupon.applicableCategories && coupon.applicableCategories.length > 0;

  if ((hasProductRestriction || hasCategoryRestriction) && params.items && params.items.length > 0) {
    const allowedProdIds = new Set(coupon.applicableProducts.map((id) => String(id)));
    const allowedCatIds = new Set(coupon.applicableCategories.map((id) => String(id)));

    const matchingItems = params.items.filter(
      (item) =>
        (hasProductRestriction && allowedProdIds.has(String(item.productId))) ||
        (hasCategoryRestriction && item.categoryId && allowedCatIds.has(String(item.categoryId)))
    );

    if (matchingItems.length === 0) {
      return {
        valid: false,
        message: 'This coupon does not apply to the items currently in your bag.',
        discountAmount: 0,
      };
    }

    eligibleSubtotal = matchingItems.reduce((acc, item) => acc + item.lineTotal, 0);
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = Math.round((eligibleSubtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }
  } else {
    discountAmount = Math.min(coupon.discountValue, eligibleSubtotal);
  }

  discountAmount = Math.max(0, Math.min(discountAmount, params.subtotal));

  return {
    valid: true,
    message: `Coupon ${coupon.code} applied! You saved Rs. ${discountAmount.toLocaleString()}.`,
    discountAmount,
    coupon,
  };
}
