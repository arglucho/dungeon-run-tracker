import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/history', label: 'Historial', icon: '📜' },
  { to: '/statistics', label: 'Estadísticas', icon: '📊' },
  { to: '/compare', label: 'Comparador', icon: '⚖️' },
  { to: '/resources', label: 'Recursos', icon: '💎' },
  { to: '/dungeons', label: 'Mazmorras', icon: '🏰' }
]

export function Navbar(): React.JSX.Element {
  return (
    <nav className="flex items-center gap-1 bg-bg-card border-b border-border px-4 h-12 shrink-0">
      <span className="text-secondary font-bold text-lg mr-4 font-[family-name:var(--font-title)]">
        ⚔️ DRT
      </span>

      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-md text-sm transition-colors duration-150 ${
              isActive
                ? 'bg-primary text-text border border-border-gold'
                : 'text-text-muted hover:bg-bg-lighter hover:text-text border border-transparent'
            }`
          }
        >
          <span className="mr-1">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
