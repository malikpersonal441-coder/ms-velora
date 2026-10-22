import React from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

/** Returns a wa.me link builder for the store's WhatsApp number, or null if none is set. */
export function useWhatsAppLink(): ((message: string) => string) | null {
  const { settings } = useStore();
  const digits = (settings?.whatsappNumber || '').replace(/\D/g, '');
  if (!digits) return null;
  return (message: string) => `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Floating concierge button, bottom-right on storefront pages. */
export const WhatsAppButton: React.FC = () => {
  const link = useWhatsAppLink();
  const { pathname } = useLocation();
  if (!link || pathname.startsWith('/admin') || pathname.startsWith('/checkout')) return null;

  return (
    <a
      href={link('Hello MS Velora! I would like to ask about a jewellery piece.')}
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed bottom-[72px] lg:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-0 hover:gap-2.5 h-12 sm:h-14 pl-3.5 pr-3.5 sm:pl-4 sm:pr-4 rounded-full bg-white text-[#F2EFE9] border border-[#C5A059]/40 shadow-[0_8px_25px_rgba(0,0,0,0.12)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#25D366] hover:border-[#25D366] hover:text-white"
    >
      <span className="absolute inset-0 rounded-full border border-[#C5A059]/30 animate-ping [animation-duration:2.8s] group-hover:hidden" />
      <MessageCircle className="w-6 h-6 shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs uppercase tracking-[0.18em] font-semibold transition-all duration-500 group-hover:max-w-[160px]">
        Ask a Specialist
      </span>
    </a>
  );
};
