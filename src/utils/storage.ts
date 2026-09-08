import { OptionCard, RoutePlan } from '../types';
import { DEFAULT_OPTION_CARDS, DEFAULT_ROUTES } from '../data/defaultData';

const STORAGE_KEYS = {
  ROUTES: 'simple_card_routes_v2',
  CARDS: 'simple_card_items_v2',
  ACTIVE_ID: 'simple_card_active_route_v2',
};

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
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_OPTION_CARDS;
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
  } catch (err) {
    console.error('Failed to reset storage', err);
  }
}
