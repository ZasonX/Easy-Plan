import { OptionCard, RoutePlan } from '../types';
import { DEFAULT_OPTION_CARDS, DEFAULT_ROUTES } from '../data/defaultData';

const STORAGE_KEYS = {
  ROUTES: 'simple_card_routes_v3',
  CARDS: 'simple_card_items_v3',
  ACTIVE_ID: 'simple_card_active_route_v3',
  THEME: 'simple_card_theme_v1',
};

// Check and clear legacy mock data if needed
function cleanupLegacyMockData(): void {
  try {
    const legacyCards = localStorage.getItem('simple_card_items_v2');
    if (legacyCards && (legacyCards.includes('看塔') || legacyCards.includes('除戶'))) {
      localStorage.removeItem('simple_card_items_v2');
      localStorage.removeItem('simple_card_routes_v2');
      localStorage.removeItem('simple_card_active_route_v2');
      localStorage.removeItem('simple_card_items');
      localStorage.removeItem('simple_card_routes');
    }
  } catch {
    // ignore
  }
}

cleanupLegacyMockData();

export function loadSavedRoutes(): RoutePlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROUTES);
    if (!raw) return DEFAULT_ROUTES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ROUTES;
  } catch {
    return DEFAULT_ROUTES;
  }
}

export function saveRoutes(routes: RoutePlan[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(routes));
  } catch (err) {
    console.error('Failed to save routes', err);
  }
}

export function loadOptionCards(): OptionCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CARDS);
    if (!raw) return DEFAULT_OPTION_CARDS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_OPTION_CARDS;
  } catch {
    return DEFAULT_OPTION_CARDS;
  }
}

export function saveOptionCards(cards: OptionCard[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  } catch (err) {
    console.error('Failed to save cards', err);
  }
}

export function loadActiveRouteId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
  } catch {
    return null;
  }
}

export function saveActiveRouteId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
  } catch (err) {
    console.error('Failed to save active route id', err);
  }
}

export function resetAllStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ROUTES);
    localStorage.removeItem(STORAGE_KEYS.CARDS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
    localStorage.removeItem(STORAGE_KEYS.THEME);
  } catch (err) {
    console.error('Failed to reset storage', err);
  }
}

export type ThemeMode = 'light' | 'dark';

export function loadTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (err) {
    console.error('Failed to save theme', err);
  }
}

