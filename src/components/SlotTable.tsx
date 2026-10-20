// src/components/SlotTable.tsx
import { Fragment, useState } from 'react';
import { SlotView } from '../lib/compare';
import { SLOT_LABEL, STAT_LABEL, Stats } from '../types';

function StatCells({ label, a, b, d }: { label: string; a: number; b: number; d: number }) {
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

export default function SlotTable({ rows }: { rows: SlotView[] }) {
  const [openSlot, setOpenSlot] = useState<string | null>(null);

  return (
    <table className="slots">
      <thead>
        <tr>
          <th>Слот</th>
          <th>A</th>
          <th>B</th>
          <th>Δ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const same = r.itemA?.id && r.itemB?.id && r.itemA.id === r.itemB.id;
          const hasDiff = Object.values(r.statsDiff).some((v) => v !== 0);
          const isOpen = openSlot === r.slot;
          return (
            <Fragment key={r.slot}>
              <tr
                className={'slot-row' + (isOpen ? ' open' : '')}
                onClick={() => hasDiff && setOpenSlot(isOpen ? null : r.slot)}
                style={{ cursor: hasDiff ? 'pointer' : 'default' }}
              >
                <td>
                  {hasDiff && <span className="chevron">{isOpen ? '▾' : '▸'}</span>}
                  {SLOT_LABEL[r.slot]}
                </td>
                <td>{r.itemA?.name ?? '—'}</td>
                <td>{r.itemB?.name ?? '—'}</td>
                <td className="diff-col">
                  {same ? '=' : r.itemA || r.itemB ? '≠' : '—'}
                </td>
              </tr>
              {isOpen && (
                <tr className="slot-detail">
                  <td colSpan={4}>
                    <div className="stats">
                      <div className="stat-row stat-head">
                        <span className="stat-label">Стат</span>
                        <span className="stat-val">A</span>
                        <span className="stat-val">B</span>
                        <span>Δ</span>
                      </div>
                      {(Object.keys(STAT_LABEL) as (keyof Stats)[]).map((k) => (
                        <StatCells
                          key={k}
                          label={STAT_LABEL[k]}
                          a={r.itemA?.stats[k] ?? 0}
                          b={r.itemB?.stats[k] ?? 0}
                          d={r.statsDiff[k]}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}