import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { User } from '../models/User';
import { Order } from '../models/Order';
import {
  requireAuth,
  signAuthToken,
  setAuthCookie,
  clearAuthCookie,
} from '../middleware/auth';
import { authRateLimiter } from '../middleware/security';
import { AppError } from '../middleware/errorHandler';
import { logAudit } from '../utils/helpers';
import { env } from '../config/env';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Please provide a valid email address'),
  phone: z
    .string()
    .min(10, 'Please enter a valid Pakistani or international phone number')
    .max(20)
    .optional()
    .default(''),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const addressSchema = z.object({
  label: z.string().min(1).max(40).default('Home'),
  fullName: z.string().min(2, 'Recipient name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  streetAddress: z.string().min(5, 'Complete street address is required'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
  postalCode: z.string().min(4, 'Postal code is required'),
  country: z.string().default('Pakistan'),
  isDefault: z.boolean().optional().default(false),
});

function formatUserResponse(user: InstanceType<typeof User>) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    addresses: user.addresses,
    wishlist: user.wishlist,
    createdAt: user.createdAt,
  };
}

// POST /api/auth/register
router.post(
  '/register',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Single-login store: customers check out as guests; public sign-up is closed
      if (process.env.ALLOW_CUSTOMER_SIGNUP !== 'true') {
        throw new AppError('Account registration is closed. You can order as a guest.', 403);
      }
      const data = registerSchema.parse(req.body);
      const existing = await User.findOne({ email: data.email.toLowerCase() });
      if (existing) {
        throw new AppError('An account with this email address already exists.', 409);
      }

      const passwordHash = await bcrypt.hash(data.password, 12);
      const user = await User.create({
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        passwordHash,
        role: 'customer',
        lastLoginAt: new Date(),
      });

      const token = signAuthToken(user);
      setAuthCookie(res, token);

      res.status(201).json({
        success: true,
        message: 'Welcome to MS Velora. Your account has been created.',
        user: formatUserResponse(user),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await User.findOne({ email: data.email.toLowerCase() }).select('+passwordHash');
      if (!user) {
        throw new AppError('Invalid email or password.', 401);
      }

      if (user.status === 'suspended') {
        throw new AppError('Your account has been suspended. Please contact customer support.', 403);
      }

      // Only the bcrypt hash stored in MongoDB is accepted. Never add fallback or
      // shared passwords here — they bypass authentication for every admin.
      const isMatch = await user.comparePassword(data.password);
      if (!isMatch) {
        throw new AppError('Invalid email or password.', 401);
      }

      user.lastLoginAt = new Date();
      // Single admin session: a new admin login revokes every previously issued token,
      // so only the most recent device stays signed in.
      if (user.role === 'admin') {
        user.tokenVersion = (user.tokenVersion || 0) + 1;
      }
      await user.save();

      const token = signAuthToken(user);
      setAuthCookie(res, token);

      if (user.role === 'admin') {
        await logAudit({
          user,
          action: 'ADMIN_LOGIN',
          entityType: 'auth',
          details: `Administrator ${user.email} signed in`,
          ipAddress: req.ip,
        });
      }

      res.json({
        success: true,
        message: `Welcome back, ${user.name}.`,
        user: formatUserResponse(user),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Signed out successfully.' });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!._id).populate(
      'wishlist',
      'name slug brand model price salePrice mainImage stock status specifications averageRating reviewCount'
    );
    if (!user) {
      throw new AppError('User not found.', 404);
    }
    res.json({
      success: true,
      user: formatUserResponse(user),
      wishlistItems: user.wishlist,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().min(2).max(100),
      phone: z.string().min(7).max(20).optional().default(''),
    });
    const data = schema.parse(req.body);
    const user = await User.findById(req.user!._id);
    if (!user) throw new AppError('User not found.', 404);

    user.name = data.name;
    user.phone = data.phone;
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: formatUserResponse(user),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/addresses
router.post('/addresses', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = addressSchema.parse(req.body);
    const user = await User.findById(req.user!._id);
    if (!user) throw new AppError('User not found.', 404);

    if (data.isDefault || user.addresses.length === 0) {
      user.addresses.forEach((a) => {
        a.isDefault = false;
      });
      data.isDefault = true;
    }

    user.addresses.push(data);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Delivery address saved.',
      addresses: user.addresses,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/addresses/:addressId
router.put(
  '/addresses/:addressId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = addressSchema.partial().parse(req.body);
      const user = await User.findById(req.user!._id);
      if (!user) throw new AppError('User not found.', 404);

      const addr = user.addresses.find((a) => String(a._id) === req.params.addressId);
      if (!addr) throw new AppError('Address not found.', 404);

      if (data.isDefault) {
        user.addresses.forEach((a) => {
          a.isDefault = false;
        });
      }

      Object.assign(addr, data);
      await user.save();

      res.json({
        success: true,
        message: 'Address updated.',
        addresses: user.addresses,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/auth/addresses/:addressId
router.delete(
  '/addresses/:addressId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.user!._id);
      if (!user) throw new AppError('User not found.', 404);

      user.addresses = user.addresses.filter((a) => String(a._id) !== req.params.addressId);
      if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
        user.addresses[0].isDefault = true;
      }
      await user.save();

      res.json({
        success: true,
        message: 'Address removed.',
        addresses: user.addresses,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/auth/password
router.put('/password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z
        .string()
        .min(8, 'New password must be at least 8 characters')
        .max(128, 'New password is too long')
        .regex(/[A-Z]/, 'New password must contain an uppercase letter')
        .regex(/[0-9]/, 'New password must contain a number'),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);
    const user = await User.findById(req.user!._id).select('+passwordHash');
    if (!user) throw new AppError('User not found.', 404);

    // The admin account guards all orders and customer data: require a stronger password
    if (
      user.role === 'admin' &&
      (newPassword.length < 12 || !/[a-z]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword))
    ) {
      throw new AppError(
        'Admin password must be at least 12 characters and include upper and lower case letters, a number and a symbol.',
        400
      );
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const token = signAuthToken(user);
    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Password updated and other active sessions have been signed out.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/invalidate-sessions
router.post(
  '/invalidate-sessions',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.user!._id);
      if (!user) throw new AppError('User not found.', 404);

      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      const token = signAuthToken(user);
      setAuthCookie(res, token);

      res.json({
        success: true,
        message: 'All other active device sessions have been invalidated.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const user = await User.findOne({ email: email.toLowerCase() }).select(
        '+resetPasswordToken +resetPasswordExpires'
      );

      let demoResetToken: string | undefined;
      if (user && user.status === 'active') {
        const rawToken = crypto.randomBytes(24).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();
        demoResetToken = rawToken;
      }

      res.json({
        success: true,
        message:
          'If an account exists with this email, password recovery instructions have been generated.',
        // Returned in non-production environments when SMTP is not configured so the flow can be tested end-to-end
        ...(process.env.NODE_ENV !== 'production' && demoResetToken ? { resetToken: demoResetToken } : {}),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        token: z.string().min(10, 'Valid reset token is required'),
        newPassword: z
          .string()
          .min(8, 'Password must be at least 8 characters')
          .regex(/[A-Z]/, 'Password must contain an uppercase letter')
          .regex(/[0-9]/, 'Password must contain a number'),
      });
      const { token, newPassword } = schema.parse(req.body);
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+passwordHash +resetPasswordToken +resetPasswordExpires');

      if (!user) {
        throw new AppError('Password reset token is invalid or has expired.', 400);
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      const authToken = signAuthToken(user);
      setAuthCookie(res, authToken);

      res.json({
        success: true,
        message: 'Your password has been reset successfully.',
        user: formatUserResponse(user),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/wishlist/:productId (Toggle product in wishlist)
router.post(
  '/wishlist/:productId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.user!._id);
      if (!user) throw new AppError('User not found.', 404);

      const prodId = req.params.productId;
      const idx = user.wishlist.findIndex((id) => String(id) === prodId);
      let action: 'added' | 'removed' = 'added';

      if (idx > -1) {
        user.wishlist.splice(idx, 1);
        action = 'removed';
      } else {
        user.wishlist.push(prodId as unknown as (typeof user.wishlist)[0]);
      }

      await user.save();
      const populated = await User.findById(user._id).populate(
        'wishlist',
        'name slug brand model price salePrice mainImage stock status specifications averageRating reviewCount'
      );

      res.json({
        success: true,
        action,
        message: action === 'added' ? 'Added to your wishlist.' : 'Removed from your wishlist.',
        wishlist: user.wishlist,
        wishlistItems: populated?.wishlist || [],
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/eligible-reviews (Products from delivered orders that the user hasn't reviewed yet)
router.get(
  '/eligible-reviews',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deliveredOrders = await Order.find({
        user: req.user!._id,
        fulfillmentStatus: { $in: ['delivered', 'confirmed', 'shipped'] },
      }).sort({ createdAt: -1 });

      const productMap = new Map<string, { productId: string; name: string; slug: string; image: string; orderNumber: string }>();
      for (const order of deliveredOrders) {
        for (const item of order.items) {
          if (!item.product) continue;
          const pid = String(item.product);
          if (!productMap.has(pid)) {
            productMap.set(pid, {
              productId: pid,
              name: item.name,
              slug: item.slug || '',
              image: item.image || '',
              orderNumber: order.orderNumber,
            });
          }
        }
      }

      res.json({
        success: true,
        eligibleProducts: Array.from(productMap.values()),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
