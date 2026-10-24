import { useState } from 'react';
import { BookOpen, Calendar, Clock, Search, X } from 'lucide-react';
import type { AdminUserItem } from './types';

interface AdminUsersPanelProps {
  isDe: boolean;
  users: AdminUserItem[];
}

export function AdminUsersPanel({ isDe, users }: AdminUsersPanelProps) {
  const [usersRange, setUsersRange] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const filteredUsers = (() => {
    let result = users;
    if (usersRange !== 'all') {
      const days = usersRange === 'today' ? 1 : usersRange === '7d' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - (days - 1));
      result = result.filter((u) => u.created_at && new Date(u.created_at) >= cutoff);
    }
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.trim().toLowerCase();
      result = result.filter(
        (u) =>
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.id && u.id.toLowerCase().includes(q)) ||
          (u.tier && u.tier.toLowerCase().includes(q)),
      );
    }
    return result;
  })();

  const fmt = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(isDe ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap sm:flex-nowrap gap-1 bg-gray-100 p-1 sm:p-1.5 rounded-2xl border-none">
        {(
          [
            { id: 'all', label: isDe ? 'Alle Nutzer' : 'All Users' },
            { id: 'today', label: isDe ? 'Heute' : 'Today' },
            { id: '7d', label: isDe ? '7 Tage' : '7 days' },
            { id: '30d', label: isDe ? '30 Tage' : '30 days' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setUsersRange(id)}
            className={`flex-1 min-w-[40%] sm:min-w-0 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap border-none ${
              usersRange === id
                ? 'bg-white text-emerald-600 shadow-[0_2px_6px_rgba(0,0,0,0.03)]'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6 rounded-2xl md:rounded-3xl border-none bg-white shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5">
            <span className="text-xs font-bold text-gray-500">
              {filteredUsers.length}{' '}
              {usersRange === 'all'
                ? isDe
                  ? 'registrierte Nutzer'
                  : 'registered users'
                : isDe
                  ? 'neue Nutzer'
                  : 'new users'}
            </span>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isDe ? 'Nutzer filtern...' : 'Filter users...'}
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full bg-gray-100 pl-8 pr-7 py-1.5 text-xs rounded-xl border-none font-medium text-gray-900 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-gray-400"
              />
              {userSearchQuery && (
                <button
                  type="button"
                  onClick={() => setUserSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer border-none p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8 font-medium">
              {userSearchQuery
                ? isDe
                  ? 'Keine Nutzer für diese Suche gefunden.'
                  : 'No users matching your search.'
                : isDe
                  ? 'Keine Nutzer im gewählten Zeitraum.'
                  : 'No users found for this timeframe.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredUsers.map((user) => {
                const tierColor =
                  user.tier === 'premium'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : user.tier === 'alpha'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-gray-100 text-gray-600';

                return (
                  <div
                    key={user.id}
                    className="p-3.5 sm:p-4 bg-gray-50/70 hover:bg-gray-50 border-none rounded-2xl flex items-start sm:items-center gap-3.5 shadow-[0_2px_6px_rgba(0,0,0,0.02)] transition-all"
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border-none shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                        user.tier === 'premium'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : user.tier === 'alpha'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-gray-200/70 text-gray-700'
                      }`}
                    >
                      {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 min-w-0">
                        <span
                          className="text-sm font-bold text-gray-900 truncate"
                          title={user.email}
                        >
                          {user.email}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border-none ${tierColor}`}
                          >
                            {user.tier || 'free'}
                          </span>
                          {user.custom_limit !== null && user.custom_limit !== undefined && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border-none">
                              limit: {user.custom_limit === -1 ? '∞' : user.custom_limit}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-gray-500">
                        <div className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-lg border-none">
                          <BookOpen className="w-3 h-3 text-emerald-600" />
                          <span>
                            {user.extractions_count ?? 0}{' '}
                            {isDe ? 'Extraktionen' : 'extractions'}
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1 text-gray-500">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>
                            {isDe ? 'Registriert:' : 'Joined:'} {fmt(user.created_at)}
                          </span>
                        </div>

                        <div className="inline-flex items-center gap-1 text-gray-500">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>
                            {isDe ? 'Letzter Login:' : 'Last login:'}{' '}
                            {fmt(user.last_sign_in_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
