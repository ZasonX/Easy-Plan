import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RoutePlan, OptionCard, RouteStep } from './types';
import { DEFAULT_OPTION_CARDS, DEFAULT_ROUTES } from './data/defaultData';
import {
  loadSavedRoutes,
  saveRoutes,
  loadOptionCards,
  saveOptionCards,
  loadActiveRouteId,
  saveActiveRouteId,
  loadTheme,
  saveTheme,
  ThemeMode,
} from './utils/storage';
import { CardsPanel } from './components/CardsPanel';
import { RouteCanvas } from './components/RouteCanvas';
import { Plus, Undo2, Redo2, Layers, ListOrdered, ArrowRight, Sun, Moon } from 'lucide-react';

interface HistorySnapshot {
  routes: RoutePlan[];
  cards: OptionCard[];
  activeRouteId: string;
}

export default function App() {
  const [routes, setRoutes] = useState<RoutePlan[]>(() => loadSavedRoutes());
  const [cards, setCards] = useState<OptionCard[]>(() => loadOptionCards());
  const [activeRouteId, setActiveRouteId] = useState<string>(() => {
    const savedActive = loadActiveRouteId();
    const initialRoutes = loadSavedRoutes();
    if (savedActive && initialRoutes.some((r) => r.id === savedActive)) {
      return savedActive;
    }
    return initialRoutes[0]?.id || 'r1';
  });

  // Undo / Redo history stacks
  const [undoStack, setUndoStack] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  // Mobile tab toggle: 'cards' | 'route'
  const [mobileTab, setMobileTab] = useState<'cards' | 'route'>('cards');

  // Mobile toast when a card is added to route
  const [toastMessage, setToastMessage] = useState<{ text: string; stepNumber: number } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Theme mode: 'light' | 'dark'
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Helper to record history before a mutation
  const recordHistory = useCallback(() => {
    setUndoStack((prev) => [
      ...prev.slice(-49),
      {
        routes: JSON.parse(JSON.stringify(routes)),
        cards: JSON.parse(JSON.stringify(cards)),
        activeRouteId,
      },
    ]);
    setRedoStack([]);
  }, [routes, cards, activeRouteId]);

  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const previous = prevUndo[prevUndo.length - 1];
      const newUndo = prevUndo.slice(0, -1);

      setRedoStack((prevRedo) => [
        ...prevRedo,
        {
          routes: JSON.parse(JSON.stringify(routes)),
          cards: JSON.parse(JSON.stringify(cards)),
          activeRouteId,
        },
      ]);

      setRoutes(previous.routes);
      setCards(previous.cards);
      setActiveRouteId(previous.activeRouteId);

      return newUndo;
    });
  }, [routes, cards, activeRouteId]);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const next = prevRedo[prevRedo.length - 1];
      const newRedo = prevRedo.slice(0, -1);

      setUndoStack((prevUndo) => [
        ...prevUndo,
        {
          routes: JSON.parse(JSON.stringify(routes)),
          cards: JSON.parse(JSON.stringify(cards)),
          activeRouteId,
        },
      ]);

      setRoutes(next.routes);
      setCards(next.cards);
      setActiveRouteId(next.activeRouteId);

      return newRedo;
    });
  }, [routes, cards, activeRouteId]);

  // Keyboard shortcut listener (Ctrl+Z / Cmd+Z, Ctrl+Y / Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && !e.altKey) {
        if (e.key.toLowerCase() === 'z') {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Persistence
  useEffect(() => {
    saveRoutes(routes);
  }, [routes]);

  useEffect(() => {
    saveOptionCards(cards);
  }, [cards]);

  useEffect(() => {
    saveActiveRouteId(activeRouteId);
  }, [activeRouteId]);

  // Derived state
  const cardsMap = useMemo(() => {
    const map: Record<string, OptionCard> = {};
    cards.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [cards]);

  const activeRoute = useMemo(() => {
    return routes.find((r) => r.id === activeRouteId) || routes[0] || null;
  }, [routes, activeRouteId]);

  // Route handlers
  const handleCreateNewRoute = useCallback(() => {
    recordHistory();
    const newIndex = routes.length + 1;
    const newRoute: RoutePlan = {
      id: `r-${Date.now()}`,
      title: `路線 ${newIndex}`,
      steps: [],
    };
    setRoutes((prev) => [...prev, newRoute]);
    setActiveRouteId(newRoute.id);
    setMobileTab('route');
  }, [routes.length, recordHistory]);

  const handleUpdateRouteTitle = useCallback((newTitle: string) => {
    recordHistory();
    setRoutes((prev) =>
      prev.map((r) => (r.id === activeRouteId ? { ...r, title: newTitle } : r))
    );
  }, [activeRouteId, recordHistory]);

  const handleDeleteRoute = useCallback(() => {
    if (routes.length <= 1) {
      alert('請至少保留一條路線方案');
      return;
    }
    recordHistory();
    const remaining = routes.filter((r) => r.id !== activeRouteId);
    setRoutes(remaining);
    setActiveRouteId(remaining[0].id);
  }, [routes, activeRouteId, recordHistory]);

  const handleClearSteps = useCallback(() => {
    recordHistory();
    setRoutes((prev) =>
      prev.map((r) => (r.id === activeRouteId ? { ...r, steps: [] } : r))
    );
  }, [activeRouteId, recordHistory]);

  // Steps handling inside active route
  const handleAddCardToRoute = useCallback(
    (cardId: string, atIndex?: number) => {
      if (!activeRoute) return;
      recordHistory();
      const newStep: RouteStep = {
        id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        cardId,
      };
      const updatedSteps = [...activeRoute.steps];
      const targetPos =
        typeof atIndex === 'number' && atIndex >= 0 && atIndex <= updatedSteps.length
          ? atIndex
          : updatedSteps.length;

      updatedSteps.splice(targetPos, 0, newStep);

      setRoutes((prev) =>
        prev.map((r) => (r.id === activeRoute.id ? { ...r, steps: updatedSteps } : r))
      );

      // Mobile toast notification
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastMessage({
          text: `「${card.title}」已加入`,
          stepNumber: targetPos + 1,
        });
        toastTimerRef.current = setTimeout(() => {
          setToastMessage(null);
        }, 2500);
      }
    },
    [activeRoute, recordHistory, cards]
  );

  const handleMoveStep = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!activeRoute || toIndex < 0 || toIndex >= activeRoute.steps.length) return;
      recordHistory();
      const updatedSteps = [...activeRoute.steps];
      const [moved] = updatedSteps.splice(fromIndex, 1);
      updatedSteps.splice(toIndex, 0, moved);

      setRoutes((prev) =>
        prev.map((r) => (r.id === activeRoute.id ? { ...r, steps: updatedSteps } : r))
      );
    },
    [activeRoute, recordHistory]
  );

  const handleRemoveStep = useCallback(
    (index: number) => {
      if (!activeRoute) return;
      recordHistory();
      const updatedSteps = activeRoute.steps.filter((_, i) => i !== index);
      setRoutes((prev) =>
        prev.map((r) => (r.id === activeRoute.id ? { ...r, steps: updatedSteps } : r))
      );
    },
    [activeRoute, recordHistory]
  );

  // Card items handlers
  const handleAddCard = useCallback((title: string) => {
    recordHistory();
    const newCard: OptionCard = {
      id: `c-${Date.now()}`,
      title,
    };
    setCards((prev) => [newCard, ...prev]);
  }, [recordHistory]);

  const handleEditCard = useCallback((id: string, newTitle: string) => {
    recordHistory();
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  }, [recordHistory]);

  const handleDeleteCard = useCallback((id: string) => {
    recordHistory();
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, [recordHistory]);

  const handleReorderCards = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    recordHistory();
    setCards((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, [recordHistory]);

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col font-['Noto_Sans_TC',sans-serif] text-neutral-900 dark:text-neutral-100 antialiased selection:bg-amber-100 dark:selection:bg-amber-950/60 transition-colors">
      {/* Top Simple Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 px-3.5 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-20 shadow-2xs transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
            卡片路線規劃
          </h1>

          {/* Header Controls: Undo, Redo, Dark Mode toggle */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              id="undo-button"
              type="button"
              disabled={undoStack.length === 0}
              onClick={handleUndo}
              className="px-2.5 py-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 active:bg-neutral-100 dark:active:bg-neutral-700 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 shadow-2xs min-h-[36px] sm:min-h-0"
              title="復原上一動 (Ctrl+Z 或 Cmd+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>復原</span>
            </button>
            <button
              id="redo-button"
              type="button"
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              className="px-2.5 py-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 active:bg-neutral-100 dark:active:bg-neutral-700 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 shadow-2xs min-h-[36px] sm:min-h-0"
              title="重做 (Ctrl+Y 或 Cmd+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>重做</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              id="theme-toggle-button"
              type="button"
              onClick={toggleTheme}
              className="px-2.5 py-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 active:bg-neutral-100 dark:active:bg-neutral-700 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 shadow-2xs min-h-[36px] sm:min-h-0"
              title={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
              aria-label="切換深淺色模式"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
              )}
              <span className="hidden xs:inline">
                {theme === 'dark' ? '淺色' : '深色'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-2.5 sm:p-6 pb-24 sm:pb-6 flex flex-col gap-3 sm:gap-4 min-w-0 overflow-x-hidden sm:overflow-x-visible">
        {/* Route Tabs (Touch-friendly horizontal scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-2.5 px-2.5 sm:mx-0 sm:px-0 min-w-0 w-full">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">路線方案：</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {routes.map((r) => {
              const isActive = r.id === activeRouteId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setActiveRouteId(r.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] sm:min-h-0 ${
                    isActive
                      ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/80 dark:hover:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <span>{r.title}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      isActive
                        ? 'bg-neutral-700 dark:bg-neutral-300 text-neutral-200 dark:text-neutral-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                    }`}
                  >
                    {r.steps.length}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleCreateNewRoute}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white border border-dashed border-neutral-300 dark:border-neutral-700 transition-colors flex items-center gap-1 cursor-pointer shrink-0 min-h-[36px] sm:min-h-0"
              title="新增一條新路線"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新路線</span>
            </button>
          </div>
        </div>

        {/* Two-Column Responsive Workspace */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 flex-1 min-w-0 w-full">
          {/* Column 1: Option Cards */}
          <div
            className={`w-full min-w-0 h-[calc(100dvh-185px)] min-h-[460px] sm:h-[620px] ${
              mobileTab === 'cards' ? 'block' : 'hidden sm:block'
            }`}
          >
            <CardsPanel
              cards={cards}
              onAddCard={handleAddCard}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
              onAddToRoute={(cardId) => {
                handleAddCardToRoute(cardId);
              }}
              onReorderCards={handleReorderCards}
              onRemoveStepFromRoute={handleRemoveStep}
            />
          </div>

          {/* Column 2: Route Canvas */}
          <div
            className={`w-full min-w-0 h-[calc(100dvh-185px)] min-h-[460px] sm:h-[620px] ${
              mobileTab === 'route' ? 'block' : 'hidden sm:block'
            }`}
          >
            {activeRoute ? (
              <RouteCanvas
                route={activeRoute}
                cardsMap={cardsMap}
                onUpdateTitle={handleUpdateRouteTitle}
                onMoveStep={handleMoveStep}
                onRemoveStep={handleRemoveStep}
                onClearSteps={handleClearSteps}
                onDeleteRoute={handleDeleteRoute}
                onDropCard={handleAddCardToRoute}
                totalRoutesCount={routes.length}
              />
            ) : (
              <div className="h-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-xs text-neutral-400 dark:text-neutral-500">
                尚未選取路線
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Toast Notification (Quick feedback when adding cards to route) */}
      {toastMessage && mobileTab === 'cards' && (
        <div className="sm:hidden fixed bottom-18 left-4 right-4 z-40 bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-sm text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-neutral-800 dark:border-neutral-700">
          <div className="text-xs truncate flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-neutral-950 font-bold text-[10px] flex items-center justify-center shrink-0">
              ✓
            </span>
            <span className="truncate">
              {toastMessage.text} (第 {toastMessage.stepNumber} 步)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileTab('route');
              setToastMessage(null);
            }}
            className="text-xs font-semibold text-amber-300 hover:text-amber-200 shrink-0 flex items-center gap-1 cursor-pointer pl-2"
          >
            <span>查看路線</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Thumb-reachable native feel) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200/80 dark:border-neutral-800 px-4 py-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-around gap-2">
        <button
          id="mobile-tab-cards"
          type="button"
          onClick={() => setMobileTab('cards')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-xs transition-all cursor-pointer ${
            mobileTab === 'cards'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>卡片庫</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              mobileTab === 'cards'
                ? 'bg-neutral-700 dark:bg-neutral-300 text-neutral-100 dark:text-neutral-800'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            {cards.length}
          </span>
        </button>

        <button
          id="mobile-tab-route"
          type="button"
          onClick={() => setMobileTab('route')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-xs transition-all cursor-pointer ${
            mobileTab === 'route'
              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-800'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>規劃路線</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              mobileTab === 'route'
                ? 'bg-neutral-700 dark:bg-neutral-300 text-neutral-100 dark:text-neutral-800'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            {activeRoute?.steps.length || 0}
          </span>
        </button>
      </div>
    </div>
  );
}
