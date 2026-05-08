import { useTheme, THEMES } from '@/contexts/ThemeContext'

export default function ThemePicker({ onSelect }: { onSelect?: (name: string) => void } = {}) {
  const { theme, setThemeByName } = useTheme()
  return (
    <div className="grid grid-cols-5 gap-2">
      {THEMES.map(t => {
        const isActive = t.name === theme.name
        return (
          <button
            key={t.name}
            onClick={() => { setThemeByName(t.name); onSelect?.(t.name) }}
            className="flex flex-col items-center p-1.5 rounded-xl transition-all"
            style={{
              border: isActive ? `2px solid ${theme.accent}` : `2px solid transparent`,
              background: isActive ? `${theme.accent}12` : 'transparent',
            }}
          >
            <div className="relative w-full aspect-square rounded-lg overflow-hidden flex">
              {t.previewColors.map((c, i) => (
                <div key={i} className="flex-1" style={{ background: c }} />
              ))}
              <div className="absolute bottom-0 left-0 right-0 text-center" style={{ padding: '4px 5px', background: 'rgba(0,0,0,0.38)' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>{t.name}</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
