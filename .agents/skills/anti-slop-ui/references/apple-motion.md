# 🍏 Apple Fluid Motion & Mobile Gestures (Mobile UX)

> **Kernprinzip (WWDC *Designing Fluid Interfaces*):** Ein Interface fühlt sich lebendig und nativ an, wenn Animationen **vom aktuellen Zustand ausgehen, die Geschwindigkeit des Fingers (Velocity) nahtlos übernehmen, Momentum nach vorne projizieren und jederzeit im Flug abbrechbar sind.**

---

## 1. Feder-Physik & Timing-Tokens (Spring Physics)

Verwende für interaktive Elemente keine linearen CSS-Transitions (`ease-in-out` fühlt sich roboterhaft an). Nutze Feder-Konstanten oder Apple-Cubic-Beziers:

### Standard-Federkonstanten (Motion / Framer Motion / Web Animations)
| Element | Damping | Stiffness / Response | Verhalten |
|---|---|---|---|
| **Bottom Sheet / Drawer Open** | `damping: 30` (oder `0.85`) | `stiffness: 350` (`response: 0.35s`) | Geschmeidig, folgt der Geste, kein wildes Wackeln |
| **Button Tap / Press-Feedback** | `damping: 20` | `stiffness: 400` | Sofortige haptische Reaktion |
| **Toggle / Checkbox Bounce** | `damping: 15` (oder `0.75`) | `stiffness: 450` | Befriedigender kleiner Pop-Effekt beim Abhaken |
| **Modal / Dialog Fade-Scale** | `damping: 28` | `stiffness: 320` | Ruhig, edel, minimaler Einstieg von 0.95 auf 1.0 |

### CSS-Äquivalent für Tailwind v4 / Pure CSS
Wenn reines CSS verwendet wird, nutze Apples Standard-Bezier-Kurve statt `ease-in-out`:
```css
/* Apples Standard-Fluid-Bezier */
transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
```

---

## 2. Taktiles Feedback bei Berührung (Kill Input Latency)

* **Rückmeldung beim Finger-Aufsetzen (`pointerdown`), nicht beim Loslassen (`click`):**
```tsx
// Sofortige Reaktion beim Drücken mit Mikro-Stauchung
<button className="transition-transform duration-100 ease-out active:scale-[0.97] select-none">
  Rezept kochen
</button>
```

### Haptik via `@capacitor/haptics`
Verbinde Touch-Interaktionen mit subtiler Vibration auf Android & iOS:
```ts
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const triggerHaptic = async (type: 'selection' | 'tap' | 'heavy' | 'success') => {
  try {
    if (type === 'selection') await Haptics.selectionChanged();
    else if (type === 'tap') await Haptics.impact({ style: ImpactStyle.Light });
    else if (type === 'heavy') await Haptics.impact({ style: ImpactStyle.Medium });
    else if (type === 'success') await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Fallback für Desktop / PWA ohne Haptics-Hardware
  }
};
```
* **Checkbox (Zutat abgehakt):** `triggerHaptic('selection')`
* **Button gedrückt (Timer start, Favorit):** `triggerHaptic('tap')`
* **Timer abgelaufen / Rezept importiert:** `triggerHaptic('success')`

---

## 3. Bottom Sheet & Drag-to-Dismiss Mechanik

Ein gutes Mobile Sheet (wie unser `TimerConfirmSheet` oder `FeedbackDrawer`) darf sich **nicht** wie ein Desktop-Modal anfühlen:

### A. 1:1 Tracking & Offset-Treue
* Wenn der Nutzer das Sheet berührt, bewegt sich der Sheet-Inhalt exakt 1:1 mit dem Finger.
* **Kein Zentrieren auf den Finger:** Greift der Nutzer bei Y=40px, bleibt der Anker bei Y=40px.

### B. Rubber-Banding (Widerstand nach oben)
* Wenn das Sheet ganz oben ist und der Nutzer weiter nach oben zieht, darf es nicht blockieren wie eine Wand. Es dehnt sich mit logaritmischem Widerstand:
```ts
// Widerstands-Formel bei Überschreiten der Maximalhöhe
const rubberbandDistance = (dragY: number, dimension: number, constant = 0.55) => {
  return (dragY * dimension * constant) / (dimension + constant * dragY);
};
```

### C. Momentum-Projektion & Velocity Handoff (Apples Formel)
* Ein schnelles Wischen nach unten (Flick) schließt das Sheet **sofort**, selbst wenn die Distanz erst 30px beträgt.
* Apples Formel zur Vorhersage des Zielpunkts:
```ts
// Projected Endpoint basierend auf Geschwindigkeit beim Loslassen
export const projectEndpoint = (currentY: number, velocityY: number, decel = 0.998) => {
  const projectedOffset = (velocityY / 1000) * decel / (1 - decel);
  return currentY + projectedOffset;
};

// Schwellenwert-Logik beim Loslassen:
const handleRelease = (currentY: number, velocityY: number, sheetHeight: number) => {
  const projectedY = projectEndpoint(currentY, velocityY);
  
  // Wenn projizierter Punkt > 40% der Sheet-Höhe ODER Velocity > 600px/s nach unten:
  if (projectedY > sheetHeight * 0.4 || velocityY > 600) {
    dismissSheet(velocityY); // Mit Rest-Geschwindigkeit nach unten schießen
  } else {
    snapBackToOpen(); // Zurückfedern
  }
};
```

---

## 4. Unterbrechbarkeit (Interruptibility)

* **Niemals Touch-Input während einer Transition sperren:**
* Wenn ein Sheet gerade zufährt und der Nutzer tippt erneut hinein, stoppt die Animation sofort und das Sheet wird an der exakten aktuellen Pixel-Position wieder gegriffen.
* Animiere immer vom **aktuellen Ist-Zustand** (Presentation Value), niemals vom logischen Soll-Zustand.
