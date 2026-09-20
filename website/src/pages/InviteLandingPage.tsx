import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Button, Card } from '@heroui/react';
import { Users, Copy, Check, ExternalLink, Download, ChefHat } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=at.snagbite.app';

export default function InviteLandingPage() {
  const { code: paramCode } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const rawCode = (paramCode || searchParams.get('code') || '').trim().toUpperCase();
  const [copied, setCopied] = useState(false);

  const customSchemeUrl = rawCode ? `snagbite://invite/${rawCode}` : 'snagbite://';
  const androidIntentUrl = rawCode
    ? `intent://invite/${rawCode}#Intent;scheme=snagbite;package=at.snagbite.app;end`
    : `intent://#Intent;scheme=snagbite;package=at.snagbite.app;end`;

  // Auto-trigger custom scheme intent on mobile launch
  useEffect(() => {
    if (!rawCode) return;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Small delay to allow initial render before jumping
    const timer = window.setTimeout(() => {
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        window.location.href = androidIntentUrl;
      } else {
        window.location.href = customSchemeUrl;
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [rawCode, androidIntentUrl, customSchemeUrl]);

  const handleCopy = async () => {
    if (!rawCode) return;
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleOpenApp = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = androidIntentUrl;
    } else {
      window.location.href = customSchemeUrl;
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-6rem)] flex items-center justify-center px-4 py-8">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <Card className="max-w-md w-full p-6 sm:p-8 bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] text-center flex flex-col items-center">
        {/* Friends Badge Icon */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
          <Users className="w-7 h-7" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
          Freundschaftsanfrage
        </h1>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          Du wurdest eingeladen, dich auf <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Snagbite</strong> zu vernetzen! Sammelt Rezepte, kocht gemeinsam und vergleicht euren Fortschritt.
        </p>

        {rawCode ? (
          <div className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-6 flex flex-col items-center gap-2 border-none">
            <span className="text-xs uppercase tracking-widest font-bold text-emerald-600 dark:text-emerald-400">
              Einladungscode
            </span>
            <div className="flex items-center justify-center gap-3 w-full">
              <span className="font-mono text-3xl font-black tracking-wider text-gray-900 dark:text-white selection:bg-emerald-300">
                {rawCode}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="bg-white dark:bg-gray-700 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none text-emerald-600 dark:text-emerald-400 min-w-9 h-9 p-0 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-xl"
                onPress={handleCopy}
                aria-label="Code kopieren"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            {copied && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-fade-in">
                Code in Zwischenablage kopiert!
              </span>
            )}
          </div>
        ) : (
          <div className="w-full bg-amber-500/10 border-none rounded-2xl p-4 mb-6 text-xs text-amber-600 dark:text-amber-400 font-medium">
            Kein Einladungscode im Link gefunden. Bitte öffne die App und gib den Code deines Freundes manuell ein.
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-13 text-base flex items-center justify-center gap-2 border-none active:scale-95 transition-all shadow-none cursor-pointer"
            onPress={handleOpenApp}
          >
            <ExternalLink className="w-4 h-4" />
            In Snagbite öffnen
          </Button>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl h-13 text-sm flex items-center justify-center gap-2 border-none active:scale-95 transition-all shadow-none"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            App im Google Play Store laden
          </a>
        </div>

        {/* How-to Guide */}
        <div className="w-full mt-6 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border-none text-left">
          <div className="flex items-center gap-2 mb-2">
            <ChefHat className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
              So funktioniert's
            </h2>
          </div>
          <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>Snagbite-App installieren oder öffnen</li>
            <li>Tab <strong className="font-bold text-gray-900 dark:text-white">Fortschritt</strong> → <strong className="font-bold text-gray-900 dark:text-white">Freunde</strong> wählen</li>
            <li>Code einfügen oder Einladungslink annehmen</li>
          </ol>
        </div>

        <div className="mt-6">
          <Link to="/" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
            ← Zurück zur Startseite
          </Link>
        </div>
      </Card>
    </div>
  );
}
