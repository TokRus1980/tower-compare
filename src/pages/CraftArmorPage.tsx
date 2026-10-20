// src/pages/CraftArmorPage.tsx
import { useMemo, useState } from 'react';
import itemsRaw from '../../data/items.json';
import setsRaw from '../../data/sets.json';
import materialsRaw from '../../data/materials.json';
import {
  Item,
  Material,
  SetDef,
  CLASS_LABEL,
  SLOT_LABEL,
  SLOTS,
  Slot,
} from '../types';
import Combobox, { ComboOption } from '../components/Combobox';

const items = itemsRaw as Item[];
const sets = setsRaw as SetDef[];
const materials = materialsRaw as Material[];

const itemMap = new Map(items.map((i) => [i.id, i]));
const setMap = new Map(sets.map((s) => [s.id, s]));
const matMap = new Map(materials.map((m) => [m.id, m]));

const CATEGORY_ORDER: string[] = [
  'material',
  'mineral',
  'gem',
  'forest',
  'drop',
  'food',
  'scroll',
  'other',
];

const CATEGORY_LABEL: Record<string, string> = {
  material: 'Материалы',
  mineral: 'Ископаемые',
  gem: 'Камни',
  forest: 'Лес',
  drop: 'Дроп с мобов',
  food: 'Еда',
  scroll: 'Магия',
  other: 'Прочее',
};

type Column = {
  slot: Slot;
  item: Item | null;
};

function buildSetOptions(): ComboOption[] {
  return [...sets]
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((s) => {
      const cls = s.classes.map((c) => CLASS_LABEL[c]).join('/');
      return {
        value: `set:${s.id}`,
        label: s.name,
        hint: `ур.${s.level}${cls ? ' · ' + cls : ''}`,
        group: `Уровень ${s.level}`,
      };
    });
}

