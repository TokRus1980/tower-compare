// src/lib/compare.test.ts
import { describe, it, expect } from 'vitest';
import {
  diffStats,
  sumStats,
  compareSlots,
  diffResources,
  resolveSelection,
  ZERO_STATS,
  marketValue,
  isIncomplete,
} from './compare';
import type { Item, Stats } from '../types';

const S = (p: Partial<Stats>): Stats => ({ ...ZERO_STATS, ...p });

const mkItem = (over: Partial<Item> & Pick<Item, 'id' | 'slot'>): Item => ({
  itemId: 1,
  name: over.id,
  classes: [],
  level: 1,
  setId: null,
  rarity: 'common',
  stats: { ...ZERO_STATS },
  marketPriceTWR: 0,
  ingredients: [],
  ...over,
});

const items = new Map<string, Item>([
  [
    'a',
    mkItem({
      id: 'a',
      slot: 'head',
      stats: S({ intellect: 5 }),
      ingredients: [{ materialId: 'm1', qty: 2 }],
      marketPriceTWR: 100,
    }),
  ],
  [
    'b',
    mkItem({
      id: 'b',
      slot: 'head',
      stats: S({ intellect: 8 }),
      ingredients: [
        { materialId: 'm1', qty: 1 },
        { materialId: 'm2', qty: 3 },
      ],
      marketPriceTWR: 200,
    }),
  ],
  [
    'c',
    mkItem({
      id: 'c',
      slot: 'chest',
      stats: S({ physDef: 10 }),
      ingredients: [{ materialId: 'm2', qty: 2 }],
      marketPriceTWR: 300,
    }),
  ],
]);

const sets = new Map([
  ['sA', { itemIds: ['a', 'c'], studyCostTWR: 5000 }],
]);

describe('diffStats', () => {
  it('B − A', () => {
    expect(diffStats(S({ intellect: 5 }), S({ intellect: 8 })).intellect).toBe(3);
    expect(diffStats(S({ intellect: 8 }), S({ intellect: 5 })).intellect).toBe(-3);
  });
});

describe('sumStats', () => {
  it('сумма по предметам', () => {
    const s = sumStats([items.get('a')!, items.get('c')!]);
    expect(s.intellect).toBe(5);
    expect(s.physDef).toBe(10);
  });
});

describe('resolveSelection', () => {
  it('empty → все слоты пусты', () => {
    const r = resolveSelection({ kind: 'empty' }, items, sets);
    expect(r.kind).toBe('empty');
    expect(Object.values(r.slots).every((x) => x === null)).toBe(true);
  });
  it('item → только его слот', () => {
    const r = resolveSelection({ kind: 'item', id: 'a' }, items, sets);
    expect(r.slots.head?.id).toBe('a');
    expect(r.slots.chest).toBeNull();
  });
  it('set → все слоты заполнены', () => {
    const r = resolveSelection({ kind: 'set', id: 'sA' }, items, sets);
    expect(r.slots.head?.id).toBe('a');
    expect(r.slots.chest?.id).toBe('c');
  });
});

describe('compareSlots', () => {
  it('diff только по отличающимся слотам', () => {
    const A = resolveSelection({ kind: 'item', id: 'a' }, items, sets);
    const B = resolveSelection({ kind: 'item', id: 'b' }, items, sets);
    const rows = compareSlots(A, B);
    expect(rows.find((r) => r.slot === 'head')!.statsDiff.intellect).toBe(3);
    expect(rows.find((r) => r.slot === 'chest')!.statsDiff.physDef).toBe(0);
  });
  it('пусто vs предмет', () => {
    const A = resolveSelection({ kind: 'empty' }, items, sets);
    const B = resolveSelection({ kind: 'item', id: 'b' }, items, sets);
    const rows = compareSlots(A, B);
    expect(rows.find((r) => r.slot === 'head')!.statsDiff.intellect).toBe(8);
  });
});

describe('diffResources', () => {
  it('B − A по материалам', () => {
    const A = resolveSelection({ kind: 'item', id: 'a' }, items, sets);
    const B = resolveSelection({ kind: 'item', id: 'b' }, items, sets);
    const d = diffResources(A, B);
    expect(d.find((x) => x.materialId === 'm1')!.qtyDiff).toBe(-1);
    expect(d.find((x) => x.materialId === 'm2')!.qtyDiff).toBe(3);
  });
});

describe('costs', () => {
  it('marketValue суммы', () => {
    expect(marketValue([items.get('a')!, items.get('c')!])).toBe(400);
  });
  it('isIncomplete на неполном сете', () => {
    const r = resolveSelection({ kind: 'set', id: 'sA' }, items, sets);
    expect(isIncomplete(r)).toBe(true);
  });
});