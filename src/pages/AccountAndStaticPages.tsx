import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Package,
  MapPin,
  Heart,
  Shield,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  Gem,
  KeyRound,
  Mail,
  Phone,
  Clock,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  apiRequest,
  formatPrice,
  formatDateTime,
  PAKISTAN_PROVINCES,
} from '../lib/api';
import { Order } from '../types';
import { ProductCard } from '../components/ProductCard';

export const LoginPage: React.FC = () => {
  const { user, refreshAuth, addToast } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Sign In — MS Velora';
    if (user) {
      navigate('/account');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.success) {
        await refreshAuth();
        addToast(res.message, 'success');
        navigate('/account');
      }
    } catch (err: any) {
      addToast(err.message || 'Invalid credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 pb-24">
      <div className="bg-white p-8 rounded-2xl border border-black/10 shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-[0.24em] text-[#D4B06A] font-semibold">
            MS Velora Vault Access
          </span>
          <h1 className="font-serif-luxury text-3xl font-semibold text-[#F2EFE9]">
            Sign In to Your Account
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="collector@msvelora.pk"
              className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#F2EFE9]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-neutral-700">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-[#D4B06A] hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-[#F2EFE9]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#F2EFE9] hover:bg-[#C5A059] text-[#1C1C1F] hover:text-[#F2EFE9] text-xs uppercase tracking-[0.2em] font-bold rounded-lg transition-colors"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-neutral-500">
          New to MS Velora?{' '}
          <Link to="/register" className="text-[#D4B06A] font-semibold hover:underline">
            Create a Collector Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const { refreshAuth, addToast } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Create Collector Account — MS Velora';
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, password }),
      });
      if (res.success) {
        await refreshAuth();
        addToast(res.message, 'success');
        navigate('/account');
      }
    } catch (err: any) {
      addToast(err.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 pb-24">
      <div className="bg-white p-8 rounded-2xl border border-black/10 shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-[0.24em] text-[#D4B06A] font-semibold">
            Collector Membership
          </span>
          <h1 className="font-serif-luxury text-3xl font-semibold text-[#F2EFE9]">
            Create Your Account
          </h1>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Zainab Sikandar"
              className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0300 1234567"
              className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1">
              Password (Min 8 chars, 1 uppercase, 1 number) *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#F2EFE9] hover:bg-[#C5A059] text-[#1C1C1F] hover:text-[#F2EFE9] text-xs uppercase tracking-[0.2em] font-bold rounded-lg transition-colors"
          >
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        <p className="text-center text-xs text-neutral-500">
          Already registered?{' '}
          <Link to="/login" className="text-[#D4B06A] font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const { addToast, refreshAuth } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (res.success) {
        addToast(res.message, 'info');
        if (res.resetToken) {
          setResetToken(res.resetToken);
        }
        setStep('reset');
      }
    } catch (err: any) {
      addToast(err.message || 'Could not request password reset.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      if (res.success) {
        await refreshAuth();
        addToast(res.message, 'success');
        navigate('/account');
      }
    } catch (err: any) {
      addToast(err.message || 'Invalid or expired reset token.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 pb-24">
      <div className="bg-white p-8 rounded-2xl border border-black/10 shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <KeyRound className="w-8 h-8 text-[#C5A059] mx-auto" />
          <h1 className="font-serif-luxury text-3xl font-semibold">Password Recovery</h1>
        </div>

        {step === 'request' ? (
          <form onSubmit={handleRequestToken} className="space-y-4">
            <p className="text-xs text-neutral-600 text-center">
              Enter your registered email address to generate a secure password recovery token.
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="collector@msvelora.pk"
              className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#F2EFE9] text-[#1C1C1F] text-xs uppercase tracking-widest font-semibold rounded-lg"
            >
              {loading ? 'Sending...' : 'Request Reset Token'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1">
                Recovery Token
              </label>
              <input
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className="w-full px-4 py-2.5 text-xs font-mono-code border border-neutral-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1">
                New Password (Min 8 chars, 1 uppercase, 1 number)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#C5A059] text-[#F2EFE9] text-xs uppercase tracking-widest font-bold rounded-lg"
            >
              {loading ? 'Updating Password...' : 'Set New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export const AccountDashboardPage: React.FC = () => {
  const { user, authLoading, logout, refreshAuth, wishlistProducts, addToast } = useStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'addresses' | 'wishlist' | 'security'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // New Address form
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('Lahore');
  const [addrProvince, setAddrProvince] = useState('Punjab');
  const [addrPostal, setAddrPostal] = useState('54000');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    document.title = 'My Collector Account — MS Velora';
    if (!authLoading && !user) {
      navigate('/login');
    }
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
      setAddrName(user.name);
      setAddrPhone(user.phone || '');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    async function loadOrders() {
      if (!user) return;
      try {
        setOrdersLoading(true);
        const res = await apiRequest('/api/orders/my-orders');
        if (res.success) {
          setOrders(res.orders || []);
        }
      } catch {
        // ignore
      } finally {
        setOrdersLoading(false);
      }
    }
    loadOrders();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm uppercase tracking-widest text-neutral-500">
        Loading Collector Account...
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, phone }),
      });
      if (res.success) {
        await refreshAuth();
        addToast(res.message, 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Could not update profile.', 'error');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/auth/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: addrLabel,
          fullName: addrName,
          phone: addrPhone,
          streetAddress: addrStreet,
          city: addrCity,
          province: addrProvince,
          postalCode: addrPostal,
          country: 'Pakistan',
          isDefault: true,
        }),
      });
      if (res.success) {
        await refreshAuth();
        setAddrStreet('');
        addToast(res.message, 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Could not save address.', 'error');
    }
  };

  const handleDeleteAddress = async (addressId?: string) => {
    if (!addressId) return;
    try {
      const res = await apiRequest(`/api/auth/addresses/${addressId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        await refreshAuth();
        addToast(res.message, 'info');
      }
    } catch (err: any) {
      addToast(err.message || 'Could not remove address.', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.success) {
        setCurrentPassword('');
        setNewPassword('');
        addToast(res.message, 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Could not update password.', 'error');
    }
  };

  const handleInvalidateSessions = async () => {
    try {
      const res = await apiRequest('/api/auth/invalidate-sessions', { method: 'POST' });
      if (res.success) {
        addToast(res.message, 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Action failed.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-neutral-200">
        <div>
          <span className="text-xs uppercase tracking-[0.22em] text-[#D4B06A] font-semibold">
            Private Collector Portal
          </span>
          <h1 className="font-serif-luxury text-4xl font-semibold text-[#F2EFE9]">
            Welcome, {user.name}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">{user.email}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-neutral-300 hover:border-red-600 hover:text-red-600 rounded text-xs uppercase tracking-wider font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
        {/* Sidebar Tabs */}
        <aside className="lg:col-span-3 space-y-1.5">
          {[
            { id: 'orders', label: 'Order History', icon: Package },
            { id: 'profile', label: 'Profile Details', icon: UserIcon },
            { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
            { id: 'wishlist', label: `Wishlist (${wishlistProducts.length})`, icon: Heart },
            { id: 'security', label: 'Account Security', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-xs uppercase tracking-[0.15em] font-semibold transition-all ${
                  active
                    ? 'bg-[#F2EFE9] text-[#C5A059]'
                    : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-black/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Panel */}
        <div className="lg:col-span-9">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h2 className="font-serif-luxury text-2xl font-semibold">
                Your Orders ({orders.length})
              </h2>
              {ordersLoading ? (
                <div className="p-8 bg-white rounded-xl border border-black/8 text-center text-xs uppercase tracking-widest text-neutral-500">
                  Loading Orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="p-12 bg-white rounded-xl border border-black/8 text-center space-y-3">
                  <Package className="w-10 h-10 text-[#C5A059] mx-auto" />
                  <p className="text-base font-medium">You have not placed any orders yet.</p>
                  <Link
                    to="/shop"
                    className="inline-block px-6 py-3 bg-[#F2EFE9] text-[#1C1C1F] text-xs uppercase tracking-widest rounded"
                  >
                    Explore Jewellery
                  </Link>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order._id}
                    className="bg-white rounded-xl border border-black/8 p-6 space-y-4 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                      <div>
                        <span className="font-mono-code text-base font-bold text-[#F2EFE9]">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs text-neutral-400 block">
                          {formatDateTime(order.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-[#F2EFE9] text-[#C5A059] text-[11px] font-bold uppercase tracking-wider">
                          {order.fulfillmentStatus}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-semibold uppercase tracking-wider">
                          {order.paymentStatus}
                        </span>
                        <Link
                          to={`/order-confirmation/${order.orderNumber}`}
                          className="px-3 py-1 rounded border border-neutral-300 hover:border-[#F2EFE9] text-xs font-medium"
                        >
                          Invoice / Details
                        </Link>
                      </div>
                    </div>

                    <div className="divide-y divide-neutral-100">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-14 rounded object-cover bg-[#26262B]"
                            />
                            <div>
                              <Link
                                to={`/product/${item.slug}`}
                                className="font-serif-luxury text-base font-semibold hover:text-[#D4B06A]"
                              >
                                {item.name}
                              </Link>
                              <p className="text-xs text-neutral-500">
                                Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono-code text-xs font-bold">
                            {formatPrice(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-sm">
                      <span className="text-xs text-neutral-500">
                        {order.trackingNumber
                          ? `Courier: ${order.courierName} (#${order.trackingNumber})`
                          : `Delivery to ${order.shippingAddress.city}`}
                      </span>
                      <span className="font-mono-code font-bold text-[#F2EFE9]">
                        Total: {formatPrice(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <form
              onSubmit={handleUpdateProfile}
              className="bg-white p-6 sm:p-8 rounded-xl border border-black/8 space-y-5 max-w-xl"
            >
              <h2 className="font-serif-luxury text-2xl font-semibold">Profile Information</h2>
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full px-4 py-2.5 text-sm border border-neutral-200 rounded-lg bg-neutral-100 text-neutral-500"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-[#F2EFE9] hover:bg-[#C5A059] text-[#1C1C1F] hover:text-[#F2EFE9] text-xs uppercase tracking-widest font-semibold rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </form>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.addresses?.map((addr) => (
                  <div
                    key={addr._id}
                    className="bg-white p-5 rounded-xl border border-black/8 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase tracking-wider text-[#D4B06A]">
                          {addr.label}
                        </span>
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-sm text-[#F2EFE9]">{addr.fullName}</p>
                      <p className="text-neutral-600">{addr.streetAddress}</p>
                      <p className="text-neutral-600">
                        {addr.city}, {addr.province} {addr.postalCode}
                      </p>
                      <p className="text-neutral-500">Phone: {addr.phone}</p>
                    </div>
                    <div className="pt-2 border-t border-neutral-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr._id)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleAddAddress}
                className="bg-white p-6 rounded-xl border border-black/8 space-y-4"
              >
                <h3 className="font-serif-luxury text-xl font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#C5A059]" /> Add New Delivery Address
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    placeholder="Label (Home / Office)"
                    className="px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={addrName}
                    onChange={(e) => setAddrName(e.target.value)}
                    placeholder="Recipient Full Name"
                    className="px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    required
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    placeholder="Phone (0300 1234567)"
                    className="px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={addrStreet}
                    onChange={(e) => setAddrStreet(e.target.value)}
                    placeholder="Street Address"
                    className="px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg"
                  />
                  <select
                    value={addrProvince}
                    onChange={(e) => setAddrProvince(e.target.value)}
                    className="px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg bg-white"
                  >
                    {PAKISTAN_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    placeholder="City"
                    className="px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={addrPostal}
                    onChange={(e) => setAddrPostal(e.target.value)}
                    placeholder="Postal Code"
                    className="px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#F2EFE9] text-[#1C1C1F] text-xs uppercase tracking-widest font-semibold rounded-lg"
                >
                  Save Address
                </button>
              </form>
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="space-y-4">
              <h2 className="font-serif-luxury text-2xl font-semibold">Wishlist</h2>
              {wishlistProducts.length === 0 ? (
                <div className="p-12 bg-white rounded-xl border border-black/8 text-center text-sm text-neutral-500">
                  No pieces saved in your wishlist yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
                  {wishlistProducts.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 max-w-xl">
              <form
                onSubmit={handleChangePassword}
                className="bg-white p-6 rounded-xl border border-black/8 space-y-4"
              >
                <h3 className="font-serif-luxury text-2xl font-semibold">Change Password</h3>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-600 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-600 mb-1">
                    New Password (Min 8 chars, 1 uppercase, 1 number)
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#F2EFE9] text-[#1C1C1F] text-xs uppercase tracking-widest font-semibold rounded-lg"
                >
                  Update Password
                </button>
              </form>

              <div className="bg-white p-6 rounded-xl border border-black/8 space-y-3">
                <h3 className="font-serif-luxury text-xl font-semibold">
                  Active Device Session Control
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Invalidate all other active browser or mobile sessions signed in to your account while keeping your current session active.
                </p>
                <button
                  type="button"
                  onClick={handleInvalidateSessions}
                  className="px-5 py-2.5 border border-[#F2EFE9] hover:bg-[#F2EFE9] hover:text-[#1C1C1F] text-xs uppercase tracking-wider font-semibold rounded-lg transition-colors"
                >
                  Revoke Other Device Sessions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const WishlistPage: React.FC = () => {
  const { wishlistProducts } = useStore();

  useEffect(() => {
    document.title = 'Wishlist — MS Velora';
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24">
      <div className="mb-8">
        <span className="text-xs uppercase tracking-[0.22em] text-[#D4B06A] font-semibold">
          Curated Favorites
        </span>
        <h1 className="font-serif-luxury text-4xl font-semibold text-[#F2EFE9]">
          Your Wishlist ({wishlistProducts.length})
        </h1>
      </div>

      {wishlistProducts.length === 0 ? (
        <div className="bg-white p-14 rounded-2xl border border-black/8 text-center space-y-4">
          <Heart className="w-10 h-10 text-[#C5A059] mx-auto" />
          <h2 className="font-serif-luxury text-2xl font-semibold">Your Wishlist is Empty</h2>
          <p className="text-sm text-neutral-500 max-w-md mx-auto">
            Click the heart icon on any piece in our catalog to save it here for comparison.
          </p>
          <Link
            to="/shop"
            className="inline-block px-7 py-3.5 bg-[#F2EFE9] text-[#1C1C1F] text-xs uppercase tracking-widest font-semibold rounded"
          >
            Explore Jewellery
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
          {wishlistProducts.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
};

export const PolicyPage: React.FC<{ type: 'shipping' | 'privacy' | 'terms' | 'contact' }> = ({
  type,
}) => {
  const { settings, addToast } = useStore();
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  useEffect(() => {
    const titles = {
      shipping: 'Shipping, Returns & Warranty Policy — MS Velora',
      privacy: 'Privacy Policy — MS Velora',
      terms: 'Terms of Service — MS Velora',
      contact: 'Help & Showroom — MS Velora',
    };
    document.title = titles[type];
  }, [type]);

  if (type === 'contact') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 pb-24 space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-[0.24em] text-[#D4B06A] font-semibold">
            Customer Support
          </span>
          <h1 className="font-serif-luxury text-4xl sm:text-5xl font-semibold">
            Contact MS Velora Concierge
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white text-[#F2EFE9] p-8 rounded-2xl border border-[#C5A059]/25 shadow-xl space-y-6">
            <h2 className="font-serif-luxury text-2xl font-semibold text-[#D4B06A]">
              Visit MS Velora
            </h2>
            <div className="space-y-4 text-sm text-neutral-600">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#C5A059] shrink-0 mt-0.5" />
                <span>
                  {settings?.showroomAddress ||
                    'Lahore, Pakistan'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#C5A059] shrink-0" />
                <a href={`tel:${(settings?.contactPhone || '+92 300 0000000').replace(/[^+\d]/g, '')}`} className="hover:text-[#D4B06A] transition-colors">{settings?.contactPhone || '+92 300 0000000'}</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#C5A059] shrink-0" />
                <span>{settings?.contactEmail || 'concierge@msvelora.pk'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#C5A059] shrink-0" />
                <span>Monday – Saturday: 11:00 AM – 9:00 PM PKT</span>
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addToast(
                'Thank you. Our team will respond within 2 business hours.',
                'success'
              );
              setContactName('');
              setContactEmail('');
              setContactMsg('');
            }}
            className="bg-white p-8 rounded-2xl border border-black/10 space-y-4"
          >
            <h2 className="font-serif-luxury text-2xl font-semibold">Send an Inquiry</h2>
            <input
              type="text"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Your Full Name"
              className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg"
            />
            <input
              type="email"
              required
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Your Email Address"
              className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg"
            />
            <textarea
              rows={4}
              required
              value={contactMsg}
              onChange={(e) => setContactMsg(e.target.value)}
              placeholder="How can we help you?"
              className="w-full px-4 py-3 text-sm border border-neutral-300 rounded-lg"
            />
            <button
              type="submit"
              className="w-full py-3.5 bg-[#F2EFE9] hover:bg-[#C5A059] text-[#1C1C1F] hover:text-[#F2EFE9] text-xs uppercase tracking-widest font-bold rounded-lg transition-colors"
            >
              Submit Inquiry
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 pb-24">
      <div className="bg-white p-8 sm:p-12 rounded-2xl border border-black/10 space-y-6">
        <span className="text-xs uppercase tracking-[0.24em] text-[#D4B06A] font-semibold">
          MS Velora Official Charter
        </span>
        <h1 className="font-serif-luxury text-4xl font-semibold text-[#F2EFE9]">
          {type === 'shipping'
            ? 'Shipping, Returns & Official Warranty'
            : type === 'privacy'
            ? 'Privacy & Data Protection Policy'
            : 'Terms of Service & Authenticity Guarantee'}
        </h1>

        <div className="prose prose-neutral max-w-none space-y-4 text-sm text-neutral-700 leading-relaxed">
          {type === 'shipping' && (
            <>
              <h3 className="font-serif-luxury text-xl font-bold text-[#F2EFE9]">
                1. Insured Nationwide Delivery
              </h3>
              <p>
                {settings?.policies?.shippingPolicy ||
                  'All orders are dispatched in tamper-evident luxury packaging via insured courier partners across Pakistan.'}
              </p>
              <h3 className="font-serif-luxury text-xl font-bold text-[#F2EFE9]">
                2. 7-Day Inspection & Exchange Policy
              </h3>
              <p>
                {settings?.policies?.returnPolicy ||
                  'We offer a 7-day inspection and exchange guarantee from the date of delivery for unworn jewellery in its original box.'}
              </p>
              <h3 className="font-serif-luxury text-xl font-bold text-[#F2EFE9]">
                3. 2-Year Official Mechanical & Movement Warranty
              </h3>
              <p>
                Every piece purchased from MS Velora is covered by our plating and craftsmanship warranty.
              </p>
            </>
          )}
          {type === 'privacy' && (
            <p>
              {settings?.policies?.privacyPolicy ||
                'MS Velora protects your personal data with strict encryption and never stores raw payment card numbers.'}
            </p>
          )}
          {type === 'terms' && (
            <p>
              {settings?.policies?.termsOfService ||
                'All jewellery is quality-checked and subject to server-side price and stock validation at checkout.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const NotFoundPage: React.FC = () => {
  useEffect(() => {
    document.title = '404 Page Not Found — MS Velora';
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-5">
      <div className="w-16 h-16 rounded-full bg-[#F2EFE9] text-[#C5A059] flex items-center justify-center mx-auto border border-[#C5A059]">
        <Gem className="w-8 h-8" />
      </div>
      <span className="text-xs uppercase tracking-[0.26em] text-[#D4B06A] font-semibold block">
        Error 404
      </span>
      <h1 className="font-serif-luxury text-4xl sm:text-5xl font-semibold text-[#F2EFE9]">
        Page Not Found
      </h1>
      <p className="text-sm text-neutral-500 max-w-md mx-auto">
        The page you are looking for may have been moved or does not exist. Return to the MS Velora homepage or browse our jewellery collections.
      </p>
      <div className="flex items-center justify-center gap-4 pt-2">
        <Link
          to="/"
          className="px-6 py-3.5 bg-[#F2EFE9] text-[#1C1C1F] text-xs uppercase tracking-widest font-semibold rounded"
        >
          Return Home
        </Link>
        <Link
          to="/shop"
          className="px-6 py-3.5 border border-[#F2EFE9] text-[#F2EFE9] text-xs uppercase tracking-widest font-semibold rounded"
        >
          Browse Catalog
        </Link>
      </div>
    </div>
  );
};
