export interface TermsSectionItem {
  id: string;
  title: string;
}

export const TERMS_SECTIONS: TermsSectionItem[] = [
  { id: 'geltungsbereich', title: '1. Geltungsbereich & Partner' },
  { id: 'leistungen', title: '2. Leistungsbeschreibung & KI' },
  { id: 'konto', title: '3. Registrierung & Account' },
  { id: 'nutzung', title: '4. Nutzungsregeln & Privatkopie' },
  { id: 'preise', title: '5. Premium & Rewarded Ads' },
  { id: 'kuendigung', title: '6. Kündigung' },
  { id: 'widerruf', title: '7. Widerrufsrecht' },
  { id: 'haftung', title: '8. Gewährleistung & Gesundheit' },
  { id: 'aenderungen', title: '9. AGB-Änderungen' },
  { id: 'recht', title: '10. Anwendbares Recht' },
  { id: 'salvatorisch', title: '11. Salvatorische Klausel' },
];
