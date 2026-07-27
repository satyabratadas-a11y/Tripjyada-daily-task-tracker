interface Stat {
  label: string;
  value: number;
  color: string;
}

export default function SummaryBar({ stats }: { stats: Stat[] }) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="card relative flex min-w-0 items-center gap-3 overflow-hidden px-4 py-3 sm:px-5">
          <span className={`absolute inset-y-0 left-0 w-1 ${s.color}`} />
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.color} bg-opacity-20`}>
            <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-100">{s.value}</p>
            <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
