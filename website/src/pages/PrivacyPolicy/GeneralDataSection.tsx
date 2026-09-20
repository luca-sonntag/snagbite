import React from 'react';
import { legal } from '../../legal';
import { Smartphone, Video, Camera, Users, Sparkles } from 'lucide-react';

export const GeneralDataSection: React.FC = () => {
  return (
    <>
      <section id="verantwortlicher" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">1. Verantwortlicher</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Verantwortlicher im Sinne des Art. 4 Z 7 DSGVO ist:<br />
          <strong className="text-gray-900 dark:text-white">{legal.operatorName}</strong><br />
          {legal.street}<br />
          {legal.city}, {legal.country}<br />
          E-Mail: <a href={`mailto:${legal.email}`} className="text-emerald-500 hover:underline">{legal.email}</a>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Wir haben keinen Datenschutzbeauftragten bestellt, da hierfür die gesetzlichen Voraussetzungen (Art. 37 DSGVO) nicht vorliegen. Bei Fragen zum Datenschutz wende dich bitte jederzeit an die oben angeführte Kontaktadresse.
        </p>
      </section>

      <section id="daten" className="scroll-mt-24 border-b border-gray-150 dark:border-gray-800 pb-8 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">2. Welche Daten wir verarbeiten &amp; technische Abläufe</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Wir verarbeiten personenbezogene Daten nur insoweit, als dies zur Bereitstellung einer funktionierenden, komfortablen App und zur Erfüllung unserer Verträge erforderlich ist.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl glass-panel flex flex-col gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-500" />
              a) Konto- und Registrierungsdaten
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Für die Nutzung der App ist ein Benutzerkonto erforderlich. Dabei verarbeiten wir:
            </p>
            <ul className="list-disc pl-5 text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>E-Mail-Adresse und Passwort (ausschließlich verschlüsselt bzw. gehasht über Supabase Auth gespeichert)</li>
              <li>Bei Registrierung/Login über Google OAuth: Anzeigename, Profilbild und Google-Benutzer-ID</li>
              <li>Eindeutige interne Benutzer-ID (UUID), Registrierungs- und Anmeldezeitpunkte</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl glass-panel flex flex-col gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-teal-500" />
              b) Social-Media-Links &amp; clientseitiger Videoabruf (Privatkopie)
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Wenn du öffentlich zugängliche Rezept-Links (z.&nbsp;B. von Instagram, TikTok, YouTube Shorts, Facebook oder Websites) in Snagbite teilst oder einfügst:
            </p>
            <ul className="list-disc pl-5 text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li><strong>Direkter Medienabruf:</strong> Dein Endgerät ruft die öffentlich zugänglichen Mediendaten direkt von den Servern der jeweiligen Plattform ab. Dabei wird deine IP-Adresse an den jeweiligen Anbieter (Meta, ByteDance, Google) übertragen und es kann mobiles Datenvolumen deines Tarifs anfallen.</li>
              <li><strong>Keine dauerhafte Speicherung:</strong> Das Video wird lediglich flüchtig zur Rezept-Erstellung verarbeitet und <strong>nicht dauerhaft</strong> auf deinem Gerät oder unseren Servern gespeichert.</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl glass-panel flex flex-col gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-500" />
              c) Foto-Import (Kochbuch-Scan &amp; Rezeptkarten per OCR)
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Du kannst eigene Fotos von physischen Rezepten (Buchseiten, Zeitschriftenartikel, handgeschriebene Notizen) über die Kamera oder Bildauswahl hochladen. Diese Fotos werden verschlüsselt an unsere Server übermittelt und per Texterkennung analysiert. Nach erfolgreicher Rezept-Erstellung (spätestens nach 24 Stunden) werden die Originaldateien vollständig von unseren Servern gelöscht.
            </p>
          </div>

          <div className="p-5 rounded-2xl glass-panel flex flex-col gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-500" />
              d) Gamification, Kochbeweise, Social-Profile &amp; Ranglisten
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Snagbite bietet interaktive Koch- und Motivations-Funktionen:
            </p>
            <ul className="list-disc pl-5 text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li><strong>Koch-Events &amp; Fortschritt:</strong> Erfassung von Kochzeitpunkten, XP-Punkten, Levelaufstiegen, Streaks und freigeschalteten Abzeichen (Badges).</li>
              <li><strong>Kochbeweis-Fotos:</strong> Optional kannst du ein Foto deines fertig gekochten Gerichts hochladen. Dieses wird verschlüsselt gespeichert und durch KI auf optische Übereinstimmung mit dem Rezept geprüft, um XP-Boni freizuschalten.</li>
              <li><strong>Öffentliches Profil &amp; Leaderboards:</strong> Dein selbstgewählter Anzeigename, dein Avatar, dein Freundescode sowie deine Gesamt- und Monats-XP sind für verknüpfte Freunde bzw. im Monats-Leaderboard für angemeldete Nutzer sichtbar. Deine private E-Mail-Adresse wird <strong>unter keinen Umständen</strong> an Freunde oder Dritte übermittelt.</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl glass-panel flex flex-col gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              e) Vorrat, Wochenplaner, Einkaufsliste &amp; Recipe Copilot
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              In deinem geschützten Account speichern wir deine Vorratsbestände, Wochenpläne und Einkaufslisten. Eingaben im KI-Chat (Recipe Copilot zur Rezeptanpassung, Zutatenersetzung oder Mengenumrechnung) werden als Prompts an das KI-Modell Google Gemini übermittelt.
            </p>
          </div>
        </div>
      </section>
    </>
  );
};
