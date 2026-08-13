import { Link } from 'react-router-dom';
import { legal } from '../legal';
import { Card } from '@heroui/react';
import { Smartphone, ShieldCheck, Mail, CreditCard } from 'lucide-react';

export default function DataDeletionPage() {
  const steps = [
    { num: '1', text: 'Öffne die Snagbite App auf deinem Mobilgerät.' },
    { num: '2', text: 'Navigiere zum Profil- oder Settings-Tab unten rechts.' },
    { num: '3', text: 'Scrolle ganz nach unten.' },
    { num: '4', text: 'Tippe auf den roten Button „Account & Daten löschen“.' },
    { num: '5', text: 'Bestätige die Sicherheitsabfrage.' },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-8">
      <div>
        <Link to="/" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
          ← Zurück zur Startseite
        </Link>
      </div>

      {/* Page Header */}
      <div className="bg-rose-500/5 dark:bg-rose-500/10 border-none rounded-2xl p-6 md:p-8 flex flex-col gap-2">
        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Account-Verwaltung</span>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
          Daten löschen
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Du hast das Recht auf Löschung deiner personenbezogenen Daten (Art. 17 DSGVO).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Step by step Card */}
        <div className="md:col-span-7 flex flex-col gap-6">
          <Card className="p-6 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] bg-white dark:bg-gray-900 rounded-3xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <Smartphone className="w-5 h-5 text-emerald-500" />
              Löschung direkt in der App
            </h2>
            <div className="flex flex-col gap-4">
              {steps.map((step) => (
                <div key={step.num} className="flex gap-4 items-start text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {step.num}
                  </span>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Info callout: What happens */}
          <div className="p-5 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 dark:bg-emerald-500/10 flex gap-4 items-start text-sm">
            <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-gray-800 dark:text-gray-200 block mb-1">Was passiert nach der Löschung?</strong>
              <p className="text-gray-600 dark:text-gray-450 leading-relaxed m-0">
                Dein Konto, alle gespeicherten Rezepte, Sammlungen und Einkaufslisten werden unwiderruflich von unseren Servern entfernt. Rezeptbilder liegen ohnehin nur lokal auf deinem Gerät und werden mit den App-Daten bzw. bei einer Deinstallation automatisch mitentfernt. Diese Aktion ist endgültig.
              </p>
            </div>
          </div>
        </div>

        {/* Side columns / Notes */}
        <div className="md:col-span-5 flex flex-col gap-6">
          {/* Card: Subscriptions */}
          <Card className="p-5 border-none shadow-sm bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Abonnement kündigen</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed m-0">
              Ein bestehendes Premium-Abo wird durch die Kontolöschung nicht automatisch beendet. Bitte kündige es in der Google Play Abo-Verwaltung, um weitere Abbuchungen zu vermeiden.
            </p>
          </Card>

          {/* Card: Email support deletion */}
          <Card className="p-5 border-none shadow-sm glass-panel flex flex-col gap-3">
            <div className="flex items-center gap-2 text-gray-950 dark:text-white font-bold text-sm">
              <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Löschung per E-Mail</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed m-0">
              Falls du keinen Zugriff mehr auf die App hast, sende uns einfach eine E-Mail von deiner registrierten Adresse an:
              <a href={`mailto:${legal.email}`} className="text-emerald-500 hover:underline block font-mono mt-2 break-all text-xs">{legal.email}</a>
            </p>
          </Card>

          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed px-1">
            <strong>Hinweis zu gesetzlichen Aufbewahrungspflichten:</strong> Daten, die wir aufgrund gesetzlicher Vorschriften (z.&nbsp;B. steuer- oder handelsrechtlicher Aufbewahrungspflichten) weiter aufbewahren müssen, werden bis zum Ablauf der Frist gesperrt und erst danach endgültig gelöscht.
          </p>
        </div>

      </div>
    </div>
  );
}
