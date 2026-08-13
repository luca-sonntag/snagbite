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
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 dark:bg-emerald-500/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <Card className="max-w-md w-full p-6 sm:p-8 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-emerald-500/20 shadow-2xl rounded-3xl text-center flex flex-col items-center">
        {/* Friends Badge Icon */}
        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/25 shadow-sm flex items-center justify-center mb-5">
          <Users className="w-9 h-9 sm:w-10 sm:h-10 text-emerald-600 dark:text-emerald-400" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">
          Freundschaftsanfrage
        </h1>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          Du wurdest eingeladen, dich auf <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Snagbite</strong> zu vernetzen! Sammelt Rezepte, kocht gemeinsam und vergleicht euren Koch-Fortschritt.
        </p>

        {rawCode ? (
          <div className="w-full bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 mb-6 flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-bold text-emerald-800 dark:text-emerald-300">
              Dein Freundescode
            </span>
            <div className="flex items-center justify-center gap-3 w-full">
              <span className="font-mono text-3xl font-extrabold tracking-wider text-emerald-950 dark:text-emerald-100 selection:bg-emerald-300">
                {rawCode}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="bg-white dark:bg-gray-800 shadow-xs border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 min-w-9 h-9 p-0"
                onPress={handleCopy}
                aria-label="Code kopieren"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            {copied && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in">
                Code in Zwischenablage kopiert!
              </span>
            )}
          </div>
        ) : (
          <div className="w-full bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 mb-6 text-xs text-amber-800 dark:text-amber-300">
            Kein Freundescode im Link gefunden. Bitte öffne die App und gib den Code manuell ein.
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 rounded-xl h-12 text-base cursor-pointer"
            onPress={handleOpenApp}
          >
            <ExternalLink className="w-5 h-5" />
            In Snagbite öffnen
          </Button>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center justify-center gap-2 rounded-xl h-12 text-sm transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            App im Google Play Store laden
          </a>
        </div>

        {/* How-to Guide */}
        <div className="w-full mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-left">
          <div className="flex items-center gap-2 mb-3">
            <ChefHat className="w-4 h-4 text-emerald-500" />
            <h2 className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">
              So funktioniert's
            </h2>
          </div>
          <ol className="text-xs text-gray-600 dark:text-gray-300 space-y-2 list-decimal list-inside leading-relaxed">
            <li>Snagbite-App installieren oder öffnen</li>
            <li>Tab <strong className="font-semibold text-gray-900 dark:text-white">Fortschritt</strong> → <strong className="font-semibold text-gray-900 dark:text-white">Freunde</strong> wählen</li>
            <li>Code einfügen oder direkt über den Einladungslink annehmen</li>
          </ol>
        </div>

        <div className="mt-6">
          <Link to="/" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">
            ← Zurück zur Startseite
          </Link>
        </div>
      </Card>
    </div>
  );
}
