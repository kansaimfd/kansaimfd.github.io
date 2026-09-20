import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { nextSort } from './toggle'
import type { ViewMode } from './components/ViewToggle'

/**
 * 一覧の状態をURLに持たせるための共通部分。
 *
 * **状態は `useState` ではなくURLが持つ**（→ query.ts）。その読み書きの手順
 * ——クエリから状態を作り、条件をひとつ変えるたびに履歴をひとつ積み、
 * フリーワードだけは置き換える——は2つの一覧でまったく同じで、
 * 以前は同じコードがページごとに書かれていた。
 *
 * 変換そのもの（`*StateFromParams` / `*StateToParams`）は一覧ごとに違うので受け取る。
 * **渡す関数はモジュールの定数にすること**（描画のたびに新しい関数を作ると、
 * ここの `useMemo` が毎回作り直しになる）。
 */

/** 一覧の状態のうち、絞り込みではない部分。2つの一覧で共通 */
export interface ListState<K extends string> {
  view: ViewMode
  sortKey: K
  sortAsc: boolean
}

export interface ListStateApi<S, K extends string> {
  state: S
  /** `replace` を立てると履歴を積まずに置き換える（フリーワード用） */
  update: (patch: Partial<S>, replace?: boolean) => void
  toggleSort: (key: K) => void
}

export default function useListState<K extends string, S extends ListState<K>>(
  fromParams: (params: URLSearchParams) => S,
  toParams: (state: S) => URLSearchParams,
): ListStateApi<S, K> {
  const [params, setParams] = useSearchParams()
  const state = useMemo(() => fromParams(params), [fromParams, params])

  return {
    state,
    update: (patch, replace = false) => setParams(toParams({ ...state, ...patch }), { replace }),
    toggleSort: key => {
      const next = nextSort({ key: state.sortKey, asc: state.sortAsc }, key)
      setParams(toParams({ ...state, sortKey: next.key, sortAsc: next.asc }))
    },
  }
}
