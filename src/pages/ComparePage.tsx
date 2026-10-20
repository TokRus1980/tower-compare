// src/pages/ComparePage.tsx
import { useMemo, useState } from 'react';
import itemsRaw from '../../data/items.json';
import setsRaw from '../../data/sets.json';
import materialsRaw from '../../data/materials.json';
import {
  Item,
  Material,
  SetDef,
  Selection,
  CLASS_LABEL,
  SLOT_LABEL,
  STAT_LABEL,
  Stats,
} from '../types';
import {
  compareSlots,
  diffResources,
  isIncomplete,
  marketValue,
  resolveSelection,
  sumStats,
  craftValue,
} from '../lib/compare';
import { allowedKindsForB } from '../lib/validate';
import Combobox, { ComboOption } from '../components/Combobox';
import SlotTable from '../components/SlotTable';
import { compareWarnings } from '../components/Badges';

const items = itemsRaw as Item[];
const sets = setsRaw as SetDef[];
const materials = materialsRaw as Material[];

const itemMap = new Map(items.map((i) => [i.id, i]));
const setMap = new Map(sets.map((s) => [s.id, s]));
const matMap = new Map(materials.map((m) => [m.id, m]));

const selectionToValue = (s: Selection): string =>
  s.kind === 'empty' ? 'empty:' : `${s.kind}:${s.id}`;

const valueToSelection = (v: string): Selection => {
  const [kind, id] = v.split(':');
  if (kind === 'empty') return { kind: 'empty' };
  if (kind === 'set') return { kind: 'set', id };
  return { kind: 'item', id };
};

// сортируем: сначала комплекты по уровню, потом предметы по слоту и уровню
const sortedSets = [...sets].sort((a, b) =>
  a.level - b.level || a.name.localeCompare(b.name),
);
const sortedItems = [...items].sort(
  (a, b) =>
    a.slot.localeCompare(b.slot) ||
    a.level - b.level ||
    a.name.localeCompare(b.name),
);

function buildOptions(rule?: ReturnType<typeof allowedKindsForB>): ComboOption[] {
  const opts: ComboOption[] = [
    { value: 'empty:', label: '— Пусто —', group: '' },
  ];
  for (const s of sortedSets) {
    const cls = s.classes.map((c) => CLASS_LABEL[c]).join('/');
    opts.push({
      value: `set:${s.id}`,
      label: s.name,
      hint: `ур.${s.level}${cls ? ' · ' + cls : ''}`,
      group: 'Комплекты',
      disabled: !!rule && !rule.allowSets,
    });
  }
  for (const i of sortedItems) {
    opts.push({
      value: `item:${i.id}`,
      label: `${SLOT_LABEL[i.slot]}: ${i.name}`,
      hint: `ур.${i.level}`,
      group: 'Предметы',
      disabled:
        !!rule &&
        rule.allowedSlots !== 'all' &&
        !rule.allowedSlots.includes(i.slot),
    });
  }
  return opts;
}

function StatsLine({ label, a, b, d }: { label: string; a: number; b: number; d: number }) {
  if (a === 0 && b === 0 && d === 0) return null;
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-val">{a}</span>
      <span className="stat-val">{b}</span>
      <span className={d > 0 ? 'pos' : d < 0 ? 'neg' : 'zero'}>
        {d > 0 ? `+${d}` : d}
      </span>
    </div>
  );
}

