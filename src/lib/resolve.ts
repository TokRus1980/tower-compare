// src/lib/resolve.ts
import { Item, Material, Tool } from '../types';

export type Resolvable = Item | Material | Tool;

export function makeResolver(
  items: Map<string, Item>,
  tools: Map<string, Tool>,
  materials: Map<string, Material>,
) {
  const nameOf = (id: string): string => {
    const it = items.get(id);
    if (it) return it.name;
    const tool = tools.get(id);
    if (tool) return tool.name;
    const mat = materials.get(id);
    if (mat) return mat.name;
    return id;
  };

  const objOf = (id: string): Resolvable | undefined =>
    items.get(id) ?? tools.get(id) ?? materials.get(id);

  const marketPriceOf = (id: string): number =>
    objOf(id)?.marketPriceTWR ?? 0;

  return { nameOf, objOf, marketPriceOf };
}

export type Resolver = ReturnType<typeof makeResolver>;