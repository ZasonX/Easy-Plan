import React, { useState } from 'react';
import { RoutePlan, OptionCard } from '../types';
import {
  GripVertical,
  X,
  Copy,
  Check,
  CheckCheck,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  ArrowDown,
} from 'lucide-react';

interface RouteCanvasProps {
  route: RoutePlan;
  cardsMap: Record<string, OptionCard>;
  onUpdateTitle: (newTitle: string) => void;
  onMoveStep: (fromIndex: number, toIndex: number) => void;
  onRemoveStep: (index: number) => void;
  onClearSteps: () => void;
  onDeleteRoute: () => void;
  onDropCard: (cardId: string, atIndex?: number) => void;
  totalRoutesCount: number;
}

export const RouteCanvas: React.FC<RouteCanvasProps> = ({
  route,
  cardsMap,
  onUpdateTitle,
  onMoveStep,
  onRemoveStep,
  onClearSteps,
  onDeleteRoute,
  onDropCard,
  totalRoutesCount,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(route.title);
  const [copied, setCopied] = useState(false);

  // Drag state inside canvas
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [dropSlot, setDropSlot] = useState<number | null>(null);

  const handleTitleSubmit = () => {
    if (titleValue.trim()) {
      onUpdateTitle(titleValue.trim());
    }
    setIsEditingTitle(false);
  };

  const handleCopy = async () => {
    if (route.steps.length === 0) return;
    const text = route.steps
      .map((s, idx) => {
        const card = cardsMap[s.cardId];
        return `${idx + 1}. ${card ? card.title : '未知卡片'}`;
      })
      .join('\n');

    try {
      await navigator.clipboard.writeText(`【${route.title}】\n${text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Step item dragging within route
  const handleStepDragStart = (e: React.DragEvent, index: number) => {
    setDraggedStepIndex(index);
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ type: 'step', index, routeId: route.id })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStepDragEnd = () => {
    setDraggedStepIndex(null);
    setDropSlot(null);
  };

  // Calculating drop slot for reordering or inserting
  const handleStepDragOver = (e: React.DragEvent, itemIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const isTopHalf = offsetY < rect.height / 2;
    const targetSlot = isTopHalf ? itemIndex : itemIndex + 1;
    setDropSlot(targetSlot);
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (route.steps.length === 0) {
      setDropSlot(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const data = JSON.parse(raw);

      if (data.type === 'card' && data.cardId) {
        // Dropping a card from left panel into route
        const targetIndex = dropSlot !== null ? dropSlot : route.steps.length;
        onDropCard(data.cardId, targetIndex);
      } else if (data.type === 'step' && typeof data.index === 'number') {
        // Reordering steps within current route
        if (dropSlot !== null) {
          const fromIndex = data.index;
          let targetIndex = dropSlot;
          if (targetIndex > fromIndex) {
            targetIndex -= 1;
          }
          targetIndex = Math.max(0, Math.min(targetIndex, route.steps.length - 1));
          if (fromIndex !== targetIndex) {
            onMoveStep(fromIndex, targetIndex);
          }
        }
      }
    } catch {
      // ignore
    }
    setDraggedStepIndex(null);
    setDropSlot(null);
  };

  return (
    <div
      id="route-canvas-container"
      className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 sm:p-5 flex flex-col h-full shadow-xs min-w-0 w-full overflow-hidden transition-colors"
      onDragOver={handleContainerDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDropSlot(null);
        }
      }}
      onDrop={handleDrop}
    >
      {/* Route Header */}
      <div className="flex flex-col gap-2.5 sm:gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800 min-w-0 w-full">
        <div className="flex items-center justify-between gap-2 min-w-0 w-full">
          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5 w-full min-w-0">
                <input
                  id="route-title-input"
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSubmit();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  autoFocus
                  className="min-w-0 w-full flex-1 text-base font-bold text-neutral-900 dark:text-white bg-neutral-50 dark:bg-neutral-800 px-2.5 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:bg-white dark:focus:bg-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-400"
                />
                <button
                  type="button"
                  onClick={handleTitleSubmit}
                  className="p-1.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg cursor-pointer shrink-0"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white truncate">
                  {route.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1.5 sm:p-1 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors cursor-pointer shrink-0"
                  title="重新命名此路線"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full font-medium shrink-0">
                  {route.steps.length} 步
                </span>
              </div>
            )}
          </div>

          {/* Toolbar Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              disabled={route.steps.length === 0}
              className="px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-30"
              title="複製路線步驟清單"
            >
              {copied ? (
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="hidden xs:inline">{copied ? '已複製' : '複製文字'}</span>
            </button>

            {route.steps.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('確定要清空這條路線的所有卡片嗎？')) {
                    onClearSteps();
                  }
                }}
                className="px-2 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                清空
              </button>
            )}

            {totalRoutesCount > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`確定要刪除「${route.title}」嗎？`)) {
                    onDeleteRoute();
                  }
                }}
                className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                title="刪除此路線"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div
        className="flex-1 overflow-y-auto pt-3 pb-2 space-y-2 pr-1"
        onDragOver={(e) => {
          e.preventDefault();
          if (route.steps.length === 0) setDropSlot(0);
        }}
      >
        {route.steps.length === 0 ? (
          <div
            className={`h-56 sm:h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center transition-colors ${
              dropSlot !== null
                ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800/60'
                : 'border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
              路線目前空白
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-xs">
              點擊卡片庫中的卡片「+ 加入」或拖曳卡片排定路線步驟
            </p>
          </div>
        ) : (
          route.steps.map((step, index) => {
            const card = cardsMap[step.cardId];
            const isDragging = draggedStepIndex === index;
            const showDropBefore = dropSlot === index;
            const showDropAfter = dropSlot === index + 1 && index === route.steps.length - 1;

            return (
              <React.Fragment key={step.id}>
                {/* Drop Indicator Bar Before */}
                {showDropBefore && (
                  <div className="h-1 bg-neutral-900 dark:bg-neutral-100 rounded-full mx-1 transition-all" />
                )}

                {/* Step Card (Touch-optimized controls on mobile) */}
                <div
                  draggable
                  onDragStart={(e) => handleStepDragStart(e, index)}
                  onDragEnd={handleStepDragEnd}
                  onDragOver={(e) => handleStepDragOver(e, index)}
                  className={`p-3 sm:p-2.5 bg-white dark:bg-neutral-800/80 border rounded-xl flex items-center justify-between gap-2.5 shadow-2xs transition-all ${
                    isDragging
                      ? 'opacity-30 border-dashed border-neutral-400 dark:border-neutral-500'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                  title="可上下拖曳調整順序，亦可拖回左側卡庫移除"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-grab active:cursor-grabbing shrink-0 hidden xs:inline-block">
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                    <span className="w-5 h-5 sm:w-5 sm:h-5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                      {card ? card.title : '已刪除的卡片'}
                    </span>
                  </div>

                  {/* Move & Delete Controls with comfortable touch targets */}
                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => onMoveStep(index, index - 1)}
                      className={`p-2 sm:p-1 rounded-md transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center ${
                        index === 0
                          ? 'invisible pointer-events-none'
                          : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-100 active:bg-neutral-100 dark:active:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer'
                      }`}
                      title="往上移"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === route.steps.length - 1}
                      onClick={() => onMoveStep(index, index + 1)}
                      className={`p-2 sm:p-1 rounded-md transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center ${
                        index === route.steps.length - 1
                          ? 'invisible pointer-events-none'
                          : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-100 active:bg-neutral-100 dark:active:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer'
                      }`}
                      title="往下移"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveStep(index)}
                      className="p-2 sm:p-1 text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 active:bg-rose-50 dark:active:bg-rose-950/40 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                      title="從路線移除"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Drop Indicator Bar After (only for the last item) */}
                {showDropAfter && (
                  <div className="h-1 bg-neutral-900 dark:bg-neutral-100 rounded-full mx-1 transition-all" />
                )}

                {/* Flow indicator between steps */}
                {index < route.steps.length - 1 && !showDropAfter && (
                  <div className="flex items-center justify-center py-0.5 text-neutral-300 dark:text-neutral-600">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                )}
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end text-[11px]">
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">● 自動儲存於本機</span>
      </div>
    </div>
  );
};
