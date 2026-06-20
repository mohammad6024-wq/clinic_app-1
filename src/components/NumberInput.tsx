import React, { useState, useEffect } from 'react';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChangeValue: (val: number) => void;
}

export default function NumberInput({ value, onChangeValue, className, ...props }: NumberInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');

  useEffect(() => {
    // Only update from props when not focused (to avoid jumping cursors)
    if (value !== undefined && value !== null && value !== 0) {
      setDisplayValue(value.toLocaleString('en-US'));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip everything except digits
    let raw = e.target.value.replace(/[^0-9۰-۹]/g, '');
    
    // Convert Arabic/Persian digits to English just in case
    const englishRaw = raw.replace(/[۰-۹]/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
    
    if (!englishRaw) {
      setDisplayValue('');
      onChangeValue(0);
      return;
    }

    const num = parseInt(englishRaw, 10);
    if (!isNaN(num)) {
      setDisplayValue(num.toLocaleString('en-US'));
      onChangeValue(num);
    }
  };

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      className={`${className} font-mono text-left text-lg`}
      dir="ltr"
      {...props}
    />
  );
}
