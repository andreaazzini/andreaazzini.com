import { CHARACTER_CATALOG } from './world/characterCatalog';

type Facing = 'down' | 'up' | 'left' | 'right';
type Phase = 'walk1' | 'still' | 'walk2';

type CharacterCatalogEntry = {
  id: string;
  name: string;
  message: string[];
  spriteFolder: string;
};

const SPRITE_BASE = 'assets/sprites/characters/characters2_3x12';
const STORAGE_KEY = 'catalog_overrides_v1';

const AVAILABLE_FOLDERS: string[] = Array.from({ length: 19 }, (_, i) => String(i + 1).padStart(2, '0'));

const ROWS: Array<{
  facing: Facing;
  label: string;
  files: Record<Phase, string>;
}> = [
  {
    facing: 'down',
    label: 'Down',
    files: { walk1: 'walk_down_01.png', still: 'face_down.png', walk2: 'walk_down_02.png' },
  },
  {
    facing: 'up',
    label: 'Up',
    files: { walk1: 'walk_up_01.png', still: 'face_up.png', walk2: 'walk_up_02.png' },
  },
  {
    facing: 'left',
    label: 'Left',
    files: { walk1: 'walk_left_01.png', still: 'face_left.png', walk2: 'walk_left_02.png' },
  },
  {
    facing: 'right',
    label: 'Right',
    files: { walk1: 'walk_right_01.png', still: 'face_right.png', walk2: 'walk_right_02.png' },
  },
];

const PHASES: Array<{ phase: Phase; label: string }> = [
  { phase: 'walk1', label: 'Walk 1' },
  { phase: 'still', label: 'Still' },
  { phase: 'walk2', label: 'Walk 2' },
];

function baseUrl(): string {
  // Vite guarantees BASE_URL ends with a trailing slash.
  return import.meta.env.BASE_URL ?? '/';
}

function spriteUrl(spriteFolder: string, fileName: string): string {
  return `${baseUrl()}${SPRITE_BASE}/${spriteFolder}/${fileName}`;
}

