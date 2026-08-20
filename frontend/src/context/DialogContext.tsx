import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@heroui/react';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';
import { useI18n } from './I18nContext';
import { useAdOverlay } from './OverlayStackContext';

export type DialogStatus = 'danger' | 'warning' | 'success' | 'info';
export type DialogType = 'alert' | 'confirm';

interface DialogOptions {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  status?: DialogStatus;
}

interface DialogContextProps {
  alert: (options: DialogOptions) => Promise<void>;
  confirm: (options: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextProps | undefined>(undefined);

const defaultDialogContext: DialogContextProps = {
  alert: async (opts) => {
    const text = typeof opts.message === 'string' ? opts.message : opts.title;
    window.alert(text);
  },
  confirm: async (opts) => {
    const text = typeof opts.message === 'string' ? opts.message : opts.title;
    return window.confirm(text);
  },
};

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    console.warn('[DialogContext] useDialog called outside DialogProvider, using fallback.');
    return defaultDialogContext;
  }
  return context;
}

interface DialogState {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  status: DialogStatus;
  resolve: ((value: boolean) => void) | null;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<DialogState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    confirmLabel: 'OK',
    cancelLabel: 'Abbrechen',
    status: 'info',
    resolve: null,
  });

  // Register with overlay stack for ad hide/resume
  useAdOverlay(state.isOpen);

  const showDialog = useCallback((type: DialogType, options: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        isOpen: true,
        type,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || (type === 'confirm' ? t('dialog.confirmDefault') : 'OK'),
        cancelLabel: options.cancelLabel || t('dialog.cancelDefault'),
        status: options.status || 'info',
        resolve,
      });
    });
  }, [t]);


  const alert = useCallback((options: DialogOptions) => {
    return showDialog('alert', options).then(() => {});
  }, [showDialog]);

  const confirm = useCallback((options: DialogOptions) => {
    return showDialog('confirm', options);
  }, [showDialog]);

  const handleClose = useCallback((value: boolean) => {
    if (state.resolve) {
      state.resolve(value);
    }
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state]);

  // Determine Icon based on status
  const getIcon = () => {
    switch (state.status) {
      case 'danger':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
      case 'info':
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getStatusClasses = () => {
    switch (state.status) {
      case 'danger':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-none';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none';
      case 'success':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none';
      case 'info':
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none';
    }
  };

  const getConfirmButtonClasses = () => {
    switch (state.status) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl border-none shadow-none active:scale-95 transition-all px-4 py-2.5 h-11 cursor-pointer';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-2xl border-none shadow-none active:scale-95 transition-all px-4 py-2.5 h-11 cursor-pointer';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl border-none shadow-none active:scale-95 transition-all px-4 py-2.5 h-11 cursor-pointer';
      case 'info':
      default:
        return 'bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl border-none shadow-none active:scale-95 transition-all px-4 py-2.5 h-11 cursor-pointer';
    }
  };

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}

      {state.isOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => state.type === 'confirm' ? null : handleClose(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-sm rounded-3xl border-none p-6 shadow-[0_10px_40px_rgba(0,0,0,0.15)] bg-white dark:bg-gray-900 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button for Alert, or optional */}
            {state.type === 'alert' && (
              <button 
                onClick={() => handleClose(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all border-none active:scale-95 cursor-pointer"
                aria-label={t('dialog.closeAria')}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Header: Icon + Title */}
            <div className="flex gap-3.5 items-start">
              <div className={`w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center ${getStatusClasses()}`}>
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                  {state.title}
                </h3>
              </div>
            </div>

            {/* Body Description */}
            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed pl-14.5 whitespace-pre-line">
              {renderMessage(state.message)}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2.5 mt-2 pl-14.5">
              {state.type === 'confirm' && (
                <Button 
                  variant="tertiary"
                  onPress={() => handleClose(false)}
                  className="rounded-2xl font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-none active:scale-95 transition-all px-4 py-2.5 h-11 cursor-pointer"
                >
                  {state.cancelLabel}
                </Button>
              )}
              <Button 
                onPress={() => handleClose(true)}
                className={getConfirmButtonClasses()}
              >
                {state.confirmLabel}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </DialogContext.Provider>
  );
}

const renderMessage = (msg: React.ReactNode) => {
  if (typeof msg !== 'string') return msg;
  if (!msg.includes('**')) return msg;
  const parts = msg.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <strong key={index} className="font-bold text-gray-900 dark:text-white">
          {part}
        </strong>
      );
    }
    return part;
  });
};
