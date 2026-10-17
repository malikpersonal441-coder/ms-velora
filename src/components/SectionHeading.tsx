import React from 'react';
import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  link?: { to: string; label: string };
  tone?: 'light' | 'dark';
}

/** Classic centred heading: eyebrow, serif title, gold ✦ ornament rule. */
export const SectionHeading: React.FC<SectionHeadingProps> = ({ eyebrow, title, subtitle, link, tone = 'light' }) => {
  const dark = tone === 'dark';
  return (
    <Reveal className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
      <p className={`text-[11px] uppercase tracking-[0.42em] font-semibold ${dark ? 'text-[#DFBD78]' : 'text-[#9E7B36]'}`}>
        {eyebrow}
      </p>
      <h2
        className={`mt-3 font-serif-luxury text-4xl sm:text-5xl lg:text-[3.6rem] font-medium leading-[1.05] tracking-tight ${
          dark ? 'text-[#FAF8F5]' : 'text-[#0D0D0D]'
        }`}
      >
        {title}
      </h2>
      <div className="mt-5 flex items-center justify-center gap-3" aria-hidden>
        <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#C5A059]" />
        <span className="text-[#C5A059] text-xs">✦</span>
        <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#C5A059]" />
      </div>
      {subtitle && (
        <p className={`mt-5 text-sm sm:text-base leading-relaxed ${dark ? 'text-[#FAF8F5]/60' : 'text-neutral-500'}`}>
          {subtitle}
        </p>
      )}
      {link && (
        <Link
          to={link.to}
          className={`link-underline inline-block mt-5 text-[11px] uppercase tracking-[0.28em] font-semibold ${
            dark ? 'text-[#DFBD78]' : 'text-[#0D0D0D] hover:text-[#9E7B36]'
          }`}
        >
          {link.label} →
        </Link>
      )}
    </Reveal>
  );
};
