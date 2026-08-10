type HasName = { 施設名: string; 施設名かな?: string }

/** カタカナをひらがなに寄せる（長音符・中黒はそのまま） */
function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

/**
 * 五十音順ソート用のキー。読みが取れない場合は null を返す。
 *
 * 施設名かな があればそれ。なければ、施設名がかな・カナだけで書かれている場合に限り
 * 機械的にひらがなへ変換する。漢字やラテン文字を含む名前は読みが決まらないので null。
 */
export function kanaKey(f: HasName): string | null {
  if (f.施設名かな) return f.施設名かな
  const name = f.施設名.replace(/[\s・（）()]/g, '')
  return /^[ぁ-ゟァ-ヺー]+$/.test(name) ? toHiragana(name) : null
}

/**
 * 施設名の並び順を比較する。
 *
 * 読みが分かるものを五十音順で先に並べ、読みが決まらないもの（ラテン文字の施設名など）を
 * そのあとに名前順で並べる。コードポイント順だと
 * 「100BANスタジオ → 7th Note → KOKO PLAZA → アイホール」のような並びになってしまうため。
 */
export function compareByName(a: HasName, b: HasName): number {
  const ka = kanaKey(a)
  const kb = kanaKey(b)
  if (ka && kb) return ka.localeCompare(kb, 'ja')
  if (ka) return -1
  if (kb) return 1
  return a.施設名.localeCompare(b.施設名, 'ja')
}
