import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const Footer: React.FC = () => {
  const { settings } = useStore();

  return (
    <footer className="bg-white text-[#0D0D0D] border-t border-[#C5A059]/20 no-print">
      {/* Main Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-3.5 group" aria-label="MS Velora — home">
              <div className="rounded-full p-1 bg-gradient-to-tr from-[#C5A059] via-[#DFBD78] to-[#9E7B36] shadow-sm group-hover:shadow-[0_0_20px_rgba(197,160,89,0.35)] transition-all duration-300">
                <img
                  src="/brand/logo.jpg"
                  alt="MS Velora"
                  width={64}
                  height={64}
                  loading="lazy"
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-serif-luxury text-2xl font-bold tracking-[0.2em] text-[#0D0D0D] group-hover:text-[#9E7B36] transition-colors">
                  MS VELORA
                </span>
                <span className="text-[10px] uppercase tracking-[0.32em] text-[#C5A059] font-medium">
                  Timeless Elegance
                </span>
              </div>
            </Link>

            <p className="text-sm text-neutral-600 leading-relaxed max-w-sm">
              Elegant jewellery for the modern woman — gift-boxed and delivered nationwide.
            </p>

            <div className="space-y-2 pt-2 text-xs text-neutral-600">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <span>
                  {settings?.showroomAddress ||
                    'Suite 402, MM Alam Road Luxury Galleria, Gulberg III, Lahore, Pakistan'}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#C5A059] shrink-0" />
                <a href={`tel:${(settings?.contactPhone || '+92 308 5060106').replace(/[^+\d]/g, '')}`} className="hover:text-[#C5A059] transition-colors">{settings?.contactPhone || '+92 308 5060106'}</a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#C5A059] shrink-0" />
                <span>{settings?.contactEmail || 'msvelora@gmail.com'}</span>
              </div>
            </div>
          </div>

          {/* Curated Collections */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#9E7B36] font-semibold">
              Collections
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral-600">
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
                  Pearl Edit
                </Link>
              </li>
              <li>
                <Link to="/collections/festive-glow" className="hover:text-[#C5A059] transition-colors">
                  Festive Glow
                </Link>
              </li>
              <li>
                <Link to="/collections/gift-picks" className="hover:text-[#C5A059] transition-colors">
                  Gift Picks
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
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#9E7B36] font-semibold">
              Help
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral-600">
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
            <h4 className="text-xs uppercase tracking-[0.2em] text-[#9E7B36] font-semibold">
              Legal & Warranty
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral-600">
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

            <div className="pt-2 p-3.5 rounded-lg bg-[#FAF8F5] border border-black/8 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9E7B36]">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Payment & Delivery</span>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                Cash on Delivery, Online Payment (JazzCash / EasyPaisa) and Bank Transfer — all in PKR.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-black/5 bg-[#F8F7F4] py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} MS Velora. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="px-2.5 py-1 rounded bg-white border border-black/8 font-mono-code text-[11px] text-neutral-600">
              PKR (Rs.)
            </span>
            <span className="px-2.5 py-1 rounded bg-white border border-black/8 text-[11px] text-neutral-600">
              Cash on Delivery
            </span>
            <span className="px-2.5 py-1 rounded bg-white border border-black/8 text-[11px] text-neutral-600">
              JazzCash / EasyPaisa
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
