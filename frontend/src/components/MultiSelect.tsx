import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options, selected, onChange, placeholder,
}) => {
  const [isOpen, setIsOpen]   = useState(false);
  const [search, setSearch]   = useState('');
  const containerRef          = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(
    (o) => o.toLowerCase().includes(search.toLowerCase()) && !selected.includes(o),
  );

  const add    = (item: string) => { onChange([...selected, item]); setSearch(''); inputRef.current?.focus(); };
  const remove = (item: string) => { onChange(selected.filter((s) => s !== item)); };

  /* How many chips to show inline before collapsing */
  const MAX_VISIBLE = 4;
  const visibleChips = selected.slice(0, MAX_VISIBLE);
  const hiddenCount  = selected.length - MAX_VISIBLE;

  return (
    <div ref={containerRef} className="relative space-y-1.5">

      {/* ── Trigger input ─────────────────────────────── */}
      <div
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-text
          transition-colors bg-bg select-none
          ${isOpen ? 'border-accent' : 'border-line hover:border-line2'}`}
      >
        <Search className="w-3.5 h-3.5 text-fg3 shrink-0" />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={
            selected.length === 0
              ? placeholder
              : search === '' ? `${selected.length} selected` : ''
          }
          className="flex-1 min-w-0 bg-transparent text-[12.5px] text-fg outline-none
            placeholder-fg3 leading-none"
        />
        <ChevronDown
          className={`w-3.5 h-3.5 text-fg3 shrink-0 transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {/* ── Selected chips (compact, below input) ─────── */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleChips.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full
                bg-accent/10 border border-accent/20 text-accent
                text-[11px] font-medium leading-none"
            >
              <span className="max-w-[140px] truncate">{item}</span>
              <button
                onClick={(e) => { e.stopPropagation(); remove(item); }}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center
                  hover:bg-accent/20 transition-colors shrink-0"
              >
                <X className="w-2 h-2" />
              </button>
            </span>
          ))}
          {hiddenCount > 0 && (
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full
                bg-card2 border border-line text-fg3 text-[11px] font-medium cursor-pointer
                hover:text-fg transition-colors"
              onClick={() => setIsOpen(true)}
            >
              +{hiddenCount} more
            </span>
          )}
        </div>
      )}

      {/* ── Dropdown ──────────────────────────────────── */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-0.5 bg-card border border-line rounded-xl
          shadow-xl shadow-black/10 max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-[12px] text-fg3 px-4 py-3 text-center">
              {search ? 'No matches' : 'All options selected'}
            </p>
          ) : (
            <div className="py-1">
              {filtered.map((item) => (
                <button
                  key={item}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(item)}
                  className="w-full text-left px-3.5 py-2 text-[12.5px] text-fg2
                    hover:bg-card2 hover:text-fg transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
