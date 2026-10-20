// scripts/transform.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'data/source/тест.json');
const OUT = join(ROOT, 'data');

const raw = JSON.parse(readFileSync(SRC, 'utf8'));

// ---------- маппинги ----------
const SLOT_BY_TYPE = {
  Helmet: 'head',
  Breastplate: 'chest',
  Weapon: 'weapon',
  Greaves: 'legs',
  Ring: 'ring',
  Amulet: 'amulet',
};

const TOOL_BY_TYPE = {
  Axe: 'axe',
  Pick: 'pick',
  Shovel: 'shovel',
  Search: 'search',
  FishRod: 'fishrod',
};

const CLASS_BY_SPEC = {
  Fighter: 'warrior',
  Dodge: 'rogue',
  FireMage: 'fire_mage',
  WaterMage: 'water_mage',
  AirMage: 'air_mage',
  EarthMage: 'earth_mage',
};

const parseClasses = (spec) => {
  if (!spec) return [];
  if (CLASS_BY_SPEC[spec]) return [CLASS_BY_SPEC[spec]];
  return spec.split(',').map((s) => CLASS_BY_SPEC[s.trim()]).filter(Boolean);
};

const slug = (s) =>
  String(s).toLowerCase().trim()
    .replace(/[^a-zа-яё0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');

const statsOf = (it) => ({
  strength: it.Strength ?? 0,
  agility: it.Agility ?? 0,
  intellect: it.Intelligence ?? 0,
  physAtk: it.PhysicalAttack ?? 0,
  physDef: it.PhysicalDefence ?? 0,
  magAtk: it.MagicalAttack ?? 0,
  magDef: it.MagicalDefence ?? 0,
  health: it.Health ?? 0,
  mana: it.Mana ?? 0,
  durability: it.Durability ?? 0,
});

// ---------- сбор ----------
const items = new Map();
const materials = new Map();
const tools = new Map();
const sets = [];
const recipes = [];

const MATERIAL_TYPES = new Set([
  'Material', 'Gemstone', 'Mineral', 'ForestResource', 'MobDrop', 'Food', 'Scroll',
]);

function materialCategory(type) {
  switch (type) {
    case 'Material': return 'material';
    case 'Gemstone': return 'gem';
    case 'Mineral': return 'mineral';
    case 'ForestResource': return 'forest';
    case 'MobDrop': return 'drop';
    case 'Food': return 'food';
    case 'Scroll': return 'scroll';
    default: return 'other';
  }
}

function ingestItem(it) {
  if (!it) return null;
  const slot = SLOT_BY_TYPE[it.Type];
  const toolType = TOOL_BY_TYPE[it.Type];
  const isMaterial = MATERIAL_TYPES.has(it.Type);

  if (isMaterial && !slot) {
    if (!materials.has(it.ItemID)) {
      materials.set(it.ItemID, {
        id: `mat_${it.ItemID}`,
        itemId: it.ItemID,
        name: it.Name,
        type: it.Type,
        category: materialCategory(it.Type),
        marketPriceTWR: it.MinMarketPriceTWR ?? 0,
      });
    }
    return { kind: 'material', id: `mat_${it.ItemID}` };
  }

  if (toolType) {
    const id = `tool_${it.ItemID}`;
    if (!tools.has(id)) {
      tools.set(id, {
        id,
        itemId: it.ItemID,
        name: it.Name,
        toolType,
        rarity: (it.Rarity || '').toLowerCase(),
        level: it.RequiredLevel ?? 1,
        stats: statsOf(it),
        marketPriceTWR: it.MinMarketPriceTWR ?? 0,
        ingredients: [],
      });
    }
    return { kind: 'tool', id };
  }

  if (!slot) {
    console.warn('Unknown item type:', it.Type, it.Name);
    return null;
  }

  const id = `item_${it.ItemID}`;
  if (!items.has(id)) {
    items.set(id, {
      id,
      itemId: it.ItemID,
      name: it.Name,
      slot,
      classes: parseClasses(it.Specification),
      level: it.RequiredLevel ?? 1,
      setId: null,
      rarity: (it.Rarity || '').toLowerCase(),
      stats: statsOf(it),
      marketPriceTWR: it.MinMarketPriceTWR ?? 0,
      ingredients: [],
    });
  }
  return { kind: 'item', id };
}

// ---------- проход по рецептам ----------
for (const r of raw.Recipes) {
  const outputs = r.Outputs ?? [];
  const isSet = r.RecipeType === 'Set';
  const setId = isSet ? `set_${slug(r.RecipeKey)}` : null;

  const itemIds = [];

  for (const out of outputs) {
    const ref = ingestItem(out.Item);
    if (!ref) continue;

    if (ref.kind === 'item') {
      const item = items.get(ref.id);
      if (setId) item.setId = setId;
      itemIds.push(ref.id);

      item.ingredients = (out.Ingredients ?? []).map((ing) => {
        const m = ing.Item;
        if (m) ingestItem(m);
        return { materialId: `mat_${ing.MaterialItemID}`, qty: ing.Count };
      });
    } else if (ref.kind === 'tool') {
      const tool = tools.get(ref.id);
      tool.ingredients = (out.Ingredients ?? []).map((ing) => {
        const m = ing.Item;
        if (m) ingestItem(m);
        return { materialId: `mat_${ing.MaterialItemID}`, qty: ing.Count };
      });
      itemIds.push(ref.id);
    }
  }

  if (isSet) {
    const firstSpec = outputs[0]?.Item?.Specification;
    sets.push({
      id: setId,
      recipeKey: r.RecipeKey,
      name: r.DisplayName,
      level: r.RequiredLevel,
      studyCostTWR: r.Price ?? 0,
      classes: parseClasses(firstSpec),
      itemIds,
      isStudied: !!r.IsStudied,
    });
  } else {
    recipes.push({
      id: `recipe_${r.ID}`,
      recipeKey: r.RecipeKey,
      name: r.DisplayName,
      recipeType: r.RecipeType,
      category: r.Category,
      level: r.RequiredLevel,
      studyCostTWR: r.Price ?? 0,
      blacksmithXP: r.BlacksmithXP ?? 0,
      outputItemIds: itemIds,
      isStudied: !!r.IsStudied,
    });
  }
}

// ---------- обогащение материалов (ДО записи!) ----------
const materialRecipes = new Map();

for (const r of raw.Recipes) {
  if (r.RecipeType !== 'Single' || r.Category !== 'material') continue;
  const out = r.Outputs?.[0];
  if (!out?.Item) continue;
  const materialItemId = out.Item.ItemID;
  const ingredients = (out.Ingredients ?? []).map((ing) => {
    const m = ing.Item;
    if (m) ingestItem(m);
    return { materialId: `mat_${ing.MaterialItemID}`, qty: ing.Count };
  });
  materialRecipes.set(materialItemId, {
    recipeId: `recipe_${r.ID}`,
    studyCostTWR: r.Price ?? 0,
    blacksmithXP: r.BlacksmithXP ?? 0,
    ingredients,
    isStudied: !!r.IsStudied,
  });
}

const usageOf = new Map();
for (const item of items.values()) {
  for (const ing of item.ingredients) {
    const key = Number(ing.materialId.replace('mat_', ''));
    if (!usageOf.has(key)) usageOf.set(key, new Set());
    usageOf.get(key).add(item.id);
  }
}
for (const tool of tools.values()) {
  for (const ing of tool.ingredients) {
    const key = Number(ing.materialId.replace('mat_', ''));
    if (!usageOf.has(key)) usageOf.set(key, new Set());
    usageOf.get(key).add(tool.id);
  }
}

for (const [itemId, mat] of materials) {
  const recipe = materialRecipes.get(itemId);
  mat.source = recipe ? 'craft' : 'gather';
  mat.craftRecipe = recipe ?? null;
  mat.usedIn = [...(usageOf.get(itemId) ?? [])];
}
// ---------- конец обогащения ----------

// ---------- запись ----------
mkdirSync(OUT, { recursive: true });
const write = (name, data) =>
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2), 'utf8');

write('items.json', [...items.values()]);
write('materials.json', [...materials.values()]);
write('tools.json', [...tools.values()]);
write('sets.json', sets);
write('recipes.json', recipes);

console.log(
  `items: ${items.size}, materials: ${materials.size}, ` +
    `tools: ${tools.size}, sets: ${sets.length}, recipes: ${recipes.length}`,
);