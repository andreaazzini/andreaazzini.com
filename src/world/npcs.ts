export type NpcArea = 'padua' | 'milan' | 'london';

export type NpcDefinition = {
  id: string;
  area: NpcArea;
  dialogue: string[];
  name: string;
  spriteFolder: string;
};

import { CHARACTER_CATALOG, PLAYER_CHARACTER_ID } from './characterCatalog';

function areaFromId(id: string): NpcArea | null {
  if (id.startsWith('padua_')) return 'padua';
  if (id.startsWith('milan_')) return 'milan';
  if (id.startsWith('london_')) return 'london';
  return null;
}

export const NPCS: NpcDefinition[] = CHARACTER_CATALOG.filter((c) => c.id !== PLAYER_CHARACTER_ID)
  .map((c): NpcDefinition | null => {
    const area = areaFromId(c.id);
    if (!area) return null;
    return {
      id: c.id,
      area,
      dialogue: c.message,
      name: c.name,
      spriteFolder: c.spriteFolder,
    };
  })
  .filter((n): n is NpcDefinition => Boolean(n));

export const NPC_BY_ID: Record<string, NpcDefinition> = Object.fromEntries(
  NPCS.map((n) => [n.id, n]),
);


