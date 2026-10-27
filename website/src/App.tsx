import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Download } from 'lucide-react';

import LandingPage from './pages/LandingPage';
import DataDeletionPage from './pages/DataDeletionPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import LegalPage from './pages/LegalPage';
import TermsPage from './pages/TermsPage';
import AdminPage from './pages/AdminPage';
import InviteLandingPage from './pages/InviteLandingPage';

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=at.snagbite.app';

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans transition-colors dark:bg-gray-950 dark:text-gray-100">
      {!isAdminRoute && (
        <header className="w-full max-w-5xl mx-auto px-5 sm:px-8 pt-6 pb-2 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 group active:scale-95 transition-transform"
          >
            <img
              src="/icon-192.png"
              alt="Snagbite"
              className="w-9 h-9 rounded-xl object-contain"
            />
            <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white font-sans">
              Snagbite
            </span>
          </Link>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 min-h-[40px] rounded-full active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Play Store</span>
          </a>
        </header>
      )}

      <main className="flex-1 flex flex-col items-center w-full">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/invite/:code" element={<InviteLandingPage />} />
          <Route path="/invite" element={<InviteLandingPage />} />
          <Route path="/delete-data" element={<DataDeletionPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      <footer className="w-full mt-auto pt-10 pb-8">
        <div className="w-full max-w-5xl mx-auto px-5 sm:px-8 pt-6 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2.5">
            <img src="/icon-192.png" alt="Snagbite Logo" className="w-5 h-5 rounded-md opacity-85" />
            <p className="m-0">© {new Date().getFullYear()} Snagbite. Alle Rechte vorbehalten.</p>
          </div>
          <nav className="flex gap-6 flex-wrap justify-center">
            <Link to="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Datenschutzerklärung</Link>
            <Link to="/legal" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Impressum</Link>
            <Link to="/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">AGB</Link>
            <Link to="/delete-data" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Daten löschen</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
