import React from 'react';
import { hapticLight } from '../utils/haptics';

interface AdminSettingsToggleProps {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}

export const AdminSettingsToggle: React.FC<AdminSettingsToggleProps> = ({
  on,
  onClick,
  disabled,
  label,
}) => {
  return (
    <button
      type="button"
      onClick={() => {
        hapticLight();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      aria-pressed={on}
      className={`relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none border-none shrink-0 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center p-0.5 ${
        on ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export default AdminSettingsToggle;
