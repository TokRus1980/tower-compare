// src/components/Badges.tsx
import { CLASS_LABEL, ClassId } from '../types';
import { Resolved } from '../lib/compare';

type Badge = { kind: 'class' | 'level' | 'incomplete'; text: string };

export function badgesFor(res: Resolved, setsMap: Map<string, { level: number; classes: ClassId[] }>): Badge[] {
  const out: Badge[] = [];
  if (res.kind === 'set') {
    const s = setsMap.get(res.setId);
    if (s) {
      if (res.items.length < 6) {
        out.push({ kind: 'incomplete', text: '⚠️ неполный' });
      }
      if (s.classes.length === 1) {
        // не бейдж, класс показываем отдельно
      }
    }
  }
  return out;
}

export function compareWarnings(
  a: Resolved,
  b: Resolved,
  setsMap: Map<string, { level: number; classes: ClassId[] }>,
): Badge[] {
  const out: Badge[] = [];
  const aSet = a.kind === 'set' ? setsMap.get(a.setId) : null;
  const bSet = b.kind === 'set' ? setsMap.get(b.setId) : null;
  if (aSet && bSet) {
    if (aSet.level !== bSet.level) {
      out.push({
        kind: 'level',
        text: `Разные уровни: ${aSet.level} vs ${bSet.level}`,
      });
    }
    const aClasses = aSet.classes.join(',');
    const bClasses = bSet.classes.join(',');
    if (aClasses && bClasses && aClasses !== bClasses) {
      out.push({
        kind: 'class',
        text: `Разные классы: ${aSet.classes.map((c) => CLASS_LABEL[c]).join('/')} vs ${bSet.classes.map((c) => CLASS_LABEL[c]).join('/')}`,
      });
    }
  }
  return out;
}
