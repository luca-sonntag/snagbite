export interface PlaystoreScreenshot {
  id: string;
  src: string;
  title: string;
  subtitle: string;
  alt: string;
}

export const PLAYSTORE_SCREENSHOTS: PlaystoreScreenshot[] = [
  {
    id: '1',
    src: '/playstore/1.jpg',
    title: 'Aus Reels wird dein Kochbuch',
    subtitle: 'Instagram & TikTok Rezepte an einem Ort',
    alt: 'Snagbite App Vorschau: Kochbuch-Feed mit Sammlungen und Rezeptkarten',
  },
  {
    id: '2',
    src: '/playstore/2.jpg',
    title: 'Rezept-Link teilen. Fertig',
    subtitle: 'Zutaten und Zubereitung sekundenschnell extrahiert',
    alt: 'Snagbite App Vorschau: Direktes Teilen von Instagram Reels und Kochbuch-Scan',
  },
  {
    id: '3',
    src: '/playstore/3.jpg',
    title: 'Strukturiert & übersichtlich',
    subtitle: 'Zutaten, Portionen & Schritte ohne langes Suchen',
    alt: 'Snagbite App Vorschau: Zutatenliste, Nährwertübersicht und Portionsrechner',
  },
  {
    id: '4',
    src: '/playstore/4.jpg',
    title: 'Kochen im perfekten Flow',
    subtitle: 'Schritt für Schritt mit automatischen Timern',
    alt: 'Snagbite App Vorschau: Interaktiver Kochmodus mit Zutaten-Highlighting und Ofen-Timer',
  },
  {
    id: '5',
    src: '/playstore/5.jpg',
    title: 'Persönlicher Küchenchef',
    subtitle: 'Zutaten tauschen & smarte Tipps erhalten',
    alt: 'Snagbite App Vorschau: KI Rezept-Copilot für Zutatentausch und Varianten',
  },
  {
    id: '6',
    src: '/playstore/6.jpg',
    title: 'Deine Woche perfekt geplant',
    subtitle: 'Rezepte mit einem Klick deinen Wochentagen zuweisen',
    alt: 'Snagbite App Vorschau: Wochenplaner mit Mo-So Übersicht und Einkaufslisten-Übertrag',
  },
];
