interface Props {
  /** 絞り込みが効いているときだけ渡す。何も絞っていなければ解除するものが無い */
  onReset?: () => void
}

/**
 * 0件のときの表示。
 *
 * **条件を外す手段をここに置く。** 絞り込みは府県・市区町村・駅・徒歩・客席数・
 * 舞台寸法・設備・貸館と10近くあり、0件になった人は効いている条件を
 * 探して1つずつ戻すしかなかった（絞り込みパネルは狭い画面では畳まれてもいる）。
 */
export default function EmptyResult({ onReset }: Props) {
  return (
    <div className="empty">
      <p>該当する施設がありません</p>
      {onReset && (
        <button type="button" className="empty__reset" onClick={onReset}>
          条件をすべて解除
        </button>
      )}
    </div>
  )
}
