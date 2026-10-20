// src/pages/MaterialsPage.tsx
import { useMemo, useState } from 'react';
import itemsRaw from '../../data/items.json';
import toolsRaw from '../../data/tools.json';
import materialsRaw from '../../data/materials.json';
import {
  Item,
  Material,
  Tool,
  CLASS_LABEL,
  SLOT_LABEL,
} from '../types';
import Combobox, { ComboOption } from '../components/Combobox';
import ItemIcon from '../components/ItemIcon';

const items = itemsRaw as Item[];
const tools = toolsRaw as Tool[];
const materials = materialsRaw as Material[];

const itemMap = new Map(items.map((i) => [i.id, i]));
const toolMap = new Map(tools.map((t) => [t.id, t]));
const matMap = new Map(materials.map((m) => [m.id, m]));

const MATERIAL_CATEGORY_LABEL: Record<string, string> = {
  material: 'Материал',
  gem: 'Камни',
  mineral: 'Ископаемые',
  forest: 'Лес',
  drop: 'Дроп с мобов',
  food: 'Еда',
  scroll: 'Магия',
  other: 'Прочее',
};

function materialOptions(): ComboOption[] {
  return [...materials]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => ({
      value: `mat:${m.id}`,
      label: m.name,
      hint: MATERIAL_CATEGORY_LABEL[m.category] ?? m.category,
      group: MATERIAL_CATEGORY_LABEL[m.category] ?? 'Прочее',
      iconName: m.name,
    }));
}

type CraftNode = {
  materialId: string;
  qty: number;
  craftRecipe: Material['craftRecipe'];
};

function expandCraft(materialId: string, qty: number, depth = 0): CraftNode[] {
  const mat = matMap.get(materialId);
  if (!mat || depth > 4) {
    return [{ materialId, qty, craftRecipe: mat?.craftRecipe ?? null }];
  }
  if (!mat.craftRecipe) {
    return [{ materialId, qty, craftRecipe: null }];
  }
  return [
    { materialId, qty, craftRecipe: mat.craftRecipe },
    ...mat.craftRecipe.ingredients.flatMap((ing) =>
      expandCraft(ing.materialId, ing.qty * qty, depth + 1),
    ),
  ];
}

