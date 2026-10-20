// src/components/Combobox.tsx
import { useEffect, useMemo, useRef, useState } from 'react';

export type ComboOption = {
  value: string;          // уникальный ключ: "set:xxx" | "item:yyy" | "empty:"
  label: string;          // отображаемое имя
  group: string;          // "Комплекты" | "Предметы" | ""
  hint?: string;          // дополнительная подпись (ур., слот и т.п.)
  disabled?: boolean;
  meta?: string;          // для группировки/сортировки (необязательно)
};

type Props = {
  label: string;
  value: string;
  options: ComboOption[];
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function Combobox({ label, value, options, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint ?? '').toLowerCase().includes(q),
    );
  }, [options, query]);

  // при открытии — сброс activeIdx на выбранный или первый
  useEffect(() => {
    if (!open) return;
    const idx = filtered.findIndex((o) => o.value === value);
    setActiveIdx(idx >= 0 ? idx : 0);
  }, [open, value, filtered.length]);

  // клик снаружи — закрыть
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const commit = (opt: ComboOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[activeIdx];
      if (opt) commit(opt);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, ComboOption[]>();
    for (const o of filtered) {
      const g = o.group || 'Прочее';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(o);
    }
    return [...map.entries()];
  }, [filtered]);

  // плоский список для навигации (порядок = порядок в grouped)
  const flat = useMemo(() => grouped.flatMap(([, list]) => list), [grouped]);

  // при навигации activeIdx — индекс в flat, а не в filtered
  useEffect(() => {
    if (!open) return;
    const idx = flat.findIndex((o) => o.value === value);
    setActiveIdx(idx >= 0 ? idx : 0);
  }, [open, value, flat.length]);

  return (
    <div className="combobox" ref={rootRef}>
      <span className="selector-label">{label}</span>
      <input
        ref={inputRef}
        className="combo-input"
        value={open ? query : selected?.label ?? ''}
        placeholder={placeholder ?? 'Найти…'}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label={label}
        autoComplete="off"
      />
      {selected && !open && (
        <span className="combo-hint">{selected.hint}</span>
      )}

      {open && (
        <div className="combo-popup" role="listbox">
          {flat.length === 0 && (
            <div className="combo-empty">Ничего не найдено</div>
          )}
          {grouped.map(([group, list]) => (
            <div className="combo-group" key={group}>
              <div className="combo-group-label">{group}</div>
              {list.map((opt) => {
                const idx = flat.indexOf(opt);
                return (
                  <div
                    key={opt.value}
                    className={
                      'combo-item' +
                      (opt.value === value ? ' selected' : '') +
                      (idx === activeIdx ? ' active' : '') +
                      (opt.disabled ? ' disabled' : '')
                    }
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commit(opt);
                    }}
                    role="option"
                    aria-selected={opt.value === value}
                    aria-disabled={opt.disabled}
                  >
                    <span className="combo-item-label">{opt.label}</span>
                    {opt.hint && <span className="combo-item-hint">{opt.hint}</span>}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="combo-count">
            Найдено: {flat.length} из {options.length}
          </div>
        </div>
      )}
    </div>
  );
}