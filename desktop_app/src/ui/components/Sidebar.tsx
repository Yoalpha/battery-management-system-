import type { PageId } from '../types/battery'

type SidebarItem = {
  id: PageId
  label: string
}

type SidebarProps = {
  items: SidebarItem[]
  activeId: PageId
  onSelect: (id: PageId) => void
}

export function Sidebar({ items, activeId, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__eyebrow">Battery Management</span>
        <h1>Control Center</h1>
      </div>

      <nav className="sidebar__nav" aria-label="Primary">
        {items.map((item) => {
          const isActive = item.id === activeId

          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelect(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="sidebar__footer">
        <p>Live battery overview</p>
        <span>Pack health stable</span>
      </div>
    </aside>
  )
}
