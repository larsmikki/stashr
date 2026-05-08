import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  sort: string;
  order: string;
  onSortChange: (sort: string) => void;
  onOrderChange: (order: string) => void;
}

function Btn({ active, onClick, children, theme }: { active: boolean; onClick: () => void; children: React.ReactNode; theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
      style={
        active
          ? { background: `${theme.accent}15`, color: theme.accent, border: `1px solid ${theme.accent}` }
          : { background: theme.surface, color: theme.text2, border: `1px solid ${theme.border}` }
      }
    >
      {children}
    </button>
  );
}

export default function SortControls({ sort, order, onSortChange, onOrderChange }: Props) {
  const { theme } = useTheme();
  const isRandom = sort === 'random';

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        <Btn active={sort === 'date'} onClick={() => onSortChange('date')} theme={theme}>Date</Btn>
        <Btn active={sort === 'name'} onClick={() => onSortChange('name')} theme={theme}>Name</Btn>
        <Btn active={isRandom} onClick={() => onSortChange('random')} theme={theme}>Random</Btn>
      </div>
      {!isRandom && (
        <div className="flex gap-1">
          <Btn active={order === 'desc'} onClick={() => onOrderChange('desc')} theme={theme}>
            {sort === 'date' ? 'Newest' : 'Z-A'}
          </Btn>
          <Btn active={order === 'asc'} onClick={() => onOrderChange('asc')} theme={theme}>
            {sort === 'date' ? 'Oldest' : 'A-Z'}
          </Btn>
        </div>
      )}
    </div>
  );
}