export default function ComparePage() {
  const [selA, setSelA] = useState<Selection>(
    sets[0] ? { kind: 'set', id: sets[0].id } : { kind: 'empty' },
  );
  const [selB, setSelB] = useState<Selection>({ kind: 'empty' });

  const resA = useMemo(() => resolveSelection(selA, itemMap, setMap), [selA]);
  const resB = useMemo(() => resolveSelection(selB, itemMap, setMap), [selB]);

  const rows = useMemo(() => compareSlots(resA, resB), [resA, resB]);
  const statsA = useMemo(() => sumStats(resA.items), [resA]);
  const statsB = useMemo(() => sumStats(resB.items), [resB]);
  const statsDiff = useMemo(() => {
    const out = { ...statsA };
    for (const k of Object.keys(out) as (keyof Stats)[]) {
      out[k] = statsB[k] - statsA[k];
    }
    return out;
  }, [statsA, statsB]);

  const resources = useMemo(() => diffResources(resA, resB), [resA, resB]);
  const rule = allowedKindsForB(selA, itemMap);
  const warnings = useMemo(() => compareWarnings(resA, resB, setMap), [resA, resB]);

  const swap = () => {
    setSelA(selB);
    setSelB(selA);
  };

  const optionsA = useMemo(() => buildOptions(), []);
  const optionsB = useMemo(() => buildOptions(rule), [rule]);

  return (
    <div className="compare-page">
      <h1>Tower TON — Сравнение комплектов</h1>

      <div className="selectors">
        <Combobox
          label="A"
          value={selectionToValue(selA)}
          options={optionsA}
          onChange={(v) => setSelA(valueToSelection(v))}
        />
        <button className="swap" onClick={swap} title="Поменять местами">
          ⇄
        </button>
        <Combobox
          label="B"
          value={selectionToValue(selB)}
          options={optionsB}
          onChange={(v) => setSelB(valueToSelection(v))}
        />
        <button
          className="reset-b"
          onClick={() => setSelB({ kind: 'empty' })}
          disabled={selB.kind === 'empty'}
          title="Сбросить B"
        >
          ✕
        </button>
      </div>

      {isIncomplete(resA) && (
        <div className="warn">⚠️ Комплект A неполный — сумма занижена</div>
      )}
      {isIncomplete(resB) && (
        <div className="warn">⚠️ Комплект B неполный — сумма занижена</div>
      )}
      {warnings.map((w, i) => (
        <div className="warn" key={i}>
          ⚠️ {w.text}
        </div>
      ))}

      <section>
        <h2>По слотам</h2>
        <SlotTable rows={rows} />
      </section>

      <section>
        <h2>Сумма статов</h2>
        <div className="stats">
          <div className="stat-row stat-head">
            <span className="stat-label">Стат</span>
            <span className="stat-val">A</span>
            <span className="stat-val">B</span>
            <span>Δ</span>
          </div>
          {(Object.keys(STAT_LABEL) as (keyof Stats)[]).map((k) => (
            <StatsLine
              key={k}
              label={STAT_LABEL[k]}
              a={statsA[k]}
              b={statsB[k]}
              d={statsDiff[k]}
            />
          ))}
        </div>
      </section>

      <section>
        <h2>Ресурсы (B − A)</h2>
        {resources.length === 0 ? (
          <div className="muted">Нет ресурсов ни у одного из объектов</div>
        ) : (
          <table className="resources">
            <thead>
              <tr>
                <th>Материал</th>
                <th>A</th>
                <th>B</th>
                <th>Δ</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.materialId}>
                  <td>{matMap.get(r.materialId)?.name ?? r.materialId}</td>
                  <td>{r.qtyA}</td>
                  <td>{r.qtyB}</td>
                  <td
                    className={
                      r.qtyDiff > 0 ? 'neg' : r.qtyDiff < 0 ? 'pos' : 'zero'
                    }
                  >
                    {r.qtyDiff > 0 ? `+${r.qtyDiff}` : r.qtyDiff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Стоимость (TWR)</h2>
        <div className="costs">
          <div className="cost-row">
            <span>Изучение</span>
            <span>{resA.kind === 'set' ? resA.studyCostTWR : '—'}</span>
            <span>{resB.kind === 'set' ? resB.studyCostTWR : '—'}</span>
          </div>
          <div className="cost-row">
            <span>Рынок (min)</span>
            <span>{marketValue(resA.items)}</span>
            <span>{marketValue(resB.items)}</span>
          </div>
          <div className="cost-row">
            <span>Крафт (ресурсы)</span>
            <span>{craftValue(resA.items, matMap)}</span>
            <span>{craftValue(resB.items, matMap)}</span>
          </div>
        </div>
      </section>

      <footer className="muted small">
        Сравнение B − A: положительные значения — B больше, отрицательные — A больше.
      </footer>
    </div>
  );
}