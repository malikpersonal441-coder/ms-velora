import React, { useEffect, useState } from 'react';
import { Download, BellRing, BellOff, Share, X } from 'lucide-react';
import {
  canPromptInstall,
  isIOS,
  isStandalone,
  isSubscribedLocally,
  onInstallAvailabilityChange,
  promptInstall,
  subscribePush,
  unsubscribePush,
  type PushTopic,
} from '../lib/pwa';
import { useStore } from '../context/StoreContext';

/** "Install App" — native prompt on Android/desktop Chrome/Edge, instructions on iPhone. */
export const InstallAppButton: React.FC<{ className?: string; label?: string }> = ({ className = '', label = 'Install App' }) => {
  const [available, setAvailable] = useState(canPromptInstall());
  const [installed, setInstalled] = useState(() => isStandalone());
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(
    () =>
      onInstallAvailabilityChange(() => {
        setAvailable(canPromptInstall());
        setInstalled(isStandalone());
      }),
    []
  );

  if (installed) return null;
  if (!available && !isIOS()) return null;

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (isIOS()) return setIosHelp(true);
          await promptInstall();
        }}
        className={className}
      >
        <Download className="w-4 h-4" />
        <span>{label}</span>
      </button>

      {iosHelp && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setIosHelp(false)}>
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 text-[#F2EFE9] space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Install on iPhone"
          >
            <div className="flex items-center justify-between">
              <p className="font-serif-luxury text-2xl font-semibold">Install on iPhone</p>
              <button type="button" onClick={() => setIosHelp(false)} aria-label="Close" className="p-1 text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="text-sm space-y-3 list-decimal pl-5 text-neutral-700">
              <li>
                Tap the <Share className="inline w-4 h-4 -mt-1" /> <b>Share</b> button in Safari.
              </li>
              <li>
                Choose <b>Add to Home Screen</b>.
              </li>
              <li>
                Tap <b>Add</b>. The MS Velora app appears on your home screen.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
};

/** Opt-in / opt-out toggle for push notifications on a topic. */
export const PushToggleButton: React.FC<{
  topic: PushTopic;
  onLabel: string;
  offLabel: string;
  className?: string;
}> = ({ topic, onLabel, offLabel, className = '' }) => {
  const { addToast } = useStore();
  const [on, setOn] = useState(() => isSubscribedLocally(topic));
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      if (on) {
        await unsubscribePush(topic);
        setOn(false);
        addToast('Notifications turned off.', 'info');
      } else {
        await subscribePush(topic);
        setOn(true);
        addToast(
          topic === 'new-arrivals'
            ? "You're on the list — we'll notify you about new arrivals."
            : 'Order alerts are on for this device.',
          'success'
        );
      }
    } catch (err: any) {
      addToast(err.message || 'Could not change notifications.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={on} className={className}>
      {on ? <BellOff className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
      <span>{busy ? 'Please wait…' : on ? offLabel : onLabel}</span>
    </button>
  );
};
