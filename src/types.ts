// src/types.ts
export type Slot = 'head' | 'chest' | 'weapon' | 'legs' | 'ring' | 'amulet';

export const SLOTS: Slot[] = ['head', 'chest', 'weapon', 'legs', 'ring', 'amulet'];

export const SLOT_LABEL: Record<Slot, string> = {
  head: 'Голова',
  chest: 'Грудь',
  weapon: 'Оружие',
  legs: 'Ноги',
  ring: 'Кольцо',
  amulet: 'Амулет',
};

export type ClassId =
  | 'warrior'
  | 'rogue'
  | 'fire_mage'
  | 'water_mage'
  | 'air_mage'
  | 'earth_mage';

export const CLASS_LABEL: Record<ClassId, string> = {
  warrior: 'Воин',
  rogue: 'Ловкач',
  fire_mage: 'Маг огня',
  water_mage: 'Маг воды',
  air_mage: 'Маг воздуха',
  earth_mage: 'Маг земли',
};

export type Stats = {
  strength: number;
  agility: number;
  intellect: number;
  physAtk: number;
  physDef: number;
  magAtk: number;
  magDef: number;
  health: number;
  mana: number;
  durability: number;
};

export const STAT_LABEL: Record<keyof Stats, string> = {
  strength: 'Сила',
  agility: 'Ловкость',
  intellect: 'Интеллект',
  physAtk: 'Физ. атака',
  physDef: 'Физ. защита',
  magAtk: 'Маг. атака',
  magDef: 'Маг. защита',
  health: 'Здоровье',
  mana: 'Мана',
  durability: 'Прочность',
};

export type Ingredient = { materialId: string; qty: number };

export type Item = {
  id: string;
  itemId: number;
  name: string;
  slot: Slot;
  classes: ClassId[];
  level: number;
  setId: string | null;
  rarity: string;
  stats: Stats;
  marketPriceTWR: number;
  ingredients: Ingredient[];
};


export type Tool = {
  id: string;
  itemId: number;
  name: string;
  toolType: string;
  rarity: string;
  level: number;
  stats: Stats;
  marketPriceTWR: number;
  ingredients: Ingredient[];
};

export type SetDef = {
  id: string;
  recipeKey: string;
  name: string;
  level: number;
  studyCostTWR: number;
  classes: ClassId[];
  itemIds: string[];
  isStudied: boolean;
};

export type Recipe = {
  id: string;
  recipeKey: string;
  name: string;
  recipeType: string;
  category: string;
  level: number;
  studyCostTWR: number;
  blacksmithXP: number;
  outputItemIds: string[];
  isStudied: boolean;
};

export type Selection =
  | { kind: 'empty' }
  | { kind: 'item'; id: string }
  | { kind: 'set'; id: string };

export type MaterialCraftRecipe = {
  recipeId: string;
  studyCostTWR: number;
  blacksmithXP: number;
  ingredients: Ingredient[];
  isStudied: boolean;
};

export type Material = {
  id: string;
  itemId: number;
  name: string;
  type: string;
  category: string;
  marketPriceTWR: number;
  source: 'craft' | 'gather';
  craftRecipe: MaterialCraftRecipe | null;
  usedIn: string[];  // item.id | tool.id
};

