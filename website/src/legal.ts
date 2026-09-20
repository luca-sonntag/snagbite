/**
 * Zentrale Stammdaten für alle Rechtstexte (Impressum, Datenschutz, AGB,
 * Datenlöschung). Hier – und nur hier – müssen die betreiberbezogenen
 * Pflichtangaben eingetragen werden; alle Rechtsseiten lesen daraus.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  AUSFÜLLEN VOR VERÖFFENTLICHUNG:                                          │
 * │  Nach österreichischem Recht (§ 5 ECG, § 25 MedienG) sind Name und eine   │
 * │  ladungsfähige geografische Anschrift zwingend anzugeben. Eine reine      │
 * │  E-Mail-Adresse oder ein Postfach genügt nicht. Bitte die mit "AUSFÜLLEN" │
 * │  markierten Felder durch die echten Daten des Betreibers ersetzen.        │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

export const legal = {
  /** Voller Name bzw. Firmenwortlaut des Medieninhabers/Diensteanbieters. */
  operatorName: 'AUSFÜLLEN: Vor- und Nachname bzw. Firmenwortlaut',
  /** Straße + Hausnummer der ladungsfähigen Geschäftsanschrift. */
  street: 'AUSFÜLLEN: Straße und Hausnummer',
  /** PLZ + Ort. */
  city: 'AUSFÜLLEN: PLZ und Ort',
  /** Land des Sitzes. */
  country: 'Österreich',
  /** Kontakt-Telefonnummer (optional, aber empfohlen). */
  phone: 'AUSFÜLLEN: Telefonnummer (optional)',
  /** Zentrale Kontakt-E-Mail-Adresse. */
  email: 'snagbite.app@gmail.com',

  /**
   * Umsatzsteuer-Identifikationsnummer (falls vorhanden, sonst leer lassen –
   * Kleinunternehmer ohne UID können dieses Feld auf '' setzen).
   */
  vatId: 'AUSFÜLLEN: UID-Nummer (falls vorhanden)',
  /**
   * Firmenbuchnummer und Firmenbuchgericht (nur falls im Firmenbuch
   * eingetragen – als Einzelunternehmer ohne Eintragung leer lassen: '').
   */
  companyRegister: '',
  /**
   * Zuständige Gewerbebehörde bzw. Hinweis auf die Gewerbeberechtigung
   * (falls ein Gewerbe angemeldet ist, sonst '').
   */
  tradeAuthority: 'AUSFÜLLEN: zuständige Gewerbebehörde (falls Gewerbe angemeldet)',

  /** Firmensitz/Wohnort für die medienrechtliche Offenlegung (§ 25 MedienG). */
  mediaOwnerLocation: 'AUSFÜLLEN: Wohnort bzw. Sitz',

  /** Preise der Premium-Abonnements (Anzeige). */
  priceMonthly: '3,99 €',
  priceYearly: '29,99 €',

  /** Datum der letzten Aktualisierung der Rechtstexte. */
  lastUpdated: '21. September 2026',
};

/** Formatiert die vollständige Anschrift als einzeiligen String. */
export function formattedAddress(): string {
  return `${legal.operatorName}, ${legal.street}, ${legal.city}, ${legal.country}`;
}
