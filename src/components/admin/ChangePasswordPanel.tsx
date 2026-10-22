import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldCheck, Check, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';

interface Props {
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Mirrors the server rules in PUT /api/auth/password (server stays the source of truth)
const RULES = [
  { test: (p: string) => p.length >= 12, label: 'At least 12 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'An uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'A lowercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'A number' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'A symbol (e.g. ! @ # $)' },
];

export const ChangePasswordPanel: React.FC<Props> = ({ addToast }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const passed = RULES.map((r) => r.test(next));
  const strong = passed.every(Boolean);
  const matches = next.length > 0 && next === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!strong) return setError('The new password does not meet all the requirements.');
    if (!matches) return setError('The new passwords do not match.');
    if (next === current) return setError('The new password must be different from the current one.');

    setSaving(true);
    try {
      const res = await apiRequest('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.success) {
        addToast('Password changed. All other devices have been signed out.', 'success');
        setCurrent('');
        setNext('');
        setConfirm('');
      }
    } catch (err: any) {
      setError(err.message || 'Could not change the password.');
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    autoComplete: string
  ) => (
    <label className="block text-xs">
      <span className="font-semibold text-neutral-700">{label}</span>
      <input
        type={show ? 'text' : 'password'}
        required
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => set(e.target.value)}
        className="mt-1 w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg font-mono-code focus:border-[#C5A059] outline-none"
      />
    </label>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <form onSubmit={handleSubmit} className="lg:col-span-3 bg-white rounded-xl border border-black/8 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-serif-luxury text-2xl font-semibold flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#C5A059]" /> Change Admin Password
          </h3>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-[#F2EFE9]"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {show ? 'Hide' : 'Show'}
          </button>
        </div>

        {field('Current password', current, setCurrent, 'current-password')}
        {field('New password', next, setNext, 'new-password')}

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
          {RULES.map((r, i) => (
            <li key={r.label} className={`flex items-center gap-1.5 ${passed[i] ? 'text-emerald-700' : 'text-neutral-400'}`}>
              {passed[i] ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              {r.label}
            </li>
          ))}
        </ul>

        {field('Confirm new password', confirm, setConfirm, 'new-password')}
        {confirm.length > 0 && !matches && <p className="text-xs text-red-600">Passwords do not match.</p>}

        {error && (
          <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !strong || !matches || !current}
          className="w-full py-3 bg-[#F2EFE9] hover:bg-[#C5A059] text-[#1C1C1F] hover:text-[#F2EFE9] text-xs uppercase tracking-[0.2em] font-bold rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-[#F2EFE9] disabled:hover:text-[#1C1C1F]"
        >
          {saving ? 'Updating…' : 'Update Password'}
        </button>
      </form>

      <div className="lg:col-span-2 bg-[#F2EFE9] text-[#1C1C1F] rounded-xl p-6 space-y-4 text-sm">
        <h3 className="font-serif-luxury text-2xl font-semibold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#C5A059]" /> How your login is protected
        </h3>
        <ul className="space-y-3 text-xs text-[#1C1C1F]/75 leading-relaxed">
          <li>• Your password is stored in MongoDB only as a bcrypt hash — nobody, including us, can read it.</li>
          <li>• Changing it signs out every other device that was logged in as admin.</li>
          <li>• Only one admin account can exist; the database rejects a second.</li>
          <li>• Login is limited to 30 attempts per 15 minutes to stop password guessing.</li>
          <li>• Use a password manager, and never share this password over WhatsApp or email.</li>
        </ul>
      </div>
    </div>
  );
};
