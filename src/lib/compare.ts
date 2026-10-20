// src/lib/compare.ts
import { SLOTS, Slot, Stats, Item, Selection } from '../types';

export const ZERO_STATS: Stats = {
  strength: 0,
  agility: 0,
  intellect: 0,
  physAtk: 0,
  physDef: 0,
  magAtk: 0,
  magDef: 0,
  health: 0,
  mana: 0,
  durability: 0,
};

export const addStats = (a: Stats, b: Stats): Stats => ({
  strength: a.strength + b.strength,
  agility: a.agility + b.agility,
  intellect: a.intellect + b.intellect,
  physAtk: a.physAtk + b.physAtk,
  physDef: a.physDef + b.physDef,
  magAtk: a.magAtk + b.magAtk,
  magDef: a.magDef + b.magDef,
  health: a.health + b.health,
  mana: a.mana + b.mana,
  durability: a.durability + b.durability,
});

export const diffStats = (a: Stats, b: Stats): Stats => ({
  strength: b.strength - a.strength,
  agility: b.agility - a.agility,
  intellect: b.intellect - a.intellect,
  physAtk: b.physAtk - a.physAtk,
  physDef: b.physDef - a.physDef,
  magAtk: b.magAtk - a.magAtk,
  magDef: b.magDef - a.magDef,
  health: b.health - a.health,
  mana: b.mana - a.mana,
  durability: b.durability - a.durability,
});

export const sumStats = (items: Item[]): Stats =>
  items.reduce((acc, it) => addStats(acc, it.stats), { ...ZERO_STATS });

export type SlotView = {
  slot: Slot;
  itemA: Item | null;
  itemB: Item | null;
  statsDiff: Stats;
};

export type Resolved =
  | {
      kind: 'empty';
      items: Item[];
      slots: Record<Slot, Item | null>;
    }
  | {
      kind: 'item';
      items: Item[];
      slots: Record<Slot, Item | null>;
    }
  | {
      kind: 'set';
      items: Item[];
      slots: Record<Slot, Item | null>;
      setId: string;
      studyCostTWR: number;
    };

const emptySlots = (): Record<Slot, Item | null> => ({
  head: null,
  chest: null,
  weapon: null,
  legs: null,
  ring: null,
  amulet: null,
});

export function resolveSelection(
  sel: Selection,
  items: Map<string, Item>,
  sets: Map<string, { itemIds: string[]; studyCostTWR: number }>,
): Resolved {
  if (sel.kind === 'empty') {
    return { kind: 'empty', items: [], slots: emptySlots() };
  }

  if (sel.kind === 'item') {
    const it = items.get(sel.id);
    if (!it) return { kind: 'empty', items: [], slots: emptySlots() };
    const slots = emptySlots();
    slots[it.slot] = it;
    return { kind: 'item', items: [it], slots };
  }

  const set = sets.get(sel.id);
  if (!set) return { kind: 'empty', items: [], slots: emptySlots() };
  const slots = emptySlots();
  const list: Item[] = [];
  for (const id of set.itemIds) {
    const it = items.get(id);
    if (!it) continue;
    slots[it.slot] = it;
    list.push(it);
  }
  return {
    kind: 'set',
    items: list,
    slots,
    setId: sel.id,
    studyCostTWR: set.studyCostTWR,
  };
}

export function compareSlots(a: Resolved, b: Resolved): SlotView[] {
  return SLOTS.map((slot) => {
    const itemA = a.slots[slot];
    const itemB = b.slots[slot];
    const statsA = itemA?.stats ?? ZERO_STATS;
    const statsB = itemB?.stats ?? ZERO_STATS;
    return { slot, itemA, itemB, statsDiff: diffStats(statsA, statsB) };
  });
}

export function sumIngredients(items: Item[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    for (const ing of it.ingredients) {
      m.set(ing.materialId, (m.get(ing.materialId) ?? 0) + ing.qty);
    }
  }
  return m;
}

export type ResourceDiff = {
  materialId: string;
  qtyA: number;
  qtyB: number;
  qtyDiff: number;
};

export function diffResources(a: Resolved, b: Resolved): ResourceDiff[] {
  const ma = sumIngredients(a.items);
  const mb = sumIngredients(b.items);
  const ids = new Set<string>([...ma.keys(), ...mb.keys()]);
  return [...ids]
    .map((materialId) => {
      const qtyA = ma.get(materialId) ?? 0;
      const qtyB = mb.get(materialId) ?? 0;
      return { materialId, qtyA, qtyB, qtyDiff: qtyB - qtyA };
    })
    .sort((x, y) => Math.abs(y.qtyDiff) - Math.abs(x.qtyDiff));
}

export function marketValue(items: Item[]): number {
  return items.reduce((s, it) => s + it.marketPriceTWR, 0);
}

export function craftValue(
  items: Item[],
  materials: Map<string, { marketPriceTWR: number }>,
): number {
  let total = 0;
  for (const it of items) {
    for (const ing of it.ingredients) {
      const mat = materials.get(ing.materialId);
      if (mat) total += mat.marketPriceTWR * ing.qty;
    }
  }
  return total;
}

export function isIncomplete(r: Resolved): boolean {
  return r.kind === 'set' && r.items.length < 6;
}

export function statsAsArray(s: Stats): Array<{ key: keyof Stats; value: number }> {
  return (Object.keys(s) as (keyof Stats)[]).map((key) => ({ key, value: s[key] }));
}