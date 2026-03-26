interface Props {
  sort: string;
  order: string;
  onSortChange: (sort: string) => void;
  onOrderChange: (order: string) => void;
}

function Btn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        active
          ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
      }`}
    >
      {children}
    </button>
  );
}

export default function SortControls({ sort, order, onSortChange, onOrderChange }: Props) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex gap-1">
        <Btn active={sort === 'date'} onClick={() => onSortChange('date')}>Date</Btn>
        <Btn active={sort === 'name'} onClick={() => onSortChange('name')}>Name</Btn>
      </div>
      <div className="flex gap-1">
        <Btn active={order === 'desc'} onClick={() => onOrderChange('desc')}>
          {sort === 'date' ? 'Newest' : 'Z-A'}
        </Btn>
        <Btn active={order === 'asc'} onClick={() => onOrderChange('asc')}>
          {sort === 'date' ? 'Oldest' : 'A-Z'}
        </Btn>
      </div>
    </div>
  );
}
