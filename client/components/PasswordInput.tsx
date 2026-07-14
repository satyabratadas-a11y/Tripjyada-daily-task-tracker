'use client';

import { useState } from 'react';
import InputIcon from '@/components/InputIcon';

export default function PasswordInput({
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
  variant = 'default',
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  variant?: 'default' | 'glass';
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const isGlass = variant === 'glass';

  return (
    <div className="relative">
      <InputIcon icon="fa-solid fa-lock" variant={isGlass ? 'glass' : 'default'} />
      <input
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${isGlass ? 'glass-input' : 'input'} ${className} pl-9 pr-10`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className={`absolute inset-y-0 right-0 flex items-center px-3 text-sm transition ${
          isGlass ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-brand'
        }`}
      >
        <i className={visible ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
      </button>
    </div>
  );
}
