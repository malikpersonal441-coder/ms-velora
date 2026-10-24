import React from 'react';
import { InstallAppButton, PushToggleButton } from './AppActions';

/** "Never miss a new arrival" strip: new-arrival push alerts + app install. */
export const NewArrivalAlerts: React.FC = () => (
  <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
    <div className="rounded-2xl border border-[#C5A059]/25 bg-[radial-gradient(ellipse_at_20%_0%,rgba(197,160,89,0.1),transparent_60%)] bg-[#FAF8F5] px-5 sm:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div className="flex items-center gap-4">
        <img src="/brand/logo-128.webp" alt="" width={52} height={52} className="w-13 h-13 rounded-full shrink-0 shadow-xs" />
        <div>
          <p className="font-serif-luxury text-xl sm:text-2xl text-[#0D0D0D]">Never miss a new arrival</p>
          <p className="text-sm text-neutral-600">Get a notification when new jewellery arrives, and install our app for faster shopping.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <PushToggleButton topic="new-arrivals" onLabel="Notify Me" offLabel="Notifications On" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#C5A059] hover:bg-[#DFBD78] text-[#0D0D0D] text-xs uppercase tracking-[0.18em] font-bold transition-colors disabled:opacity-60" />
        <InstallAppButton className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#C5A059]/60 hover:border-[#C5A059] hover:bg-[#C5A059]/10 text-[#0D0D0D] text-xs uppercase tracking-[0.18em] font-semibold transition-colors disabled:opacity-60" />
      </div>
    </div>
  </section>
);
