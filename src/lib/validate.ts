// src/lib/validate.ts
import { Selection, Item, Slot } from '../types';

export type Rule = {
  allowEmpty: boolean;
  allowSets: boolean;
  allowedSlots: Slot[] | 'all';
};

export function allowedKindsForB(a: Selection, items: Map<string, Item>): Rule {
  if (a.kind !== 'item') {
    return { allowEmpty: true, allowSets: true, allowedSlots: 'all' };
  }
  const it = items.get(a.id);
  if (!it) return { allowEmpty: true, allowSets: true, allowedSlots: 'all' };
  return { allowEmpty: true, allowSets: true, allowedSlots: [it.slot] };
}

export function isBAllowed(
  a: Selection,
  b: Selection,
  items: Map<string, Item>,
): boolean {
  const rule = allowedKindsForB(a, items);
  if (b.kind === 'empty') return rule.allowEmpty;
  if (b.kind === 'set') return rule.allowSets;
  if (b.kind === 'item') {
    const it = items.get(b.id);
    if (!it) return false;
    if (rule.allowedSlots === 'all') return true;
    return rule.allowedSlots.includes(it.slot);
  }
  return false;
}