export function mountCatalogPage(root: HTMLElement): void {
  document.body.classList.add('catalog');
  root.removeAttribute('aria-hidden');
  root.innerHTML = '';

  const baseCatalog: CharacterCatalogEntry[] = CHARACTER_CATALOG.map((c) => ({
    id: c.id,
    name: c.name,
    message: [...c.message],
    spriteFolder: c.spriteFolder,
  }));
  let catalog = loadCatalogOverrides(baseCatalog) ?? baseCatalog;

  const page = document.createElement('div');
  page.className = 'catalog-page';

  const header = document.createElement('header');
  header.className = 'catalog-header';

  const title = document.createElement('h1');
  title.textContent = 'Character Catalog';
  header.appendChild(title);

  const subtitle = document.createElement('div');
  subtitle.className = 'catalog-subtitle';
  subtitle.innerHTML =
    `Edits are saved in your browser (<code>localStorage</code>). ` +
    `Source of truth is <code>src/world/characterCatalog.ts</code>.`;
  header.appendChild(subtitle);

  const actions = document.createElement('div');
  actions.className = 'catalog-actions';

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'catalog-btn';
  exportBtn.textContent = 'Export JSON';
  exportBtn.addEventListener('click', async () => {
    const json = JSON.stringify(catalog, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      exportBtn.textContent = 'Copied';
      window.setTimeout(() => (exportBtn.textContent = 'Export JSON'), 900);
    } catch {
      window.prompt('Copy JSON:', json);
    }
  });
  actions.appendChild(exportBtn);

  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.className = 'catalog-btn';
  importBtn.textContent = 'Import JSON';
  importBtn.addEventListener('click', () => {
    const raw = window.prompt('Paste exported JSON:');
    if (!raw) return;
    const parsed = parseCatalogJson(raw);
    if (!parsed) {
      window.alert('Invalid JSON format.');
      return;
    }
    catalog = parsed;
    saveCatalogOverrides(catalog);
    renderList();
  });
  actions.appendChild(importBtn);

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'catalog-btn catalog-btn-secondary';
  resetBtn.textContent = 'Reset';
  resetBtn.addEventListener('click', () => {
    if (!window.confirm('Reset catalog edits (clears local overrides)?')) return;
    clearCatalogOverrides();
    catalog = baseCatalog;
    renderList();
  });
  actions.appendChild(resetBtn);

  const back = document.createElement('a');
  back.href = baseUrl();
  back.textContent = 'Back to game';
  actions.appendChild(back);
  header.appendChild(actions);

  page.appendChild(header);

  const list = document.createElement('div');
  list.className = 'catalog-list';
  page.appendChild(list);

  root.appendChild(page);

  const renderList = (): void => {
    list.innerHTML = '';
    for (const c of catalog) list.appendChild(renderCard(c));
  };

  const renderCard = (c: CharacterCatalogEntry): HTMLElement => {
    const card = document.createElement('article');
    card.className = 'catalog-card';

    const meta = document.createElement('div');
    meta.className = 'catalog-meta';

    const nameRow = document.createElement('div');
    nameRow.className = 'catalog-edit-row';

    const nameLabel = document.createElement('label');
    nameLabel.className = 'catalog-label';
    nameLabel.textContent = 'Name';
    nameRow.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.className = 'catalog-input';
    nameInput.value = c.name;
    nameInput.addEventListener('input', () => {
      c.name = nameInput.value;
      saveCatalogOverrides(catalog);
      // update sprite alt labels
      updateSpriteAlts();
    });
    nameRow.appendChild(nameInput);
    meta.appendChild(nameRow);

    const idRow = document.createElement('div');
    idRow.className = 'catalog-id';
    idRow.innerHTML = `<code>${escapeHtml(c.id)}</code>`;
    meta.appendChild(idRow);

    const folderRow = document.createElement('div');
    folderRow.className = 'catalog-edit-row';

    const folderLabel = document.createElement('label');
    folderLabel.className = 'catalog-label';
    folderLabel.textContent = 'Sprite folder';
    folderRow.appendChild(folderLabel);

    const folderSelect = document.createElement('select');
    folderSelect.className = 'catalog-select';
    for (const f of AVAILABLE_FOLDERS) {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      folderSelect.appendChild(opt);
    }
    folderSelect.value = c.spriteFolder;
    folderSelect.addEventListener('change', () => {
      c.spriteFolder = folderSelect.value;
      saveCatalogOverrides(catalog);
      updateSpriteImages();
    });
    folderRow.appendChild(folderSelect);
    meta.appendChild(folderRow);

    card.appendChild(meta);

    const msgRow = document.createElement('div');
    msgRow.className = 'catalog-message-edit';

    const msgLabel = document.createElement('label');
    msgLabel.className = 'catalog-label';
    msgLabel.textContent = 'Message (one line per bubble)';
    msgRow.appendChild(msgLabel);

    const msgArea = document.createElement('textarea');
    msgArea.className = 'catalog-textarea';
    msgArea.rows = Math.max(2, Math.min(6, c.message.length || 2));
    msgArea.value = c.message.join('\n');
    msgArea.addEventListener('input', () => {
      c.message = msgArea.value
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      saveCatalogOverrides(catalog);
    });
    msgRow.appendChild(msgArea);
    card.appendChild(msgRow);

    const spriteGrid = document.createElement('div');
    spriteGrid.className = 'catalog-sprite-grid';

    // Grid header row
    spriteGrid.appendChild(makeCornerCell());
    for (const p of PHASES) spriteGrid.appendChild(makeHeaderCell(p.label));

    const imgs: HTMLImageElement[] = [];
    for (const r of ROWS) {
      spriteGrid.appendChild(makeRowHeaderCell(r.label));
      for (const p of PHASES) {
        const cell = document.createElement('div');
        cell.className = 'catalog-sprite-cell';
        const img = document.createElement('img');
        img.className = 'catalog-sprite';
        img.loading = 'lazy';
        img.alt = `${c.name} ${r.facing} ${p.phase}`;
        img.width = 16;
        img.height = 24;
        img.src = spriteUrl(c.spriteFolder, r.files[p.phase]);
        imgs.push(img);
        cell.appendChild(img);
        spriteGrid.appendChild(cell);
      }
    }

    const updateSpriteImages = () => {
      let idx = 0;
      for (const r of ROWS) {
        for (const p of PHASES) {
          const img = imgs[idx++];
          if (!img) continue;
          img.src = spriteUrl(c.spriteFolder, r.files[p.phase]);
        }
      }
    };

    const updateSpriteAlts = () => {
      let idx = 0;
      for (const r of ROWS) {
        for (const p of PHASES) {
          const img = imgs[idx++];
          if (!img) continue;
          img.alt = `${c.name} ${r.facing} ${p.phase}`;
        }
      }
    };

    card.appendChild(spriteGrid);
    return card;
  };

  renderList();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return c;
    }
  });
}

function makeCornerCell(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'catalog-grid-corner';
  return el;
}

function makeHeaderCell(text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'catalog-grid-header';
  el.textContent = text;
  return el;
}

function makeRowHeaderCell(text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'catalog-grid-row-header';
  el.textContent = text;
  return el;
}

function parseCatalogJson(raw: string): CharacterCatalogEntry[] | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return null;
    const out: CharacterCatalogEntry[] = [];
    for (const item of v) {
      if (!item || typeof item !== 'object') return null;
      const obj = item as Record<string, unknown>;
      const id = obj.id;
      const name = obj.name;
      const spriteFolder = obj.spriteFolder;
      const message = obj.message;
      if (typeof id !== 'string' || typeof name !== 'string' || typeof spriteFolder !== 'string') return null;
      if (!Array.isArray(message) || !message.every((m) => typeof m === 'string')) return null;
      out.push({ id, name, spriteFolder, message: message as string[] });
    }
    return out;
  } catch {
    return null;
  }
}

function loadCatalogOverrides(baseCatalog: CharacterCatalogEntry[]): CharacterCatalogEntry[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseCatalogJson(raw);
    if (!parsed) return null;

    // If IDs don't match the base catalog, ignore overrides (safety against stale storage).
    const baseIds = new Set(baseCatalog.map((c) => c.id));
    const parsedIds = new Set(parsed.map((c) => c.id));
    if (baseIds.size !== parsedIds.size) return null;
    for (const id of baseIds) if (!parsedIds.has(id)) return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveCatalogOverrides(catalog: CharacterCatalogEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    // ignore
  }
}

function clearCatalogOverrides(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}