export default function MaterialsPage() {
  const [selectedId, setSelectedId] = useState<string>(
    materials[0] ? `mat:${materials[0].id}` : 'mat:',
  );

  const selected = useMemo(() => {
    const id = selectedId.replace('mat:', '');
    return matMap.get(id) ?? null;
  }, [selectedId]);

  const usedInItems = useMemo(() => {
    if (!selected) return [];
    const ids = selected.usedIn ?? [];
    return ids
      .map((id) => itemMap.get(id) ?? toolMap.get(id))
      .filter(Boolean) as (Item | Tool)[];
  }, [selected]);

  const craftTree = useMemo(() => {
    if (!selected || !selected.craftRecipe) return [];
    return expandCraft(selected.id, 1);
  }, [selected]);

  return (
    <div className="compare-page">
      <h1>Ресурсы и материалы</h1>

      <div className="selectors">
        <Combobox
          label="Материал"
          value={selectedId}
          options={materialOptions()}
          onChange={setSelectedId}
        />
      </div>

      {!selected && <div className="muted">Материал не выбран</div>}

      {selected && (
        <>
          <section>
            <h2>
              <span className="cell-with-icon">
                <ItemIcon name={selected.name} size={28} />
                {selected.name}
              </span>
            </h2>
            <div className="material-meta">
              <span className="badge">
                {MATERIAL_CATEGORY_LABEL[selected.category] ?? selected.category}
              </span>
              <span
                className={
                  'badge ' +
                  (selected.source === 'craft' ? 'badge-green' : 'badge-blue')
                }
              >
                {selected.source === 'craft' ? '⚒ Крафт' : '🌿 Добыча'}
              </span>
              <span className="badge badge-yellow">
                Рынок: {selected.marketPriceTWR} TWR
              </span>
            </div>
          </section>

          <section>
            <h2>Что нужно для крафта</h2>
            {!selected.craftRecipe ? (
              <div className="muted">Только добыча — рецепта крафта нет</div>
            ) : (
              <>
                <div className="craft-meta muted small">
                  Изучение: {selected.craftRecipe.studyCostTWR} TWR
                  {' · '}
                  Опыт: {selected.craftRecipe.blacksmithXP} XP
                  {' · '}
                  {selected.craftRecipe.isStudied ? '✅ изучен' : '🔒 не изучен'}
                </div>
                <table className="resources">
                  <thead>
                    <tr>
                      <th>Материал</th>
                      <th>Количество</th>
                      <th>Рынок (min)</th>
                      <th>Крафтится?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.craftRecipe.ingredients.map((ing) => {
                      const m = matMap.get(ing.materialId);
                      return (
                        <tr key={ing.materialId}>
                          <td>
                            <span className="cell-with-icon">
                              <ItemIcon name={m?.name ?? ing.materialId} size={16} />
                              {m?.name ?? ing.materialId}
                            </span>
                          </td>
                          <td>{ing.qty}</td>
                          <td>{m?.marketPriceTWR ?? '—'}</td>
                          <td>
                            {m?.craftRecipe ? (
                              <span className="badge badge-green">⚒ да</span>
                            ) : (
                              <span className="muted">🌿 нет</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </section>

          <section>
            <h2>Где используется</h2>
            {usedInItems.length === 0 ? (
              <div className="muted">Нигде не используется</div>
            ) : (
              <table className="resources">
                <thead>
                  <tr>
                    <th>Тип</th>
                    <th>Название</th>
                    <th>Класс</th>
                    <th>Количество</th>
                    <th>Уровень</th>
                  </tr>
                </thead>
                <tbody>
                  {usedInItems.map((u) => {
                    const isTool = 'toolType' in u;
                    const qty =
                      u.ingredients.find((i) => i.materialId === selected.id)
                        ?.qty ?? 0;

                    const classLabels: string[] = !isTool
                      ? (u as Item).classes.map((c) => CLASS_LABEL[c])
                      : [];
                    const classText = isTool
                      ? '—'
                      : classLabels.length === 0
                      ? 'Все классы'
                      : classLabels.join(' / ');
                    const classCls =
                      isTool || classLabels.length === 0 ? 'muted' : '';

                    return (
                      <tr key={u.id}>
                        <td>
                          {isTool ? (
                            <span className="badge badge-blue">Инструмент</span>
                          ) : (
                            <span className="badge">
                              {SLOT_LABEL[(u as Item).slot]}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="cell-with-icon">
                            <ItemIcon name={u.name} size={16} />
                            {u.name}
                          </span>
                        </td>
                        <td className={classCls}>{classText}</td>
                        <td>{qty}</td>
                        <td>{u.level}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {craftTree.length > 1 && (
            <section>
              <h2>Полное дерево крафта (рекурсивно)</h2>
              <div className="craft-tree">
                {craftTree.map((node, i) => {
                  const m = matMap.get(node.materialId);
                  const depth = i === 0 ? 0 : 1;
                  return (
                    <div
                      key={node.materialId + i}
                      className="craft-node"
                      style={{ paddingLeft: depth * 20 }}
                    >
                      <span className="cell-with-icon">
                        <ItemIcon name={m?.name ?? node.materialId} size={14} />
                        {m?.name ?? node.materialId} × {node.qty}
                        {node.craftRecipe && (
                          <span
                            className="badge badge-green"
                            style={{ marginLeft: 6 }}
                          >
                            ⚒
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      <footer className="muted small">
        «Добыча» — материал нельзя скрафтить, только добыть или купить.
        «Крафт» — есть рецепт.
      </footer>
    </div>
  );
}