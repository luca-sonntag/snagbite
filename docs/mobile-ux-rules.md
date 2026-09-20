# 📱 Mobile UX & Native App Feeling — Design-Regeln

> Verbindliche Richtlinien für smartphone-optimiertes UI/UX in der gesamten App.
> Diese Regeln ergänzen den [UI Styleguide](file:///c:/Users/lucas/source/repos/cookbook/docs/styleguide.md) und die [Clean Code Guidelines](file:///c:/Users/lucas/source/repos/cookbook/docs/clean-code.md).

---

## 1. Touch-Targets (Minimum Tap Areas)

* **Minimale Interaktionsfläche: 44×44px** (Apple HIG) bzw. 48×48dp (Material Design).
* Buttons, Icons, Stepper, Toggles und alle interaktiven Elemente MÜSSEN diese Mindestgröße einhalten.
* Bei visuell kleinen Icons (16–20px) die Tap-Area über Padding vergrößern: `p-2.5` bis `p-3`.
* Abstände zwischen benachbarten Touch-Targets: mindestens 8px, um versehentliches Antippen zu vermeiden.
* **Prüfung:** Im Browser mit DevTools Mobile-Emulation (Touch-Kreise aktivieren) testen.

---

## 2. Haptisches Feedback

* **Jede taktile Interaktion** (Stepper +/−, Toggles, Swipe-Bestätigungen, destruktive Aktionen) MUSS haptisches Feedback auslösen.
* Nutze die zentrale Utility `frontend/src/utils/haptics.ts`:
  * `hapticLight()` — Stepper, kleine Toggles, Chip-Auswahl
  * `hapticMedium()` — Bestätigungen, erfolgreiche Aktionen
  * `hapticHeavy()` — Destruktive Aktionen (Löschen, Zurücksetzen)
  * `hapticSelection()` — Picker-Scrolling, Segmentwechsel
  * `hapticNotification('success' | 'warning' | 'error')` — Toast-artige Rückmeldungen
* Im Web (Browser-Dev) sind alle Haptics automatisch No-Ops.

---

## 3. Übergänge & Animationen (Transitions)

* **Zustandswechsel** (Tab-Wechsel, Tageswechsel, Filter-Änderungen) MÜSSEN mit einer subtilen Transition begleitet werden (150–300ms).
* Bevorzugte Easing: `ease-out` für Einblendungen, `ease-in-out` für Morphing.
* Richtungsabhängige Animationen: Vorwärts = slide-left, Rückwärts = slide-right.
* **Tailwind-Pattern für Übergänge:**
  ```
  transition-all duration-200 ease-out
  ```
* Keine harten Zustandssprünge — der Content darf nie "flickern" oder abrupt wechseln.

---

## 4. Swipe-Gesten

* Horizontale Swipe-Navigation SOLLTE für karussell-artige Ansichten bereitgestellt werden (Kalender-Tage, Wochen, Bild-Galerien).
* Nutze den zentralen Hook `frontend/src/hooks/useSwipeGesture.ts`.
* Schwellenwert: 50px horizontal bei max. 100px vertikaler Abweichung.
* Swipe-Gesten ersetzen NIE Touch-Buttons — sie ergänzen sie als Shortcut.

---

## 5. Leere Zustände (Empty States)

* Leere Listen, leere Tage, leere Slots MÜSSEN einen freundlichen Empty-State zeigen.
* Aufbau: Emoji/Icon (32–48px) + Kurztext (1 Zeile, 12–14px) + optionaler CTA-Button.
* Keine repetitiven identischen Platzhalter — wenn alle Slots leer sind, einen einzigen aggregierten Empty-State zeigen.
* Empty-State-Buttons mit sanftem Farb-Akzent (emerald-50/emerald-500 Border) statt grauer dashed-Borders.

---

## 6. Interaktive Affordance

* Interaktive Elemente MÜSSEN sich visuell von statischem Content unterscheiden:
  * Buttons/Links: Farbakzent, leichter Shadow oder Border
  * Klickbare Karten: `cursor-pointer`, `active:scale-[0.98]`, hover-Effekt
  * Nicht-interaktive Labels: Kein Hover, kein Cursor-Change
* Dashed-Border-Buttons (Add-Platzhalter) brauchen einen leichten Farbhintergrund und deutlichen Kontrast.

---

## 7. Modale & Overlays (Bottom Sheets)

* Bottom Sheets MÜSSEN den Backdrop als Dismiss-Target nutzen (`onClick={onClose}` auf dem Overlay-Hintergrund).
* Modale auf Mobile: Immer als Bottom Sheet (`items-end`, `rounded-t-3xl`), nie als zentriertes Desktop-Modal.
* Datums- und Zeitangaben in Modalen MÜSSEN menschenfreundlich formatiert sein (z. B. `Fr, 28. Aug` statt `2026-08-28`).

---

## 8. Visueller Fokus & Selektion

* **Aktiver/Selektierter Zustand:** Emerald-600 Background, White Text, Shadow, leichte Scale (1.03–1.08).
* **Inaktiver Zustand:** Transparent oder sehr schwacher Background (`bg-gray-50`), kein eigener Shadow.
* Der Kontrast zwischen aktiv und inaktiv MUSS auf einen Blick erkennbar sein — nicht nur Farbunterschied, sondern auch Elevation (Shadow vs. kein Shadow).

---

## 9. Bilder & Thumbnails

* Rezeptbilder in kompakten Listen/Karten: Minimum 72×72px (`w-18 h-18`), ideal 80×80px (`w-20 h-20`).
* Rezeptbilder in großen Karten/Headers: Mindestens 120px Höhe.
* Immer `rounded-xl` oder `rounded-2xl` mit `overflow-hidden`.
* Food-Imagery profitiert von etwas mehr Platz als generische Icons — im Zweifel größer.
