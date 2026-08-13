import { Card, Accordion } from "@heroui/react";
import { ArrowRight, Smartphone, ChefHat, HeartPulse, Clock, Utensils, HelpCircle, Download } from "lucide-react";

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=at.snagbite.app';

// --- Mockup Components from the App ---

const ShareStep1Mockup = () => (
  <div className="relative w-[150px] h-[120px] shrink-0 mx-auto rounded-xl border border-black/10 bg-white p-2 flex items-center justify-center overflow-hidden shadow-inner select-none">
    {/* Vertical Phone Screen Mockup representing a Reel */}
    <div className="w-[64px] h-[100px] rounded-lg bg-black/[0.03] relative border border-black/10 overflow-hidden shadow-sm flex flex-col justify-between p-1">
      {/* Video Content representation */}
      <div className="absolute inset-0 bg-transparent flex items-center justify-center">
        <ChefHat className="w-7 h-7 text-black/10" />
      </div>

      {/* Top Status Bar mock */}
      <div className="absolute top-1 left-0 right-0 px-1.5 flex justify-between items-center z-10 opacity-55">
        <div className="w-1 h-1 rounded-full bg-black/35" />
        <div className="flex gap-0.5">
          <div className="w-1.5 h-0.5 bg-black/35 rounded-xs" />
          <div className="w-2.5 h-0.5 bg-black/35 rounded-xs" />
        </div>
      </div>

      {/* Bottom overlay: user profile and caption */}
      <div className="absolute bottom-1 left-1 flex flex-col gap-0.5 z-10 w-[30px]">
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded-full bg-black/20 border border-black/10 shrink-0" />
          <div className="h-0.5 w-4 rounded bg-black/15" />
        </div>
        <div className="h-0.5 w-full rounded bg-black/10" />
        <div className="h-0.5 w-2/3 rounded bg-black/10" />
      </div>

      {/* Right side overlays: Action icons stack */}
      <div className="absolute right-1 bottom-1 flex flex-col items-center gap-1 z-10">
        <div className="w-3 h-3 rounded-full bg-black/5 border border-black/5 flex items-center justify-center">
          <svg className="w-2 h-2 text-black/50" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </div>
        <div className="w-3 h-3 rounded-full bg-black/5 border border-black/5 flex items-center justify-center">
          <svg className="w-2 h-2 text-black/50" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        {/* Active highlighted Share button */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75 duration-1000" />
          <div className="relative w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white border border-emerald-400 shadow-md shadow-emerald-500/30">
            <svg className="w-2.5 h-2.5 translate-x-[0.3px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ShareStep3Mockup = () => (
  <div className="relative w-[150px] h-[120px] shrink-0 mx-auto rounded-xl border border-black/10 bg-white p-2 overflow-hidden shadow-inner flex flex-col justify-end select-none">
    {/* Background share options sheet representation */}
    <div className="flex-1 flex flex-col gap-1 opacity-25 px-0.5 pt-0.5">
      <div className="h-2 w-1/3 rounded bg-black/40" />
      <div className="h-1.5 w-full rounded bg-black/20" />
      <div className="h-1.5 w-2/3 rounded bg-black/20" />
    </div>

    <div className="bg-gray-50 border border-black/10 rounded-lg p-1.5 shadow-md flex items-center gap-2">
      <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5 opacity-40">
        <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.446L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.02-5.11-2.884-6.974C16.592 1.89 14.12 1.865 11.99 1.865c-5.43 0-9.854 4.417-9.858 9.853-.002 1.773.465 3.5 1.353 5.03L2.43 21.65l5.06-1.33.157.08z"/></svg>
        </div>
        <span className="text-[5px] text-gray-500 truncate">WhatsApp</span>
      </div>

      {/* Snagbite App Option highlighted */}
      <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75 duration-1000" />
          <div className="relative w-5 h-5 rounded-full bg-emerald-500 border border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/40 p-0.5 overflow-hidden">
            <img src="/icon-192.png" className="w-full h-full object-cover rounded-full" alt="Snagbite" />
          </div>
        </div>
        <span className="text-[5px] font-bold text-emerald-600 truncate">Snagbite</span>
      </div>

      <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5 opacity-40">
        <div className="w-5 h-5 rounded bg-blue-505 flex items-center justify-center shrink-0" style={{ backgroundColor: '#2563eb' }}>
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.8z"/></svg>
        </div>
        <span className="text-[5px] text-gray-500 truncate">LinkedIn</span>
      </div>
    </div>
  </div>
);

const RecipeCardMockup = () => (
  <div className="relative w-[150px] h-[120px] shrink-0 mx-auto rounded-xl border border-black/10 bg-white p-2 overflow-hidden shadow-inner flex items-center justify-center select-none">
    {/* Recipe card mockup representation */}
    <div className="relative w-[96px] rounded-lg bg-white border border-black/10 overflow-hidden shadow-sm">
      {/* Image area with creator badge */}
      <div className="relative h-[48px] bg-emerald-500/10 flex items-center justify-center">
        <ChefHat className="w-6 h-6 text-emerald-500/35" />
        <div className="absolute bottom-1 left-1.5 h-3 px-1 rounded bg-black/60 flex items-center gap-0.5">
          <span className="w-1 h-1 rounded-full bg-pink-400" />
          <span className="h-0.5 w-3 rounded bg-white/70" />
        </div>
      </div>
      {/* Title + stat footer */}
      <div className="p-2 flex flex-col gap-1">
        <div className="h-1.5 w-full rounded bg-black/15" />
        <div className="h-1.5 w-2/3 rounded bg-black/10" />
        <div className="flex items-center gap-2 pt-1 border-t border-black/5 mt-1">
          <span className="flex items-center gap-0.5">
            <Clock className="w-2 h-2 text-emerald-500" />
            <span className="h-0.5 w-2.5 rounded bg-black/15" />
          </span>
          <span className="flex items-center gap-0.5">
            <Utensils className="w-2 h-2 text-emerald-500" />
            <span className="h-0.5 w-2.5 rounded bg-black/15" />
          </span>
        </div>
      </div>
    </div>
  </div>
);

// --- Main Page Component ---

export default function LandingPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-20 flex flex-col gap-20 relative overflow-hidden">
      
      {/* Ambient background glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse-slow"></div>
      <div className="absolute top-40 right-10 w-80 h-80 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl -z-10 pointer-events-none" style={{ animationDelay: '1.5s' }}></div>

      {/* Hero Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        {/* Left Text Column */}
        <div className="md:col-span-7 flex flex-col items-start text-left">
          <div className="mb-6 shadow-xl shadow-emerald-500/10 rounded-2xl overflow-hidden inline-block p-1 glass-panel">
            <img src="/icon-512.png" alt="Snagbite Logo" className="w-16 h-16 object-cover rounded-xl" />
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-6 text-gray-900 dark:text-white leading-tight">
            Rezept-Videos.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
              Einfach extrahiert.
            </span>
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg leading-relaxed">
            Teile einfach Short-Form Content (Reels, TikToks, Shorts) direkt mit der App und erhalte sofort ein strukturiertes Kochrezept mit sauberen Zutatenlisten, Schritten und Nährwerten.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <a 
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 px-8 h-12 rounded-xl inline-flex items-center justify-center transition-all hover:scale-[1.02] cursor-pointer"
            >
              App herunterladen <ArrowRight className="w-4 h-4 ml-2" />
            </a>
            
            <a 
              href="#how-it-works"
              className="inline-flex items-center justify-center font-semibold text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors h-12 px-6"
            >
              Mehr erfahren
            </a>
          </div>
        </div>

        {/* Right Preview Column (Staggered App Mockups) */}
        <div className="md:col-span-5 flex flex-row md:relative overflow-x-auto md:overflow-visible gap-6 md:gap-0 justify-start md:justify-center w-full h-auto md:h-[400px] py-6 md:py-0 px-4 md:px-0 scrollbar-none snap-x snap-mandatory">
          {/* Step 1: Reel Mockup */}
          <div className="flex-none snap-center md:absolute md:top-4 md:left-4 md:sm:left-8 transform md:-rotate-6 hover:rotate-0 hover:scale-110 transition-all duration-300 z-10 flex flex-col items-center">
            <div className="shadow-lg rounded-2xl overflow-hidden bg-white border border-black/10">
              <ShareStep1Mockup />
            </div>
            <p className="text-[10px] text-center mt-2 text-gray-500 font-extrabold uppercase tracking-wide">1. Reel teilen</p>
          </div>

          {/* Step 2: Share Mockup */}
          <div className="flex-none snap-center md:absolute md:top-20 md:right-4 md:sm:right-8 transform md:rotate-6 hover:rotate-0 hover:scale-110 transition-all duration-300 z-20 flex flex-col items-center">
            <div className="shadow-lg rounded-2xl overflow-hidden bg-white border border-black/10">
              <ShareStep3Mockup />
            </div>
            <p className="text-[10px] text-center mt-2 text-gray-500 font-extrabold uppercase tracking-wide">2. Snagbite wählen</p>
          </div>

          {/* Step 3: Recipe Card Mockup */}
          <div className="flex-none snap-center md:absolute md:bottom-6 md:left-12 md:sm:left-20 transform md:-rotate-3 hover:rotate-0 hover:scale-110 transition-all duration-300 z-30 flex flex-col items-center">
            <div className="shadow-2xl rounded-2xl overflow-hidden bg-white border border-emerald-500/20">
              <RecipeCardMockup />
            </div>
            <p className="text-[10px] text-center mt-2 text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wide">3. Rezept bereit!</p>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="flex flex-col gap-10 scroll-mt-24">
        <div className="text-center max-w-lg mx-auto">
          <h2 className="text-3xl font-bold tracking-tight mb-4">In 3 einfachen Schritten</h2>
          <p className="text-gray-600 dark:text-gray-400">Kein Abtippen, kein Pausieren von Videos. Einfacher geht es nicht.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center p-6 glass-panel rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 flex items-center justify-center mb-4 font-bold text-lg">1</div>
            <h3 className="font-semibold text-lg mb-2">Video finden</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Finde ein interessantes Rezept-Video auf Instagram, TikTok oder YouTube Shorts.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 glass-panel rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 flex items-center justify-center mb-4 font-bold text-lg">2</div>
            <h3 className="font-semibold text-lg mb-2">Teilen & Senden</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Tippe im Video auf "Teilen" (Share), wähle Snagbite aus oder kopiere den Link direkt.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 glass-panel rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 flex items-center justify-center mb-4 font-bold text-lg">3</div>
            <h3 className="font-semibold text-lg mb-2">Loskochen!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Das strukturierte Rezept ist sofort bereit: übersichtliche Zutaten, Schritte und genaue Nährwerte.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="flex flex-col gap-10">
        <div className="text-center max-w-lg mx-auto">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Warum Snagbite?</h2>
          <p className="text-gray-600 dark:text-gray-400">Unsere Features machen den Unterschied in deiner Küche.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-panel border-none shadow-sm hover:-translate-y-1 transition-transform duration-300">
            <Card.Header className="flex gap-3 px-6 pt-6 pb-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <p className="text-md font-bold">Direkt im Teilen-Menü</p>
              </div>
            </Card.Header>
            <Card.Content className="px-6 pb-6 text-sm text-gray-500 dark:text-gray-400 mt-2">
              Kein lästiges Kopieren. Teile das Video einfach direkt aus deiner liebsten Social-Media-App mit Snagbite.
            </Card.Content>
          </Card>

          <Card className="glass-panel border-none shadow-sm hover:-translate-y-1 transition-transform duration-300">
            <Card.Header className="flex gap-3 px-6 pt-6 pb-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 flex items-center justify-center">
                <ChefHat className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <p className="text-md font-bold">KI-gestützte Extraktion</p>
              </div>
            </Card.Header>
            <Card.Content className="px-6 pb-6 text-sm text-gray-500 dark:text-gray-400 mt-2">
              Unsere moderne Multimodal-KI extrahiert Zutaten, Arbeitsschritte und Mengen fehlerfrei aus Video, Bild und Beschreibung.
            </Card.Content>
          </Card>

          <Card className="glass-panel border-none shadow-sm hover:-translate-y-1 transition-transform duration-300">
            <Card.Header className="flex gap-3 px-6 pt-6 pb-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <p className="text-md font-bold">Nährwerte & Makros</p>
              </div>
            </Card.Header>
            <Card.Content className="px-6 pb-6 text-sm text-gray-500 dark:text-gray-400 mt-2">
              Erhalte automatisch berechnete Nährwerte (Kalorien, Eiweiß, Kohlenhydrate, Fett) für jedes Kochrezept.
            </Card.Content>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="flex flex-col gap-10 max-w-3xl mx-auto w-full">
        <div className="text-center max-w-lg mx-auto">
          <h2 className="text-3xl font-bold tracking-tight mb-4 flex items-center justify-center gap-2">
            <HelpCircle className="w-8 h-8 text-emerald-500 shrink-0" />
            Häufig gestellte Fragen
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Hier findest du Antworten auf die am häufigsten gestellten Fragen zu Snagbite.</p>
        </div>

        <Accordion 
          variant="surface"
          className="w-full bg-transparent flex flex-col gap-3 p-0 border-none"
        >
          <Accordion.Item className="border-none glass-panel rounded-2xl overflow-hidden shadow-sm" id="1">
            <Accordion.Heading>
              <Accordion.Trigger className="px-6 py-4 flex items-center justify-between text-gray-900 dark:text-white font-semibold text-base hover:bg-black/5">
                Welche Plattformen werden unterstützt?
                <Accordion.Indicator className="text-emerald-500 shrink-0" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="px-6 pb-5 pt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-t border-black/5">
                Snagbite unterstützt das direkte Teilen und Extrahieren von Instagram Reels, TikTok Videos und YouTube Shorts. Du kannst einfach den Share-Button in der jeweiligen App nutzen oder den Link kopieren und direkt in Snagbite einfügen.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item className="border-none glass-panel rounded-2xl overflow-hidden shadow-sm" id="2">
            <Accordion.Heading>
              <Accordion.Trigger className="px-6 py-4 flex items-center justify-between text-gray-900 dark:text-white font-semibold text-base hover:bg-black/5">
                Kostet Snagbite Geld?
                <Accordion.Indicator className="text-emerald-500 shrink-0" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="px-6 pb-5 pt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-t border-black/5">
                Die Basis-Extraktionen sind kostenlos. Für Power-User, die viele Rezepte täglich konvertieren oder erweiterte Features wie den interaktiven Rezept-Copiloten nutzen möchten, bieten wir ein kostengünstiges Premium-Abonnement an.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item className="border-none glass-panel rounded-2xl overflow-hidden shadow-sm" id="3">
            <Accordion.Heading>
              <Accordion.Trigger className="px-6 py-4 flex items-center justify-between text-gray-900 dark:text-white font-semibold text-base hover:bg-black/5">
                Werden meine Rezepte vertraulich behandelt?
                <Accordion.Indicator className="text-emerald-500 shrink-0" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="px-6 pb-5 pt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-t border-black/5">
                Ja, absolut. Deine extrahierten Rezepte werden sicher in deiner persönlichen Datenbank gespeichert und sind durch Zugriffskontrollen auf Datenbankebene (Row-Level-Security) geschützt. Das bedeutet, dass ausschließlich du Zugriff auf deine eigenen Inhalte hast. Wir verkaufen deine Daten niemals weiter.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item className="border-none glass-panel rounded-2xl overflow-hidden shadow-sm" id="4">
            <Accordion.Heading>
              <Accordion.Trigger className="px-6 py-4 flex items-center justify-between text-gray-900 dark:text-white font-semibold text-base hover:bg-black/5">
                Kann ich Rezepte anpassen oder ändern?
                <Accordion.Indicator className="text-emerald-500 shrink-0" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="px-6 pb-5 pt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-t border-black/5">
                Ja! Du kannst das Rezept jederzeit über den integrierten Chat-Assistenten (Rezept-Copilot) verfeinern. Du kannst ihn beispielsweise bitten, Mengenangaben umzurechnen, Zutaten zu ersetzen oder Zubereitungsschritte anzupassen, und die Änderungen dann direkt übernehmen.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item className="border-none glass-panel rounded-2xl overflow-hidden shadow-sm" id="5">
            <Accordion.Heading>
              <Accordion.Trigger className="px-6 py-4 flex items-center justify-between text-gray-900 dark:text-white font-semibold text-base hover:bg-black/5">
                Wie funktioniert das Einkaufslisten-Feature?
                <Accordion.Indicator className="text-emerald-500 shrink-0" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="px-6 pb-5 pt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-t border-black/5">
                Sobald du ein Rezept in deinen Einkaufswagen legst, extrahiert die App alle benötigten Zutaten. Sie bereinigt diese von ungenauen Angaben und sortiert sie vollautomatisch nach Supermarkt-Kategorien (wie Obst & Gemüse, Molkereiprodukte, Konserven), um dir den Einkauf so stressfrei wie möglich zu machen.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </section>
      
      {/* Bottom CTA Banner */}
      <section className="relative rounded-3xl p-8 sm:p-12 overflow-hidden bg-gradient-to-tr from-emerald-900/20 via-emerald-800/10 to-teal-900/20 border border-emerald-500/20 shadow-xl flex flex-col items-center text-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <ChefHat className="w-8 h-8" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-gray-900 dark:text-white">
            Bereit für dein nächstes Gericht?
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Hol dir Snagbite jetzt kostenlos im Google Play Store und verwandle Rezept-Videos in strukturierte Kochrezepte.
          </p>
        </div>
        <a 
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 px-8 h-12 rounded-xl inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Im Google Play Store laden
        </a>
      </section>

      <div className="h-4"></div>
    </div>
  );
}
