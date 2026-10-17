import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { InstallAppButton, PushToggleButton } from './AppActions';
import { Mail, Phone, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest } from '../lib/api';

export const Footer: React.FC = () => {
  const { settings, addToast } = useStore();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      setSubmitting(true);
      const res = await apiRequest('/api/content/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (res.success) {
        addToast(res.message, 'success');
        setEmail('');
      }
    } catch (err: any) {
      addToast(err.message || 'Please enter a valid email address.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#0D0D0D] text-[#FAF8F5] border-t border-[#C5A059]/25 no-print">
      {/* App + new-arrival alerts */}
      <div className="border-b border-white/10 bg-[radial-gradient(ellipse_at_20%_0%,rgba(197,160,89,0.12),transparent_60%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <img src="/brand/icon-192.png" alt="" width={52} height={52} className="w-13 h-13 rounded-xl shrink-0" />
            <div>
              <p className="font-serif-luxury text-2xl">Never miss a new arrival</p>
              <p className="text-sm text-[#FAF8F5]/60">Get a notification when new jewellery arrives, and install our app for faster shopping.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <PushToggleButton topic="new-arrivals" onLabel="Notify Me" offLabel="Notifications On" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#C5A059] hover:bg-[#DFBD78] text-[#0D0D0D] text-xs uppercase tracking-[0.18em] font-bold transition-colors disabled:opacity-60" />
            <InstallAppButton className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#C5A059]/50 hover:border-[#C5A059] hover:bg-[#C5A059]/10 text-[#FAF8F5] text-xs uppercase tracking-[0.18em] font-semibold transition-colors disabled:opacity-60" />
          </div>
        </div>
      </div>

      {/* Newsletter Collector Banner */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-2">
              <span className="text-xs uppercase tracking-[0.24em] text-[#C5A059] font-semibold">
                Newsletter
              </span>
              <h3 className="font-serif-luxury text-3xl sm:text-4xl font-semibold text-[#FAF8F5]">
                Get News About New Arrivals & Offers
              </h3>
              <p className="text-sm text-[#FAF8F5]/70 max-w-xl">
                Be the first to hear about new arrivals and special offers.
              </p>
            </div>
            <div className="lg:col-span-5">
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="flex-1 px-4 py-3.5 bg-[#1A1A1E] border border-white/15 rounded text-sm text-[#FAF8F5] placeholder:text-white/40 focus:outline-none focus:border-[#C5A059]"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3.5 bg-[#C5A059] hover:bg-[#DFBD78] text-[#0D0D0D] font-semibold text-xs uppercase tracking-[0.2em] rounded inline-flex items-center justify-center gap-2 transition-colors shrink-0"
                >
                  <span>{submitting ? 'Joining...' : 'Subscribe'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block" aria-label="MS Velora — home">
              <img
                src="/brand/logo.jpg"
                alt="MS Velora"
                width={128}
                height={128}
                loading="lazy"
                className="h-32 w-32"
              />
            </Link>

            <p className="text-sm text-[#FAF8F5]/70 leading-relaxed max-w-sm">
              Elegant jewellery for the modern woman — gift-boxed and delivered nationwide.
            </p>

            <div className="space-y-2 pt-2 text-xs text-[#FAF8F5]/75">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <span>
                  {settings?.showroomAddress ||
                    'Suite 402, MM Alam Road Luxury Galleria, Gulberg III, Lahore, Pakistan'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#C5A059] shrink-0" />
                <a href={`tel:${(settings?.contactPhone || '+92 300 0000000').replace(/[^+\d]/g, '')}`} className="hover:text-[#C5A059] transition-colors">{settings?.contactPhone || '+92 300 0000000'}</a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#C5A059] shrink-0" />
                <span>{settings?.contactEmail || 'concierge@msvelora.pk'}</span>
              </div>
            </div>
          </div>

          {/* Curated Collections */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#C5A059] font-semibold">
              Collections
            </h4>
            <ul className="space-y-2.5 text-sm text-[#FAF8F5]/75">
              <li>
                <Link to="/collections/everyday-elegance" className="hover:text-[#C5A059] transition-colors">
                  Everyday Elegance
                </Link>
              </li>
              <li>
                <Link to="/collections/bridal-couture" className="hover:text-[#C5A059] transition-colors">
                  Bridal Couture
                </Link>
              </li>
              <li>
                <Link to="/collections/pearl-edit" className="hover:text-[#C5A059] transition-colors">
                  Luxury Mechanical
                </Link>
              </li>
              <li>
                <Link to="/collections/festive-glow" className="hover:text-[#C5A059] transition-colors">
                  Minimalist & Dress
                </Link>
              </li>
              <li>
                <Link to="/collections/gift-picks" className="hover:text-[#C5A059] transition-colors">
                  Diver & Sports
                </Link>
              </li>
              <li>
                <Link to="/shop?onSale=true" className="hover:text-[#C5A059] transition-colors">
                  Privilege Sale
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#C5A059] font-semibold">
              Help
            </h4>
            <ul className="space-y-2.5 text-sm text-[#FAF8F5]/75">
              <li>
                <Link to="/track-order" className="hover:text-[#C5A059] transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className="hover:text-[#C5A059] transition-colors">
                  Wishlist
                </Link>
              </li>
              <li>
                <Link to="/shipping-returns" className="hover:text-[#C5A059] transition-colors">
                  Shipping & Returns Policy
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#C5A059] transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Authenticity */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#C5A059] font-semibold">
              Legal & Warranty
            </h4>
            <ul className="space-y-2.5 text-sm text-[#FAF8F5]/75">
              <li>
                <Link to="/privacy-policy" className="hover:text-[#C5A059] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-[#C5A059] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/shipping-returns" className="hover:text-[#C5A059] transition-colors">
                  2-Year Official Warranty
                </Link>
              </li>
            </ul>

            <div className="pt-2 p-3.5 rounded-lg bg-[#1A1A1E] border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#C5A059]">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Payment & Delivery</span>
              </div>
              <p className="text-[11px] text-[#FAF8F5]/65 leading-relaxed">
                Cash on Delivery, Online Payment (JazzCash / EasyPaisa) and Bank Transfer — all in PKR.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 bg-[#08080A] py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#FAF8F5]/55">
          <p>© {new Date().getFullYear()} MS Velora. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 font-mono-code text-[11px]">
              PKR (Rs.)
            </span>
            <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[11px]">
              Cash on Delivery
            </span>
            <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[11px]">
              JazzCash / EasyPaisa
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
