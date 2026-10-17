import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

/**
 * Continuous ticker: all active messages glide right → left in an endless loop.
 * Keeps moving on hover (links remain clickable); static under reduced motion.
 */
export const AnnouncementBar: React.FC = () => {
  const { homepage } = useStore();
  const bar = homepage?.announcementBar;
  const activeMessages = bar?.messages?.filter((m) => m.isActive) || [];

  if (!bar?.isEnabled || activeMessages.length === 0) {
    return null;
  }

  // Repeat the set so one copy always fills even wide screens
  const run = Array.from({ length: Math.max(2, Math.ceil(6 / activeMessages.length)) }).flatMap(
    () => activeMessages
  );
  const durationSec = Math.max(25, run.length * 7);

  const renderRun = (copy: number) => (
    <div className="flex shrink-0 items-center" aria-hidden={copy === 1}>
      {run.map((msg, i) => (
        <span key={`${copy}-${i}`} className="flex items-center whitespace-nowrap">
          {msg.link ? (
            <Link
              to={msg.link}
              tabIndex={copy === 1 ? -1 : undefined}
              className="px-8 hover:text-[#DFBD78] transition-colors"
            >
              {msg.text}
            </Link>
          ) : (
            <span className="px-8">{msg.text}</span>
          )}
          <span className="text-[#C5A059] text-[10px]">✦</span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      className="ticker group bg-[#0D0D0D] text-[#FAF8F5] border-b border-[#C5A059]/25 text-[11px] tracking-[0.2em] uppercase font-medium py-2.5 relative z-50 overflow-hidden"
      role="region"
      aria-label="Store announcements"
    >
      {/* Soft fade at both edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0D0D0D] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0D0D0D] to-transparent z-10" />
      <div
        className="ticker-track flex w-max"
        style={{ animationDuration: `${durationSec}s` }}
      >
        {renderRun(0)}
        {renderRun(1)}
      </div>
    </div>
  );
};
