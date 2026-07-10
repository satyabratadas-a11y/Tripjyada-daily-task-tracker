interface Stat {
  label: string;
  value: number;
  color: string;
}

export default function SummaryBar({ stats }: { stats: Stat[] }) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="card flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.color}`}>
            <span className="h-2 w-2 rounded-full bg-white/90" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold leading-tight text-gray-900 dark:text-gray-100">{s.value}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
