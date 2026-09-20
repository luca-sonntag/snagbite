export interface PrivacySectionItem {
  id: string;
  title: string;
}

export const PRIVACY_SECTIONS: PrivacySectionItem[] = [
  { id: 'verantwortlicher', title: '1. Verantwortlicher' },
  { id: 'daten', title: '2. Datenkategorien & Abläufe' },
  { id: 'admob', title: '3. Werbung & AdMob' },
  { id: 'zwecke', title: '4. Zwecke & Rechtsgrundlagen' },
  { id: 'ki', title: '5. KI, Nährwerte & Healthy Score' },
  { id: 'empfaenger', title: '6. Empfänger & Dienstleister' },
  { id: 'drittlaender', title: '7. Drittland-Übermittlung' },
  { id: 'dauer', title: '8. Speicherdauer & Storage' },
  { id: 'push', title: '9. Benachrichtigungen' },
  { id: 'community', title: '10. Community & Sichtbarkeit' },
  { id: 'rechte', title: '11. Deine Rechte' },
  { id: 'beschwerde', title: '12. Beschwerderecht' },
  { id: 'alter', title: '13. Jugendschutz' },
  { id: 'sicherheit', title: '14. Datensicherheit' },
  { id: 'aenderungen', title: '15. Änderungen' },
];
