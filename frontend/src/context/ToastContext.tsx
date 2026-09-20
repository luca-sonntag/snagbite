import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { ToastContextValue, ToastItemData, ToastOptions } from '../components/Toast/types';
import ToastContainer from '../components/Toast/ToastContainer';

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 3500;
const MAX_VISIBLE_TOASTS = 3;
const EXIT_ANIMATION_DURATION = 220;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItemData[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeImmediately = useCallback((id: string) => {
    const existingTimeout = timeoutsRef.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismiss = useCallback((id: string) => {
    // Mark as exiting for smooth exit animation
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );

    const existingTimeout = timeoutsRef.current.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutsRef.current.delete(id);
    }

    setTimeout(() => {
      removeImmediately(id);
    }, EXIT_ANIMATION_DURATION);
  }, [removeImmediately]);

  const dismissAll = useCallback((animated = true) => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.clear();

    if (animated) {
      setToasts((prev) => {
        if (prev.length === 0) return prev;
        return prev.map((t) => ({ ...t, isExiting: true }));
      });
      setTimeout(() => {
        setToasts([]);
      }, EXIT_ANIMATION_DURATION);
    } else {
      setToasts([]);
    }
  }, []);

  // Automatically dismiss active toasts with smooth exit animation whenever navigation occurs
  useEffect(() => {
    const handleNavigation = () => {
      dismissAll(true);
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [dismissAll]);

  const show = useCallback(
    (options: ToastOptions): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = options.duration ?? DEFAULT_DURATION;

      const newToast: ToastItemData = {
        id,
        type: options.type ?? 'info',
        title: options.title,
        description: options.description,
        icon: options.icon,
        action: options.action,
        duration,
        createdAt: Date.now(),
        isExiting: false,
      };

      setToasts((prev) => {
        // Keep at most MAX_VISIBLE_TOASTS - 1 before appending new one
        const active = prev.filter((t) => !t.isExiting);
        const trimmed = active.length >= MAX_VISIBLE_TOASTS
          ? active.slice(active.length - (MAX_VISIBLE_TOASTS - 1))
          : active;
        return [...trimmed, newToast];
      });

      if (duration > 0) {
        const timeout = setTimeout(() => {
          dismiss(id);
        }, duration);
        timeoutsRef.current.set(id, timeout);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) =>
      show({ ...options, title, type: 'success' }),
    [show]
  );

  const info = useCallback(
    (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) =>
      show({ ...options, title, type: 'info' }),
    [show]
  );

  const warning = useCallback(
    (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) =>
      show({ ...options, title, type: 'warning' }),
    [show]
  );

  const danger = useCallback(
    (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) =>
      show({ ...options, title, type: 'danger' }),
    [show]
  );

  const contextValue: ToastContextValue = {
    toasts,
    show,
    success,
    info,
    warning,
    danger,
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const fallbackContext: ToastContextValue = {
  toasts: [],
  show: () => '',
  success: () => '',
  info: () => '',
  warning: () => '',
  danger: () => '',
  dismiss: () => {},
  dismissAll: () => {},
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    console.warn('[ToastContext] useToast called outside ToastProvider, using fallback.');
    return fallbackContext;
  }
  return context;
}
