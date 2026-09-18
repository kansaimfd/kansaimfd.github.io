import { useState } from 'react'

/**
 * 並び替えのキーと向き。
 *
 * 見出しを押したときの決まり（同じキーなら向きを反転、違うキーなら昇順に戻す）は
 * 一覧2つで同じものを別々に書いていた。
 */
export default function useSort<T extends string>(initial: T) {
  const [sortKey, setSortKey] = useState<T>(initial)
  const [sortAsc, setSortAsc] = useState(true)

  function toggleSort(key: T) {
    if (sortKey === key) setSortAsc(a => !a)
    else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  function setSort(key: T, asc: boolean) {
    setSortKey(key)
    setSortAsc(asc)
  }

  return { sortKey, sortAsc, toggleSort, setSort }
}
