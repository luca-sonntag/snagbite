import { Card, Accordion } from "@heroui/react";
import { ArrowRight, Smartphone, ChefHat, HeartPulse, Clock, Utensils, HelpCircle, Download } from "lucide-react";

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=at.snagbite.app';

// --- Hero Recipe Preview Card (Clean Flat Style) ---

const HeroRecipeCard = () => (
  <div className="w-full max-w-sm mx-auto bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none flex flex-col gap-4 text-left">
    {/* Creator & status badge */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <ChefHat className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900 dark:text-white leading-none">@pasta_paradise</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Instagram Reel</p>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        Extrahiert ✓
      </span>
    </div>

    {/* Title & Stats */}
    <div>
      <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
        Cremige Zitronen-Knoblauch-Pasta
      </h3>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          15 Min
        </span>
        <span className="flex items-center gap-1">
          <Utensils className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          2 Port.
        </span>
        <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
          <HeartPulse className="w-3.5 h-3.5" />
          480 kcal
        </span>
      </div>
    </div>

    {/* Ingredients Preview */}
    <div className="flex flex-wrap gap-1.5 pt-1">
      <span className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
        250g Tagliatelle
      </span>
      <span className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
        1 Bio-Zitrone
      </span>
      <span className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
        2 Zehen Knoblauch
      </span>
      <span className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
        50g Parmesan
      </span>
    </div>
  </div>
);

// --- Main Page Component ---

export default function LandingPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-5 sm:px-6 py-8 sm:py-12 md:py-20 flex flex-col gap-16 md:gap-24 relative overflow-hidden">
      
      {/* Ambient background glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse-slow"></div>
      <div className="absolute top-40 right-10 w-80 h-80 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl -z-10 pointer-events-none" style={{ animationDelay: '1.5s' }}></div>

      {/* Hero Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        {/* Left Column (Centered on Mobile, Left-aligned on Desktop) */}
        <div className="md:col-span-7 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="mb-5 sm:mb-6 rounded-2xl overflow-hidden inline-block p-1 bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
            <img src="/icon-512.png" alt="Snagbite Logo" className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 sm:mb-6 text-gray-900 dark:text-white leading-tight">
            Rezept-Videos.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
              Einfach extrahiert.
            </span>
          </h1>
          
          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 max-w-md leading-relaxed">
            Teile einfach Short-Form Videos (Reels, TikToks, Shorts) direkt mit Snagbite und erhalte sofort ein sauberes Kochrezept mit Zutatenlisten, Schritten und Nährwerten.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <a 
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-8 h-13 rounded-2xl inline-flex items-center justify-center gap-2 border-none active:scale-95 transition-all cursor-pointer text-base"
            >
              App herunterladen <ArrowRight className="w-4 h-4" />
            </a>
            
            <a 
              href="#how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center font-bold text-sm text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-2xl h-13 px-6 border-none active:scale-95 transition-all"
            >
              Mehr erfahren
            </a>
          </div>
        </div>

        {/* Right Preview Column (Hero Showcase Card) */}
        <div className="md:col-span-5 w-full flex justify-center">
          <HeroRecipeCard />
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="flex flex-col gap-8 sm:gap-10 scroll-mt-16">
        <div className="text-center max-w-lg mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2 block">
            Ablauf
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 sm:mb-3 text-gray-900 dark:text-white">In 3 einfachen Schritten</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">Kein Abtippen, kein mühsames Pausieren. Einfacher geht es nicht.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="flex flex-col items-center text-center p-6 md:p-8 bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 font-bold text-lg">
              1
            </div>
            <h3 className="font-bold text-base mb-2 text-gray-900 dark:text-white">Video finden</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Finde ein interessantes Rezept-Video auf Instagram, TikTok oder YouTube Shorts.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 md:p-8 bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 font-bold text-lg">
              2
            </div>
            <h3 className="font-bold text-base mb-2 text-gray-900 dark:text-white">Teilen & Senden</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Tippe im Video auf "Teilen", wähle Snagbite aus oder kopiere den Link direkt in die App.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-6 md:p-8 bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 font-bold text-lg">
              3
            </div>
            <h3 className="font-bold text-base mb-2 text-gray-900 dark:text-white">Loskochen!</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Das strukturierte Rezept ist sofort bereit: Zutaten, portionierbare Mengen und Nährwerte.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="flex flex-col gap-8 sm:gap-10">
        <div className="text-center max-w-lg mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2 block">
            Vorteile
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 sm:mb-3 text-gray-900 dark:text-white">Warum Snagbite?</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">Entwickelt für reibungsloses Kochen im Alltag.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-start">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Direkt im Teilen-Menü</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Kein lästiges Kopieren. Teile das Video einfach direkt aus deiner liebsten Social-Media-App mit Snagbite.
            </p>
          </Card>

          <Card className="bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-start">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shrink-0">
              <ChefHat className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">KI-gestützte Extraktion</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Unsere moderne Multimodal-KI extrahiert Zutaten, Arbeitsschritte und Mengen fehlerfrei aus Video, Bild und Ton.
            </p>
          </Card>

          <Card className="bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-start">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shrink-0">
              <HeartPulse className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Nährwerte & Makros</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Erhalte automatisch berechnete Nährwerte (Kalorien, Eiweiß, Kohlenhydrate, Fett) für jedes Gericht.
            </p>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="flex flex-col gap-8 sm:gap-10 max-w-3xl mx-auto w-full">
        <div className="text-center max-w-lg mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2 block">
            FAQ
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 sm:mb-3 text-gray-900 dark:text-white flex items-center justify-center gap-2">
            <HelpCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Häufig gestellte Fragen
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">Hier findest du Antworten auf die wichtigsten Fragen zu Snagbite.</p>
        </div>

        <Accordion 
          variant="surface"
          className="w-full bg-transparent flex flex-col gap-3 p-0 border-none"
        >
          <Accordion.Item className="border-none bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.03)]" id="1">
            <Accordion.Heading>
              <Accordion.Trigger className="px-5 sm:px-6 py-4 flex items-center justify-between text-gray-900 dark:text-white font-bold text-base hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                Welche Plattformen werden unterstützt?
                <Accordion.Indicator className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="px-5 sm:px-6 pb-5 pt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Snagbite unterstützt das direkte Teilen und Extrahieren von Instagram Reels, TikTok Videos und YouTube Shorts. Du kannst einfach den Share-Button in der jeweiligen App nutzen oder den Link kopieren und direkt in Snagbite einfügen.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item className="border-none bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.03)]" id="2">
            <Accordion.Heading>
              <Accordion.Trigger className="px-5 sm:px-6 py-4 flex items-center justify-between text-gray-900 dark:text-white font-bold text-base hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                Kostet Snagbite Geld?
                <Accordion.Indicator className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="px-5 sm:px-6 pb-5 pt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Die Basis-Extraktionen sind kostenlos. Für Power-User, die viele Rezepte täglich konvertieren oder erweiterte Features wie den interaktiven Rezept-Copiloten nutzen möchten, bieten wir ein kostengünstiges Premium-Abonnement an.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item className="border-none bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.03)]" id="3">
            <Accordion.Heading>
              <Accordion.Trigger className="px-5 sm:px-6 py-4 flex items-center justify-between text-gray-900 dark:text-white font-bold text-base hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                Werden meine Rezepte vertraulich behandelt?
                <Accordion.Indicator className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="px-5 sm:px-6 pb-5 pt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Ja, absolut. Deine extrahierten Rezepte werden sicher in deiner persönlichen Datenbank gespeichert und sind durch Zugriffskontrollen auf Datenbankebene (Row-Level-Security) geschützt. Das bedeutet, dass ausschließlich du Zugriff auf deine eigenen Inhalte hast. Wir verkaufen deine Daten niemals weiter.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item className="border-none bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.03)]" id="4">
            <Accordion.Heading>
              <Accordion.Trigger className="px-5 sm:px-6 py-4 flex items-center justify-between text-gray-900 dark:text-white font-bold text-base hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                Kann ich Rezepte anpassen oder ändern?
                <Accordion.Indicator className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="px-5 sm:px-6 pb-5 pt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Ja! Du kannst das Rezept jederzeit über den integrierten Chat-Assistenten (Rezept-Copilot) verfeinern. Du kannst ihn beispielsweise bitten, Mengenangaben umzurechnen, Zutaten zu ersetzen oder Zubereitungsschritte anzupassen, und die Änderungen dann direkt übernehmen.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item className="border-none bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.03)]" id="5">
            <Accordion.Heading>
              <Accordion.Trigger className="px-5 sm:px-6 py-4 flex items-center justify-between text-gray-900 dark:text-white font-bold text-base hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                Wie funktioniert das Einkaufslisten-Feature?
                <Accordion.Indicator className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="px-5 sm:px-6 pb-5 pt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Sobald du ein Rezept in deinen Einkaufswagen legst, extrahiert die App alle benötigten Zutaten. Sie bereinigt diese von ungenauen Angaben und sortiert sie vollautomatisch nach Supermarkt-Kategorien (wie Obst & Gemüse, Molkereiprodukte, Konserven), um dir den Einkauf so stressfrei wie möglich zu machen.
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </section>
      
      {/* Bottom CTA Banner */}
      <section className="relative rounded-3xl p-6 sm:p-10 md:p-12 overflow-hidden bg-white dark:bg-gray-900 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col items-center text-center gap-5 sm:gap-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <ChefHat className="w-8 h-8" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-gray-900 dark:text-white">
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
          className="w-full sm:w-auto font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-8 h-13 rounded-2xl inline-flex items-center justify-center gap-2 border-none active:scale-95 transition-all cursor-pointer text-base"
        >
          <Download className="w-4 h-4" />
          Im Google Play Store laden
        </a>
      </section>

      <div className="h-4"></div>
    </div>
  );
}
