import React, { useState } from 'react';
import { OptionCard } from '../types';
import { Plus, Edit2, Trash2, Check, X, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface CardsPanelProps {
  cards: OptionCard[];
  onAddCard: (title: string) => void;
  onEditCard: (id: string, newTitle: string) => void;
  onDeleteCard: (id: string) => void;
  onAddToRoute: (cardId: string) => void;
  onReorderCards: (fromIndex: number, toIndex: number) => void;
  onRemoveStepFromRoute?: (stepIndex: number) => void;
}

export const CardsPanel: React.FC<CardsPanelProps> = ({
  cards,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onAddToRoute,
  onReorderCards,
  onRemoveStepFromRoute,
}) => {
  const [newCardTitle, setNewCardTitle] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Drag state
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [dropSlot, setDropSlot] = useState<number | null>(null);
  const [isHoveringStepFromRoute, setIsHoveringStepFromRoute] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    onAddCard(newCardTitle.trim());
    setNewCardTitle('');
  };

  const startEdit = (card: OptionCard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingCardId(card.id);
    setEditingTitle(card.title);
  };

  const saveEdit = (id: string) => {
    if (editingTitle.trim()) {
      onEditCard(id, editingTitle.trim());
    }
    setEditingCardId(null);
  };

  const handleCardDragStart = (e: React.DragEvent, card: OptionCard, index: number) => {
    setDraggedCardIndex(index);
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({ type: 'card', cardId: card.id, cardIndex: index })
    );
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleCardDragEnd = () => {
    setDraggedCardIndex(null);
    setDropSlot(null);
    setIsHoveringStepFromRoute(false);
  };

  const handleItemDragOver = (e: React.DragEvent, itemIndex: number) => {
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
    if (e.dataTransfer.types.includes('text/plain')) {
      setIsHoveringStepFromRoute(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const data = JSON.parse(raw);

      if (data.type === 'card') {
        const fromIndex =
          typeof data.cardIndex === 'number'
            ? data.cardIndex
            : cards.findIndex((c) => c.id === data.cardId);

        if (fromIndex !== -1 && dropSlot !== null) {
          let targetIndex = dropSlot;
          if (targetIndex > fromIndex) {
            targetIndex -= 1;
          }
          targetIndex = Math.max(0, Math.min(targetIndex, cards.length - 1));
          if (fromIndex !== targetIndex) {
            onReorderCards(fromIndex, targetIndex);
          }
        }
      } else if (data.type === 'step' && typeof data.index === 'number') {
        if (onRemoveStepFromRoute) {
          onRemoveStepFromRoute(data.index);
        }
      }
    } catch {
      // ignore
    }
    setDraggedCardIndex(null);
    setDropSlot(null);
    setIsHoveringStepFromRoute(false);
  };

  return (
    <div
      id="cards-panel-container"
      onDragOver={handleContainerDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDropSlot(null);
          setIsHoveringStepFromRoute(false);
        }
      }}
      onDrop={handleDrop}
      className={`bg-white rounded-2xl border p-3 sm:p-5 flex flex-col h-full shadow-xs transition-colors min-w-0 w-full overflow-hidden ${
        isHoveringStepFromRoute
          ? 'border-dashed border-rose-300 bg-rose-50/20'
          : 'border-neutral-200'
      }`}
    >
      {/* Header */}
      <div className="mb-3 sm:mb-4 min-w-0 w-full">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-neutral-900">
              卡片庫
            </h2>
            <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-medium">
              {cards.length}
            </span>
          </div>
          {isHoveringStepFromRoute && (
            <span className="text-xs text-rose-600 font-medium animate-pulse">
              放開即可自路線移除
            </span>
          )}
        </div>

        {/* Quick Add Form - strictly constrained with min-w-0 to prevent narrow-screen overflow */}
        <form onSubmit={handleCreate} className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0">
          <input
            id="new-card-input"
            type="text"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="輸入卡片內容..."
            className="min-w-0 w-full flex-1 px-3 py-2 text-base sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-neutral-900 transition-colors"
          />
          <button
            id="add-card-submit-button"
            type="submit"
            disabled={!newCardTitle.trim()}
            className="px-3 sm:px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0 min-h-[38px] sm:min-h-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>新增</span>
          </button>
        </form>
      </div>

      {/* Cards List */}
      <div
        className="flex-1 overflow-y-auto space-y-2 pr-1 min-w-0 w-full"
        onDragOver={(e) => {
          e.preventDefault();
          if (cards.length === 0) setDropSlot(0);
        }}
      >
        {cards.length === 0 ? (
          <div className="py-14 sm:py-16 text-center text-xs text-neutral-400 px-2">
            目前沒有任何卡片，請在上方輸入內容點擊「新增」
          </div>
        ) : (
          cards.map((card, index) => {
            const isEditing = editingCardId === card.id;
            const isBeingDragged = draggedCardIndex === index;
            const showDropBefore = dropSlot === index;
            const showDropAfter = dropSlot === index + 1 && index === cards.length - 1;

            return (
              <React.Fragment key={card.id}>
                {/* Drop Indicator Bar Before */}
                {showDropBefore && (
                  <div className="h-1 bg-neutral-900 rounded-full mx-1 transition-all" />
                )}

                {isEditing ? (
                  <div className="p-2 sm:p-2 bg-amber-50/60 border border-amber-300 rounded-xl flex items-center gap-1.5 w-full min-w-0">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(card.id);
                        if (e.key === 'Escape') setEditingCardId(null);
                      }}
                      autoFocus
                      className="min-w-0 w-full flex-1 px-2.5 py-1.5 text-base sm:text-sm bg-white border border-neutral-300 rounded-lg focus:outline-hidden focus:border-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(card.id)}
                      className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg cursor-pointer shrink-0"
                      title="確認修改"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCardId(null)}
                      className="p-1.5 text-neutral-400 hover:bg-neutral-100 rounded-lg cursor-pointer shrink-0"
                      title="取消"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    id={`card-item-${card.id}`}
                    draggable
                    onDragStart={(e) => handleCardDragStart(e, card, index)}
                    onDragEnd={handleCardDragEnd}
                    onDragOver={(e) => handleItemDragOver(e, index)}
                    onClick={() => onAddToRoute(card.id)}
                    className={`group relative p-2.5 sm:p-2.5 bg-white hover:bg-amber-50/40 border rounded-xl transition-all cursor-pointer flex items-center justify-between gap-1.5 sm:gap-2.5 shadow-2xs min-w-0 w-full ${
                      isBeingDragged
                        ? 'opacity-30 border-dashed border-neutral-400'
                        : 'border-neutral-200 hover:border-amber-300'
                    }`}
                    title="點擊加入右側路線，亦可上下拖曳調整順序或拖至路線"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <span className="text-neutral-400 group-hover:text-neutral-700 cursor-grab active:cursor-grabbing shrink-0">
                        <GripVertical className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      </span>
                      <span className="text-sm font-medium text-neutral-800 group-hover:text-neutral-950 truncate min-w-0">
                        {card.title}
                      </span>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      {/* Mobile Up/Down Quick Reorder Buttons */}
                      <div className="flex items-center sm:hidden">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderCards(index, index - 1);
                          }}
                          className={`p-1 text-neutral-400 hover:text-neutral-800 rounded-md transition-colors ${
                            index === 0 ? 'invisible pointer-events-none' : 'active:bg-neutral-100'
                          }`}
                          title="上移卡片"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === cards.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderCards(index, index + 1);
                          }}
                          className={`p-1 text-neutral-400 hover:text-neutral-800 rounded-md transition-colors ${
                            index === cards.length - 1 ? 'invisible pointer-events-none' : 'active:bg-neutral-100'
                          }`}
                          title="下移卡片"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => startEdit(card, e)}
                        className="p-1.5 sm:p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                        title="修改卡片名稱"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`確定要刪除卡片「${card.title}」嗎？`)) {
                            onDeleteCard(card.id);
                          }
                        }}
                        className="p-1.5 sm:p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="刪除此卡片"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="ml-0.5 sm:ml-1 px-2 py-0.5 text-xs font-semibold bg-neutral-50 border border-neutral-200 text-neutral-700 group-hover:bg-neutral-900 group-hover:text-white group-hover:border-neutral-900 rounded-lg transition-colors whitespace-nowrap">
                        + 加入
                      </span>
                    </div>
                  </div>
                )}

                {/* Drop Indicator Bar After (only for the last item) */}
                {showDropAfter && (
                  <div className="h-1 bg-neutral-900 rounded-full mx-1 transition-all" />
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};
