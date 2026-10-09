import { useState, useCallback, useEffect } from 'react';
import { apiUrl } from '../api';
import type { AuthSession } from '../auth';

export function useAdminCheck(session: AuthSession | null): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = useCallback(async (token: string | null) => {
    if (!token) {
      setIsAdmin(false);
      return;
    }
    try {
      const response = await fetch(apiUrl('/api/admin/check'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(!!data.isAdmin);
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    checkAdminStatus(session.token);
  }, [session, checkAdminStatus]);

  return isAdmin;
}