export default function CraftArmorPage() {
  const [setId, setSetId] = useState<string>(
    sets[0] ? `set:${sets[0].id}` : '',
  );

  const currentSet = useMemo(() => {
    const id = setId.replace('set:', '');
    return setMap.get(id) ?? null;
  }, [setId]);

  // Колонки: 6 слотов в порядке SLOTS
  const columns: Column[] = useMemo(() => {
    if (!currentSet) return SLOTS.map((slot) => ({ slot, item: null }));
    const bySlot = new Map<Slot, Item>();
    for (const itemId of currentSet.itemIds) {
      const it = itemMap.get(itemId);
      if (it) bySlot.set(it.slot, it);
    }
    return SLOTS.map((slot) => ({ slot, item: bySlot.get(slot) ?? null }));
  }, [currentSet]);

  // Строки: ресурсы, сгруппированные по категориям
  // Только те, что реально используются хотя бы в одном слоте
  const groups = useMemo(() => {
    const usage = new Map<string, Map<Slot, number>>(); // materialId → slot → qty
    for (const col of columns) {
      if (!col.item) continue;
      for (const ing of col.item.ingredients) {
        if (!usage.has(ing.materialId)) usage.set(ing.materialId, new Map());
        usage.get(ing.materialId)!.set(col.slot, ing.qty);
      }
    }
    const byCategory = new Map<string, string[]>(); // category → [materialId]
    for (const [materialId, slotMap] of usage) {
      const mat = matMap.get(materialId);
      const cat = mat?.category ?? 'other';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(materialId);
    }
    const result: Array<{
      category: string;
      label: string;
      rows: Array<{
        materialId: string;
        name: string;
        marketPriceTWR: number;
        perSlot: Map<Slot, number>;
        total: number;
      }>;
    }> = [];
    for (const cat of CATEGORY_ORDER) {
      const ids = byCategory.get(cat);
      if (!ids || ids.length === 0) continue;
      ids.sort((a, b) => {
        const ma = matMap.get(a);
        const mb = matMap.get(b);
        return (ma?.name ?? '').localeCompare(mb?.name ?? '');
      });
      result.push({
        category: cat,
        label: CATEGORY_LABEL[cat] ?? cat,
        rows: ids.map((materialId) => {
          const mat = matMap.get(materialId);
          const perSlot = usage.get(materialId) ?? new Map();
          let total = 0;
          for (const q of perSlot.values()) total += q;
          return {
            materialId,
            name: mat?.name ?? materialId,
            marketPriceTWR: mat?.marketPriceTWR ?? 0,
            perSlot,
            total,
          };
        }),
      });
    }
    return result;
  }, [columns]);

  // Итоги по колонкам (сумма всех ресурсов на слот — просто количество штук)
  const columnTotals = useMemo(() => {
    const totals: Record<Slot, number> = {
      head: 0, chest: 0, weapon: 0, legs: 0, ring: 0, amulet: 0,
    };
    for (const g of groups) {
      for (const row of g.rows) {
        for (const [slot, qty] of row.perSlot) {
          totals[slot] += qty;
        }
      }
    }
    return totals;
  }, [groups]);

  // Итоги по строкам (уже есть в row.total)

  return (
    <div className="compare-page">
      <h1>Крафт доспехов</h1>

      <div className="selectors">
        <Combobox
          label="Комплект"
          value={setId}
          options={buildSetOptions()}
          onChange={setSetId}
        />
      </div>

      {currentSet && (
        <div className="material-meta">
          <span className="badge">{currentSet.name}</span>
          <span className="badge badge-blue">ур.{currentSet.level}</span>
          {currentSet.classes.map((c) => (
            <span key={c} className="badge">
              {CLASS_LABEL[c]}
            </span>
          ))}
          {currentSet.itemIds.length < 6 && (
            <span className="badge badge-yellow">⚠️ неполный</span>
          )}
        </div>
      )}

      {!currentSet && <div className="muted">Комплект не выбран</div>}

      {currentSet && (
        <div className="craft-matrix-wrap">
          <table className="craft-matrix">
            <thead>
              <tr>
                <th className="col-resource">Ресурс</th>
                {columns.map((c) => (
                  <th key={c.slot} className="col-slot">
                    <div className="slot-head">
                      <div className="slot-name">{SLOT_LABEL[c.slot]}</div>
                      <div className="slot-item muted small">
                        {c.item?.name ?? '—'}
                      </div>
                    </div>
                  </th>
                ))}
                <th className="col-total">Всего</th>
                <th className="col-price">Рынок</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && (
                <tr>
                  <td colSpan={SLOTS.length + 3} className="muted">
                    У этого комплекта нет ресурсов
                  </td>
                </tr>
              )}
              {groups.map((g) => (
                <>
                  <tr className="group-row" key={'g-' + g.category}>
                    <td colSpan={SLOTS.length + 3}>{g.label}</td>
                  </tr>
                  {g.rows.map((row) => (
                    <tr key={row.materialId}>
                      <td className="col-resource">{row.name}</td>
                      {columns.map((c) => {
                        const qty = row.perSlot.get(c.slot) ?? 0;
                        return (
                          <td
                            key={c.slot}
                            className={
                              'col-slot' + (qty === 0 ? ' zero-cell' : '')
                            }
                          >
                            {qty === 0 ? '—' : qty}
                          </td>
                        );
                      })}
                      <td className="col-total">{row.total}</td>
                      <td className="col-price">
                        {row.marketPriceTWR * row.total}
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="col-resource">Итого (штук)</td>
                {columns.map((c) => (
                  <td key={c.slot} className="col-slot">
                    {columnTotals[c.slot] || '—'}
                  </td>
                ))}
                <td className="col-total">
                  {Object.values(columnTotals).reduce((a, b) => a + b, 0)}
                </td>
                <td className="col-price" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <footer className="muted small">
        Ячейка — количество ресурса на этот слот. «Всего» — сумма по всем
        слотам. «Рынок» — стоимость закупки этого ресурса на все слоты
        (количество × min-цена).
      </footer>
    </div>
  );
}