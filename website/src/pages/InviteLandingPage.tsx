import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@heroui/react';
import { Copy, Check, ExternalLink, Download } from 'lucide-react';
import { PLAY_STORE_URL } from '../App';

export default function InviteLandingPage() {
  const { code: paramCode } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const rawCode = (paramCode || searchParams.get('code') || '').trim().toUpperCase();
  const [copied, setCopied] = useState(false);

  const customSchemeUrl = rawCode ? `snagbite://invite/${rawCode}` : 'snagbite://';
  const androidIntentUrl = rawCode
    ? `intent://invite/${rawCode}#Intent;scheme=snagbite;package=at.snagbite.app;end`
    : `intent://#Intent;scheme=snagbite;package=at.snagbite.app;end`;

  useEffect(() => {
    if (!rawCode) return;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    const timer = window.setTimeout(() => {
      const isAndroid = /Android/i.test(navigator.userAgent);
      window.location.href = isAndroid ? androidIntentUrl : customSchemeUrl;
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
      // Ignore clipboard failure
    }
  };

  const handleOpenApp = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    window.location.href = isAndroid ? androidIntentUrl : customSchemeUrl;
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 sm:px-5 py-6 sm:py-16 flex flex-col">
      <div className="rounded-3xl bg-black/[0.03] dark:bg-white/[0.04] p-5 sm:p-10 flex flex-col gap-5 sm:gap-6 border-none">
        <div className="flex flex-col gap-1.5 sm:gap-2">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Gemeinsam kochen
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white m-0">
            Freundschaftsanfrage
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed m-0 pt-0.5">
            Du wurdest eingeladen, dich auf <strong className="text-gray-900 dark:text-white font-bold">Snagbite</strong> zu vernetzen. Teilt eure besten Rezepte und kocht gemeinsam.
          </p>
        </div>

        {rawCode ? (
          <div className="w-full bg-[#fdfbf7] dark:bg-gray-900 rounded-2xl p-4 sm:p-5 ring-1 ring-black/[0.05] dark:ring-white/10 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                Dein Einladungscode
              </span>
              <span className="font-mono text-2xl sm:text-3xl font-black tracking-wider text-gray-900 dark:text-white selection:bg-emerald-300 truncate">
                {rawCode}
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] border-none text-gray-800 dark:text-gray-100 px-4 min-h-[44px] rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 active:scale-95 transition-all cursor-pointer"
              onPress={handleCopy}
              aria-label="Code kopieren"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Kopiert</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Kopieren</span>
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="w-full bg-amber-500/[0.08] rounded-2xl p-4 text-xs text-amber-800 dark:text-amber-300 font-medium">
            Kein Einladungscode im Link gefunden. Bitte öffne die App und gib den Code manuell im Tab „Fortschritt → Freunde“ ein.
          </div>
        )}

        <div className="w-full flex flex-col gap-2.5 sm:gap-3">
          <Button
            size="lg"
            className="w-full font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-12 sm:h-13 min-h-[48px] text-[15px] sm:text-base flex items-center justify-center gap-2 border-none active:scale-95 transition-all shadow-none cursor-pointer"
            onPress={handleOpenApp}
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            <span>In Snagbite öffnen</span>
          </Button>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full font-bold bg-[#fdfbf7] hover:bg-white dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 ring-1 ring-black/[0.05] dark:ring-white/10 rounded-2xl h-12 sm:h-13 min-h-[48px] text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>App im Google Play Store laden</span>
          </a>
        </div>

        <div className="pt-4 sm:pt-5 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-2">
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
            Manuell einlösen
          </span>
          <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside leading-relaxed m-0">
            <li>Snagbite öffnen und zum Tab <strong className="text-gray-900 dark:text-white">Fortschritt</strong> wechseln</li>
            <li>Bereich <strong className="text-gray-900 dark:text-white">Freunde</strong> auswählen</li>
            <li>Einladungscode einfügen und Anfrage bestätigen</li>
          </ol>
        </div>
      </div>

      <div className="mt-4 sm:mt-6 text-center">
        <Link to="/" className="min-h-[44px] inline-flex items-center px-3 text-xs font-semibold text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors">
          ← Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
