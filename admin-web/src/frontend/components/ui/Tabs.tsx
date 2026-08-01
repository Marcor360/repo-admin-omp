import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
  activeTabId?: string;
  onChange?: (id: string) => void;
}

export function Tabs({ items, defaultTabId, activeTabId, onChange }: TabsProps) {
  const [internalActive, setInternalActive] = useState(defaultTabId ?? items[0]?.id);
  const active = activeTabId ?? internalActive;
  const listRef = useRef<HTMLDivElement>(null);

  function selectTab(id: string) {
    setInternalActive(id);
    onChange?.(id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + items.length) % items.length;
    const nextItem = items[nextIndex];
    if (!nextItem) return;
    selectTab(nextItem.id);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }

  const activeItem = items.find((item) => item.id === active) ?? items[0];

  return (
    <div className="tabs">
      <div className="tabs-list" role="tablist" ref={listRef}>
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={item.id === active}
            aria-controls={`tabpanel-${item.id}`}
            tabIndex={item.id === active ? 0 : -1}
            className={`tabs-tab${item.id === active ? ' tabs-tab--active' : ''}`}
            onClick={() => selectTab(item.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {activeItem ? (
        <div role="tabpanel" id={`tabpanel-${activeItem.id}`} aria-labelledby={`tab-${activeItem.id}`} className="tabs-panel">
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}
