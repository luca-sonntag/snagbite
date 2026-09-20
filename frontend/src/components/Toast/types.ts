import type React from 'react';

export type ToastType = 'success' | 'info' | 'warning' | 'danger';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  type?: ToastType;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: ToastAction;
  duration?: number;
}

export interface ToastItemData {
  id: string;
  type: ToastType;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: ToastAction;
  duration: number;
  createdAt: number;
  isExiting?: boolean;
}

export interface ToastContextValue {
  toasts: ToastItemData[];
  show: (options: ToastOptions) => string;
  success: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string;
  info: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string;
  warning: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string;
  danger: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}
