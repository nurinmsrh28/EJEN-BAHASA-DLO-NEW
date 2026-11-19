import { createInitialGameState } from './rules';
import type { GameState } from './types';

export const STORAGE_KEY = 'ejen_bahasa_operasi_v1';

export function getUserStorageKey(username?: string | null): string {
  const clean = (username || '').trim().toLowerCase();
  return clean ? `${STORAGE_KEY}:${clean}` : STORAGE_KEY;
}

export function normalizeClientGameState(parsed?: Partial<GameState> | null): GameState {
  const base = createInitialGameState();
  if (!parsed) return base;
  return {
    ...base,
    ...parsed,
    investigations: {
      ...base.investigations,
      ...(parsed.investigations || {}),
    },
    opinions: {
      ...base.opinions,
      ...(parsed.opinions || {}),
    },
    selectedEvidenceIds: Array.isArray(parsed.selectedEvidenceIds)
      ? parsed.selectedEvidenceIds
      : [],
    awardedMilestones: Array.isArray(parsed.awardedMilestones)
      ? parsed.awardedMilestones
      : [],
    logicChallengeAnswers: parsed.logicChallengeAnswers || {},
    builderPlan:
      Array.isArray(parsed.builderPlan) && parsed.builderPlan.length > 0
        ? parsed.builderPlan
        : base.builderPlan,
  };
}

export function loadDraftForUser(username?: string | null): GameState {
  try {
    const raw = window.localStorage.getItem(getUserStorageKey(username));
    if (!raw) return createInitialGameState();
    return normalizeClientGameState(JSON.parse(raw) as Partial<GameState>);
  } catch {
    return createInitialGameState();
  }
}

export function saveDraftForUser(username: string | null | undefined, state: GameState): void {
  try {
    window.localStorage.setItem(
      getUserStorageKey(username),
      JSON.stringify({
        ...state,
        lastUpdated: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore quota errors gracefully
  }
}

export function clearDraftForUser(username?: string | null): GameState {
  try {
    window.localStorage.removeItem(getUserStorageKey(username));
  } catch {
    // Ignore storage access errors
  }
  return createInitialGameState();
}

/**
 * Adapter pattern so localStorage can be swapped or synced with backend
 * without changing UI components.
 */
export interface StorageAdapter {
  load(): GameState;
  save(state: GameState): void;
  clear(): GameState;
}

export const localStorageAdapter: StorageAdapter = {
  load(): GameState {
    return loadDraftForUser(null);
  },

  save(state: GameState): void {
    saveDraftForUser(null, state);
  },

  clear(): GameState {
    return clearDraftForUser(null);
  },
};

export function exportAgentRecordJson(state: GameState): void {
  const safeName = (state.profile?.name || 'ejen')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const payload = {
    aplikasi: 'Ejen Bahasa: Operasi Sekolah Impian',
    eksportPada: new Date().toISOString(),
    notaPenyimpanan: 'Rekod ini dieksport daripada penyimpanan setempat pelayar (localStorage).',
    dataEjen: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rekod_${safeName || 'ejen'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
