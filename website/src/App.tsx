import { Link, Route, Routes, useLocation } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import DataDeletionPage from './pages/DataDeletionPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import LegalPage from './pages/LegalPage';
import TermsPage from './pages/TermsPage';
import InviteLandingPage from './pages/InviteLandingPage';

export default function App() {
  const location = useLocation();
  const isInvitePage = location.pathname.startsWith('/invite');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans transition-colors dark:bg-gray-950 dark:text-gray-100">
      {!isInvitePage && (
        <header className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
              <img src="/icon-192.png" alt="Snagbite Logo" className="w-8 h-8 mr-2 rounded-lg" />
              <span className="font-bold text-inherit text-xl bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">Snagbite</span>
            </Link>
          </div>
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
        </Routes>
      </main>

      <footer className="w-full py-8 border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <img src="/icon-192.png" alt="Snagbite Logo" className="w-5 h-5 rounded-md grayscale opacity-70" />
            <p>© {new Date().getFullYear()} Snagbite. Alle Rechte vorbehalten.</p>
          </div>
          <div className="flex gap-6 flex-wrap justify-center">
            <Link to="/privacy" className="hover:text-emerald-500 transition-colors">Datenschutzerklärung</Link>
            <Link to="/legal" className="hover:text-emerald-500 transition-colors">Impressum</Link>
            <Link to="/terms" className="hover:text-emerald-500 transition-colors">AGB</Link>
            <Link to="/delete-data" className="hover:text-emerald-500 transition-colors">Daten löschen</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
