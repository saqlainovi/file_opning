import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label?: string;
  sub?: string;
}

interface ComboboxInputProps {
  id?: string;
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: (string | ComboboxOption)[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  mono?: boolean;
  type?: string;
  disabled?: boolean;
  helperText?: string;
}

export const ComboboxInput: React.FC<ComboboxInputProps> = ({
  id,
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  className = '',
  inputClassName = '',
  mono = false,
  type = 'text',
  disabled = false,
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal query with external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Normalize options to object format
  const normalizedOptions: ComboboxOption[] = options
    .filter(Boolean)
    .map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt);

  // Remove duplicates based on value
  const uniqueOptions = normalizedOptions.filter((opt, index, self) =>
    index === self.findIndex((t) => t.value.trim().toLowerCase() === opt.value.trim().toLowerCase())
  );

  // Filter options based on typed query ONLY when user is actively typing
  const filteredOptions = (!isTyping || query.trim() === '')
    ? uniqueOptions
    : uniqueOptions.filter(opt => {
        const text = `${opt.label || ''} ${opt.value} ${opt.sub || ''}`.toLowerCase();
        return text.includes(query.toLowerCase());
      });

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setQuery(newVal);
    setIsTyping(true);
    onChange(newVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (val: string) => {
    setQuery(val);
    setIsTyping(false);
    onChange(val);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    setIsTyping(false);
    onChange('');
    if (!isOpen) setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleToggleOpen = () => {
    setIsTyping(false); // Reset typing mode so full list of options is shown
    setIsOpen(prev => !prev);
    if (!isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={`space-y-1 relative ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="block font-bold text-slate-700 uppercase tracking-wide text-xs">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type={type}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setIsTyping(false);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={`w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-16 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:bg-white outline-none transition ${mono ? 'font-mono' : ''} ${inputClassName}`}
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition"
              title="মুছে ফেলুন"
              tabIndex={-1}
            >
              <X size={13} />
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleOpen}
            className={`p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition ${isOpen ? 'rotate-180 text-amber-600' : ''}`}
            title="ড্রপডাউন অপশন দেখুন"
            tabIndex={-1}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {helperText && (
        <p className="text-[10px] text-slate-400">{helperText}</p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[250] left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto py-1 animate-in fade-in-50 zoom-in-95 duration-100">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-slate-400 text-center">
              কোনো পূর্বনির্ধারিত সাজেশন মেলেনি (আপনি যা লিখছেন তাই সংরক্ষিত হবে)
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredOptions.map((opt, i) => {
                const isSelected = opt.value.trim().toLowerCase() === query.trim().toLowerCase();
                return (
                  <button
                    key={`${opt.value}-${i}`}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 hover:bg-amber-50/80 transition cursor-pointer ${
                      isSelected ? 'bg-amber-100/70 font-bold text-amber-950' : 'text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className={`truncate ${mono ? 'font-mono' : ''}`}>{opt.label || opt.value}</span>
                      {opt.sub && <span className="text-[10px] text-slate-400">{opt.sub}</span>}
                    </div>
                    {isSelected && <Check size={13} className="text-amber-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
