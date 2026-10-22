import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';

/**
 * Standalone staff sign-in. Not linked from the storefront; rendered without the
 * store's navbar/footer. Authorization is still enforced server-side on every
 * /api/admin request — this page only gates the UI.
 */
export const AdminLoginPage: React.FC = () => {
  const { user, authLoading, refreshAuth, logout } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Staff Sign In';
    if (!authLoading && user?.role === 'admin') navigate('/admin', { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.success && res.user?.role === 'admin') {
        await refreshAuth();
        navigate('/admin', { replace: true });
      } else if (res.user && res.user.role !== 'admin') {
        // A valid customer login must not leave a session open on the staff page
        await logout();
        setError('This account does not have administrator privileges. Please sign in with an admin account.');
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1E] flex items-center justify-center px-4 grain relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(197,160,89,0.12),transparent_60%)]" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm bg-[#111215] border border-[#C5A059]/25 rounded-2xl p-8 space-y-6 shadow-2xl"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto mb-3 w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#C5A059] via-[#DFBD78] to-[#9E7B36] shadow-lg shadow-[#C5A059]/20 flex items-center justify-center">
            <img
              src="/brand/logo.jpg"
              alt="MS Velora"
              width={96}
              height={96}
              className="h-full w-full rounded-full object-cover bg-[#FAF8F5]"
            />
          </div>
          <h1 className="font-serif-luxury text-3xl text-[#FAF8F5] font-semibold">Staff Console</h1>
          <p className="text-xs text-[#FAF8F5]/50">Authorized personnel only. Access is logged.</p>
        </div>

        <label className="block text-xs text-[#FAF8F5]/70">
          Email
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full px-3.5 py-3 rounded-lg bg-[#1A1A1E] border border-white/10 text-[#FAF8F5] focus:border-[#C5A059] outline-none placeholder:text-white/20"
          />
        </label>
        <label className="block text-xs text-[#FAF8F5]/70">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full px-3.5 py-3 rounded-lg bg-[#1A1A1E] border border-white/10 text-[#FAF8F5] focus:border-[#C5A059] outline-none placeholder:text-white/20"
          />
        </label>

        {error && (
          <p role="alert" className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-center">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-lux-gold w-full justify-center disabled:opacity-60">
          <Lock className="w-4 h-4" />
          {loading ? 'Verifying…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};
