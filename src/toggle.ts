/**
 * 選択の切り替え。押したものが入っていれば外し、無ければ足す。
 *
 * 府県・設備・ホール種別の絞り込みで同じ処理を4か所に書いていた。
 * **元の配列・集合は変えずに新しいものを返す**（Reactの状態として持つため）。
 */
export function toggleIn<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter(v => v !== value) : [...values, value]
}

export function toggleKey(keys: Set<string>, key: string): Set<string> {
  const next = new Set(keys)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

/**
 * 表の見出しを押したときの並び替え。
 * 同じキーなら向きを反転し、違うキーなら昇順から始める。
 *
 * 状態をURLに移したので、`useSort` が持っていたこの規則だけを関数として残した。
 */
export function nextSort<T extends string>(
  current: { key: T; asc: boolean },
  key: T,
): { key: T; asc: boolean } {
  return current.key === key ? { key, asc: !current.asc } : { key, asc: true }
}
