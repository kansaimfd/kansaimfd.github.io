interface Props {
  children: React.ReactNode
}

export default function FilterPanel({ children }: Props) {
  return (
    <details className="mb-4 border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      <summary className="cursor-pointer font-medium text-navy-700">絞り込み・検索</summary>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">{children}</div>
    </details>
  )
}
