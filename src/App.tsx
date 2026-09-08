import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RoutePlan, OptionCard, RouteStep } from './types';
import { DEFAULT_OPTION_CARDS, DEFAULT_ROUTES } from './data/defaultData';
import {
  loadSavedRoutes,
  saveRoutes,
  loadOptionCards,
  saveOptionCards,
  loadActiveRouteId,
  saveActiveRouteId,
} from './utils/storage';
import { CardsPanel } from './components/CardsPanel';
import { RouteCanvas } from './components/RouteCanvas';
import { Plus, Undo2, Redo2 } from 'lucide-react';

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
    if (activeRouteId) {
      saveActiveRouteId(activeRouteId);
    }
  }, [activeRouteId]);

  // Card lookup map
  const cardsMap = useMemo(() => {
    const map: Record<string, OptionCard> = {};
    cards.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [cards]);

  // Current active route
  const activeRoute = useMemo(() => {
    return routes.find((r) => r.id === activeRouteId) || routes[0] || null;
  }, [routes, activeRouteId]);

  // Route handlers
  const handleCreateNewRoute = useCallback(() => {
    recordHistory();
    const newIndex = routes.length + 1;
    const newRoute: RoutePlan = {
      id: `r-${Date.now()}`,
      title: `新路線 ${newIndex}`,
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
      alert('請至少保留一條路線！');
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
      if (typeof atIndex === 'number' && atIndex >= 0 && atIndex <= updatedSteps.length) {
        updatedSteps.splice(atIndex, 0, newStep);
      } else {
        updatedSteps.push(newStep);
      }

      setRoutes((prev) =>
        prev.map((r) => (r.id === activeRoute.id ? { ...r, steps: updatedSteps } : r))
      );
    },
    [activeRoute, recordHistory]
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
    <div className="min-h-screen bg-neutral-100 flex flex-col font-['Noto_Sans_TC',sans-serif] text-neutral-900 antialiased selection:bg-amber-100">
      {/* Top Simple Header */}
      <header className="bg-white border-b border-neutral-200/80 px-4 sm:px-6 py-3 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
            卡片路線規劃
          </h1>

          {/* Undo / Redo controls */}
          <div className="flex items-center gap-1.5">
            <button
              id="undo-button"
              type="button"
              disabled={undoStack.length === 0}
              onClick={handleUndo}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-800 shadow-2xs"
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
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-800 shadow-2xs"
              title="重做 (Ctrl+Y 或 Cmd+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>重做</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        {/* Route Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-neutral-500 shrink-0">路線方案：</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {routes.map((r) => {
              const isActive = r.id === activeRouteId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setActiveRouteId(r.id);
                    setMobileTab('route');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-white text-neutral-600 hover:bg-neutral-200/80 hover:text-neutral-900 border border-neutral-200'
                  }`}
                >
                  <span>{r.title}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      isActive ? 'bg-neutral-700 text-neutral-200' : 'bg-neutral-100 text-neutral-500'
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
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 bg-white hover:bg-neutral-50 hover:text-neutral-900 border border-dashed border-neutral-300 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title="新增一條新路線"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新路線</span>
            </button>
          </div>
        </div>

        {/* Mobile View Toggle (Hidden on Tablet / Desktop) */}
        <div className="flex sm:hidden bg-neutral-200/70 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileTab('cards')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-colors cursor-pointer ${
              mobileTab === 'cards' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600'
            }`}
          >
            ① 卡片 ({cards.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('route')}
            className={`flex-1 py-1.5 rounded-lg text-center transition-colors cursor-pointer ${
              mobileTab === 'route' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600'
            }`}
          >
            ② 路線 ({activeRoute?.steps.length || 0})
          </button>
        </div>

        {/* Two-Column Simplified Workspace */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-h-[520px] flex-1">
          {/* Column 1: Option Cards */}
          <div className={`h-[560px] ${mobileTab === 'cards' ? 'block' : 'hidden sm:block'}`}>
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
          <div className={`h-[560px] ${mobileTab === 'route' ? 'block' : 'hidden sm:block'}`}>
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
              <div className="h-full bg-white rounded-2xl border border-neutral-200 flex items-center justify-center text-xs text-neutral-400">
                尚未選取路線
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
