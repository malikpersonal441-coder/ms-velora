import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Crown, PenLine, PackageCheck, ArrowRight, Copy, Check, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../lib/api';

const MESSAGE_IDEAS = [
  { occasion: 'Anniversary', text: 'Every year with you shines a little brighter. Happy anniversary.' },
  { occasion: 'Birthday', text: 'For the one who makes every day feel like a celebration. Happy birthday!' },
  { occasion: 'Eid', text: 'Eid Mubarak! Wishing you joy, peace and a little sparkle.' },
  { occasion: 'Mehndi & Shaadi', text: 'For your big day — may this be the first of many beautiful memories.' },
  { occasion: 'Just because', text: 'No reason at all. You simply deserve something beautiful.' },
  { occasion: 'Thank you', text: 'A small thank you for everything you do. With love.' },
];

/** /gift-options — what gift wrap the store offers, at what price, and how to add it. Data comes from store settings. */
export const GiftOptionsPage: React.FC = () => {
  const { settings, categories, storefrontLoading } = useStore();
  const symbol = settings?.currencySymbol || 'Rs.';
  const cfg = settings?.giftOptions;
  const packages = (cfg?.packages || []).filter((p) => p.isActive);
  const available = Boolean(cfg?.enabled && packages.length > 0);
  const eligibleNames = (cfg?.eligibleCategories || [])
    .map((id) => categories.find((c) => c._id === id)?.name)
    .filter(Boolean) as string[];
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Gift Options — MS Velora';
  }, []);

  const copy = (i: number, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(i);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="bg-[#FAF8F5] pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#C5A059]/20 bg-[radial-gradient(ellipse_at_50%_0%,rgba(197,160,89,0.18),transparent_65%)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[#9E7B36] font-semibold">
            <Gift className="w-4 h-4" /> The Art of Gifting
          </span>
          <h1 className="mt-4 font-serif-luxury text-4xl sm:text-6xl font-semibold text-[#0D0D0D] leading-tight">
            Wrapped with care,
            <br className="hidden sm:block" /> opened with joy
          </h1>
          <p className="mt-5 text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto">
            Add gift packaging and a personal message to any eligible piece — right on the product page or from your bag. We pack it by hand and keep the price off the parcel.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-[#0D0D0D] hover:bg-[#C5A059] text-white hover:text-[#0D0D0D] text-xs uppercase tracking-[0.2em] font-bold transition-colors"
            >
              Shop Gifts <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#packaging" className="inline-flex items-center gap-2 px-7 py-4 rounded-xl border border-[#C5A059]/60 hover:bg-[#C5A059]/10 text-xs uppercase tracking-[0.2em] font-semibold">
              See packaging
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Sparkles, title: 'Choose a piece', text: 'Open any eligible product and switch on “Make it a gift”.' },
          { icon: PenLine, title: 'Personalise it', text: `Pick packaging, add the recipient’s name and a message of up to ${cfg?.messageMaxLength || 150} characters.` },
          { icon: PackageCheck, title: 'We do the rest', text: 'Your piece is hand-wrapped with a printed message card. Edit or remove gift wrap any time before checkout.' },
        ].map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="rounded-2xl bg-white border border-neutral-200/80 p-6">
            <span className="w-11 h-11 rounded-xl bg-[#0D0D0D] text-[#C5A059] flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </span>
            <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-[#9E7B36] font-semibold">Step {i + 1}</p>
            <h2 className="mt-1 font-serif-luxury text-xl font-semibold text-[#0D0D0D]">{title}</h2>
            <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">{text}</p>
          </div>
        ))}
      </section>

      {/* Packaging */}
      <section id="packaging" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#9E7B36] font-semibold">Packaging</p>
          <h2 className="mt-2 font-serif-luxury text-3xl sm:text-4xl font-semibold text-[#0D0D0D]">Choose how it arrives</h2>
          <p className="mt-2 text-sm text-neutral-500">Prices are per piece and are added to your order total before checkout.</p>
        </div>

        {storefrontLoading && !settings ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : !available ? (
          <div className="max-w-xl mx-auto text-center rounded-2xl bg-white border border-neutral-200/80 p-10">
            <Gift className="w-8 h-8 mx-auto text-[#C5A059]" />
            <p className="mt-3 font-serif-luxury text-2xl font-semibold">Gift wrapping is paused</p>
            <p className="mt-1.5 text-sm text-neutral-600">Every order still arrives in our signature MS Velora box. Gift wrapping will be back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((p) => (
              <article
                key={p.key}
                className={`relative rounded-2xl p-6 border flex flex-col ${
                  p.isPremium ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]' : 'bg-white border-neutral-200/80'
                }`}
              >
                {p.isPremium && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#C5A059] text-[#0D0D0D] text-[10px] font-bold uppercase tracking-wider">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                )}
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${p.isPremium ? 'bg-white/10 text-[#DFBD78]' : 'bg-[#C5A059]/15 text-[#9E7B36]'}`}>
                  <Gift className="w-6 h-6" />
                </span>
                <h3 className="mt-5 font-serif-luxury text-2xl font-semibold">{p.name}</h3>
                <p className={`mt-2 text-sm leading-relaxed flex-1 ${p.isPremium ? 'text-white/70' : 'text-neutral-600'}`}>{p.description}</p>
                <p className="mt-5 font-mono-code text-2xl font-bold">
                  {p.price === 0 ? 'Free' : formatPrice(p.price, symbol)}
                  {p.price > 0 && <span className={`ml-1 text-xs font-normal ${p.isPremium ? 'text-white/60' : 'text-neutral-500'}`}>/ piece</span>}
                </p>
              </article>
            ))}
          </div>
        )}

        {available && (
          <p className="mt-6 text-center text-sm text-neutral-600">
            {eligibleNames.length > 0 ? (
              <>
                Gift wrapping is available on <strong>{eligibleNames.join(', ')}</strong>.
              </>
            ) : (
              <>Gift wrapping is available on every piece in our collection.</>
            )}
          </p>
        )}
      </section>

      {/* Message ideas */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#9E7B36] font-semibold">Gift messages</p>
          <h2 className="mt-2 font-serif-luxury text-3xl sm:text-4xl font-semibold text-[#0D0D0D]">Not sure what to write?</h2>
          <p className="mt-2 text-sm text-neutral-500">Tap a message to copy it, then paste it into the gift message box.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MESSAGE_IDEAS.map((m, i) => (
            <button
              key={m.occasion}
              type="button"
              onClick={() => copy(i, m.text)}
              className="group text-left rounded-2xl bg-white border border-neutral-200/80 hover:border-[#C5A059] p-5 transition-colors"
            >
              <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-[#9E7B36] font-semibold">
                {m.occasion}
                {copied === i ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </span>
              <span className="mt-2 block font-serif-luxury italic text-lg text-neutral-800 leading-snug">“{m.text}”</span>
              <span className="sr-only">{copied === i ? 'Copied' : 'Copy message'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 text-center">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#C5A059] hover:bg-[#DFBD78] text-[#0D0D0D] text-xs uppercase tracking-[0.2em] font-bold transition-colors"
        >
          Find the perfect gift <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
};

export default GiftOptionsPage;
