// src/pages/CraftArmorPage.tsx
import { useEffect, useMemo, useState } from 'react';
import itemsRaw from '../../data/items.json';
import setsRaw from '../../data/sets.json';
import materialsRaw from '../../data/materials.json';
import toolsRaw from '../../data/tools.json';
import {
  Item,
  Material,
  SetDef,
  Tool,
  ClassId,
  CLASS_LABEL,
  SLOT_LABEL,
  SLOTS,
  Slot,
} from '../types';
import Combobox, { ComboOption } from '../components/Combobox';
import ItemIcon from '../components/ItemIcon';
import { makeResolver } from '../lib/resolve';

const items = itemsRaw as Item[];
const sets = setsRaw as SetDef[];
const materials = materialsRaw as Material[];
const tools = toolsRaw as Tool[];

const itemMap = new Map(items.map((i) => [i.id, i]));
const setMap = new Map(sets.map((s) => [s.id, s]));
const matMap = new Map(materials.map((m) => [m.id, m]));
const toolMap = new Map(tools.map((t) => [t.id, t]));

const CATEGORY_ORDER: string[] = [
  'material',
  'mineral',
  'gem',
  'forest',
  'drop',
  'food',
  'scroll',
  'item',
  'tool',
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
  item: 'Доспехи (ингредиент)',
  tool: 'Инструменты (ингредиент)',
  other: 'Прочее',
};

const CLASS_ORDER: ClassId[] = [
  'warrior',
  'rogue',
  'fire_mage',
  'water_mage',
  'air_mage',
  'earth_mage',
];

type Column = {
  slot: Slot;
  item: Item | null;
};

function buildSetOptions(filterClass: ClassId | null): ComboOption[] {
  return [...sets]
    .filter((s) => !filterClass || s.classes.includes(filterClass))
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
  const [filterClass, setFilterClass] = useState<ClassId | null>(null);
  const [setId, setSetId] = useState<string>(
    sets[0] ? `set:${sets[0].id}` : '',
  );
  const [detailed, setDetailed] = useState<boolean>(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const update = () => setDetailed(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const resolver = useMemo(
    () => makeResolver(itemMap, toolMap, matMap),
    [],
  );

  // При смене фильтра — если текущий сет не подходит, выбираем первый подходящий
  const setOptions = useMemo(() => buildSetOptions(filterClass), [filterClass]);
  const effectiveSetId = useMemo(() => {
    if (setOptions.some((o) => o.value === setId)) return setId;
    return setOptions[0]?.value ?? '';
  }, [setId, setOptions]);

  const effectiveSet = useMemo(() => {
    const id = effectiveSetId.replace('set:', '');
    return setMap.get(id) ?? null;
  }, [effectiveSetId]);

  const columns: Column[] = useMemo(() => {
    if (!effectiveSet) return SLOTS.map((slot) => ({ slot, item: null }));
    const bySlot = new Map<Slot, Item>();
    for (const itemId of effectiveSet.itemIds) {
      const it = itemMap.get(itemId);
      if (it) bySlot.set(it.slot, it);
    }
    return SLOTS.map((slot) => ({ slot, item: bySlot.get(slot) ?? null }));
  }, [effectiveSet]);

  const groups = useMemo(() => {
    // materialId → slot → qty
    const usage = new Map<string, Map<Slot, number>>();
    for (const col of columns) {
      if (!col.item) continue;
      for (const ing of col.item.ingredients) {
        if (!usage.has(ing.materialId)) usage.set(ing.materialId, new Map());
        usage.get(ing.materialId)!.set(col.slot, ing.qty);
      }
    }

    // Определяем категорию для любого ID (mat_/item_/tool_)
    const categoryOf = (id: string): string => {
      const obj = resolver.objOf(id);
      if (!obj) return 'other';
      if ('category' in obj) return obj.category; // Material
      if ('slot' in obj) return 'item'; // Item
      return 'tool'; // Tool
    };

    const byCategory = new Map<string, string[]>();
    for (const materialId of usage.keys()) {
      const cat = categoryOf(materialId);
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
      ids.sort((a, b) =>
        resolver.nameOf(a).localeCompare(resolver.nameOf(b)),
      );
      result.push({
        category: cat,
        label: CATEGORY_LABEL[cat] ?? cat,
        rows: ids.map((materialId) => {
          const perSlot = usage.get(materialId) ?? new Map<Slot, number>();
          let total = 0;
          for (const q of perSlot.values()) total += q;
          return {
            materialId,
            name: resolver.nameOf(materialId),
            marketPriceTWR: resolver.marketPriceOf(materialId),
            perSlot,
            total,
          };
        }),
      });
    }
    return result;
  }, [columns, resolver]);

  return (
    <div className="compare-page">
      <h1>Крафт доспехов</h1>

      {/* Классы */}
      <div className="class-filter">
        <button
          className={'chip' + (filterClass === null ? ' active' : '')}
          onClick={() => setFilterClass(null)}
        >
          Все
        </button>
        {CLASS_ORDER.map((c) => (
          <button
            key={c}
            className={'chip' + (filterClass === c ? ' active' : '')}
            onClick={() => setFilterClass(c)}
          >
            {CLASS_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="selectors">
        <Combobox
          label="Комплект"
          value={effectiveSetId}
          options={setOptions}
          onChange={setSetId}
        />
        <label className="detailed-toggle">
          <input
            type="checkbox"
            checked={detailed}
            onChange={(e) => setDetailed(e.target.checked)}
          />
          <span>Детально</span>
        </label>
      </div>

      {effectiveSet && (
        <div className="material-meta">
          <span className="badge">{effectiveSet.name}</span>
          <span className="badge badge-blue">ур.{effectiveSet.level}</span>
          {effectiveSet.classes.map((c) => (
            <span key={c} className="badge">
              {CLASS_LABEL[c]}
            </span>
          ))}
          {effectiveSet.itemIds.length < 6 && (
            <span className="badge badge-yellow">⚠️ неполный</span>
          )}
        </div>
      )}

      {!effectiveSet && <div className="muted">Комплект не выбран</div>}

      {effectiveSet && (
        <div className={'craft-matrix-wrap' + (detailed ? ' detailed' : '')}>
          <table className="craft-matrix">
            <thead>
              <tr>
                <th className="col-resource">Ресурс</th>
                {detailed &&
                  columns.map((c) => (
                    <th key={c.slot} className="col-slot">
                      <div className="slot-head">
                        <div className="slot-name">{SLOT_LABEL[c.slot]}</div>
                        {c.item && <ItemIcon name={c.item.name} size={22} />}
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
                  <td
                    colSpan={detailed ? SLOTS.length + 3 : 3}
                    className="muted"
                  >
                    У этого комплекта нет ресурсов
                  </td>
                </tr>
              )}
              {groups.map((g) => (
                <>
                  <tr className="group-row" key={'g-' + g.category}>
                    <td colSpan={detailed ? SLOTS.length + 3 : 3}>
                      {g.label}
                    </td>
                  </tr>
                  {g.rows.map((row) => (
                    <tr key={row.materialId}>
                      <td className="col-resource">
                        <span className="cell-with-icon">
                          <ItemIcon name={row.name} size={14} />
                          <span>{row.name}</span>
                        </span>
                      </td>
                      {detailed &&
                        columns.map((c) => {
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
          </table>
        </div>
      )}

      <footer className="muted small">
        Компактно — только итоговое количество на весь комплект. Детально —
        разбивка по слотам. «Рынок» — количество × min-цена.
      </footer>
    </div>
  );
}