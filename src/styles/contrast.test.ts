/**
 * 文字色トークンのコントラスト比を見る。
 *
 * 色は tokens.css にしか書かないと決めてある以上、読めるかどうかもここで一度に
 * 確かめられる。**目視では落ちない類の後退を捕まえるためのテスト**で、実際に
 * --color-text-faint は 2.4:1 まで薄いまま9pxのキャプションに使われていた。
 * 薄い色は作った画面では「上品」に見えるので、数字で止めないと戻ってくる。
 */
/// <reference types="node" />
// CSS をそのまま読む。`?raw` は Vite の CSS 処理に先回りされて空になるので使えない。
// アプリ側の tsconfig は types に node を入れていない（アプリからは使わせない）ため、
// このテストファイルだけ上の参照で型を引く。
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

/**
 * tokens.css の `--name: #rrggbb;` を集める。
 * 地図の色（`--map-*`）も混ぜるのは、**ピンの芯が府県アクセントの上に載る**ためで、
 * 読めるかどうかの突き合わせに地図側の値が要る（→ 末尾の「地図のピン」）。
 */
function readTokens(source: string): Record<string, string> {
  const found: Record<string, string> = {}
  for (const [, name, hex] of source.matchAll(
    /(--(?:color|map)-[\w-]+):\s*(#[0-9a-fA-F]{3,6})\b/g,
  )) {
    found[name] = hex
  }
  return found
}

/**
 * `marker` で始まるブロックの中身を、波括弧の対応を数えて取り出す。
 *
 * **ファイル全体をまとめて読んではいけない。** ダークモードの上書きは同じ名前で
 * 書かれているので、素直に集めると後ろの値で前が消え、どちらのテーマも
 * 正しく見ないまま通ってしまう。テーマごとに切り出してから突き合わせる。
 */
function block(source: string, marker: string): string {
  const start = source.indexOf(marker)
  if (start < 0) throw new Error(`tokens.css に ${marker} がありません`)
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i)
  }
  throw new Error(`tokens.css の ${marker} が閉じていません`)
}

const DARK_MEDIA = '@media (prefers-color-scheme: dark)'

const light = readTokens(block(css, ':root'))

/**
 * ダークは**ライトを土台にして、上書きした分だけ差し替える**（CSS と同じ重なり方）。
 * こうしておくと「地を暗くしたのに文字色の上書きを忘れた」がそのまま比に出る。
 */
const dark = { ...light, ...readTokens(block(block(css, DARK_MEDIA), ':root')) }

/** 同じ検査を両方のテーマに当てる */
const THEMES = [
  ['ライト', light],
  ['ダーク', dark],
] as const

// 読み取りそのものを見るテストはライト側を使う
const tokens = light

/** sRGB の相対輝度（WCAG 2.1 の定義） */
function luminance(hex: string): number {
  const body = hex.replace('#', '')
  const full = body.length === 3 ? [...body].map(c => c + c).join('') : body
  const [r, g, b] = (full.match(/../g) ?? []).map(pair => {
    const v = parseInt(pair, 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// 背景は2つしかない。クリームが地色で、カード・表の面が白
const BACKGROUNDS = ['--color-cream', '--color-surface'] as const

/** 本文サイズの文字に使うトークン。WCAG AA は 4.5:1 */
const TEXT_TOKENS = [
  '--color-text',
  '--color-text-muted',
  '--color-text-faint',
  '--color-gold-700',
  // 700 は文字色（27か所）。面として使うネイビーは navy-surface に分けてある
  '--color-navy-700',
]

describe('tokens.css の読み取り', () => {
  it('色トークンを拾えている', () => {
    expect(Object.keys(tokens).length).toBeGreaterThan(20)
    expect(tokens['--color-cream']).toBe('#f8f6f0')
  })

  it('3桁の略記も6桁に展開して扱う', () => {
    expect(contrastRatio('#fff', '#ffffff')).toBe(1)
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 1)
  })
})

describe.each(THEMES)('文字色のコントラスト（%s）', (_name, theme) => {
  for (const token of TEXT_TOKENS) {
    for (const bg of BACKGROUNDS) {
      it(`${token} は ${bg} の上で 4.5:1 以上`, () => {
        expect(contrastRatio(theme[token], theme[bg])).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  /**
   * 薄い順に text > muted > faint という段があること。
   * 上の下限を満たそうとして3つとも同じ濃さにすると、
   * 情報の優先度を色で表すという狙いのほうが消える。
   */
  it('3段の濃さの順序が保たれている', () => {
    const ground = theme['--color-cream']
    const text = contrastRatio(theme['--color-text'], ground)
    const muted = contrastRatio(theme['--color-text-muted'], ground)
    const faint = contrastRatio(theme['--color-text-faint'], ground)
    expect(text).toBeGreaterThan(muted)
    expect(muted).toBeGreaterThan(faint)
  })
})

/**
 * 罫・図形・大きな文字は 3:1（WCAG 1.4.11 / 大きな文字の AA）。
 * ゴールドの 500 と 600 は本文には薄すぎるが、この用途では使える。
 */
describe.each(THEMES)('図形・大きな文字のコントラスト（%s）', (_name, theme) => {
  for (const token of ['--color-gold-600']) {
    it(`${token} は地の上で 3:1 以上`, () => {
      expect(contrastRatio(theme[token], theme['--color-cream'])).toBeGreaterThanOrEqual(3)
    })
  }
})

/** `--pref-accent: #xxxxxx;` のような1行を読む。正規表現を使わずに済ませる */
function declared(body: string, name: string): string | undefined {
  const after = body.split(`${name}:`)[1]
  if (after === undefined) return undefined
  const value = after.split(';')[0].trim()
  return value.startsWith('#') ? value : undefined
}

/** `[data-pref='大阪府'] { … }` を府県名と中身の対に開く */
function prefBlocks(scope: string): [string, string][] {
  return scope
    .split(`[data-pref='`)
    .slice(1)
    .map(part => [part.slice(0, part.indexOf(`'`)), block(part, '{')])
}

/**
 * 府県アクセントは**淡い地（tint）の上に載る文字色**になる
 * （府県チップ、カードの見出し、表の府県欄）。ライトの表をそのまま
 * ダークへ持ち込むと、暗い画面に明るい板が残るうえ、文字と地が近づいて読めなくなる。
 */
describe.each(THEMES)('府県アクセントのコントラスト（%s）', (name, theme) => {
  const scope = name === 'ダーク' ? block(css, DARK_MEDIA) : css.slice(0, css.indexOf(DARK_MEDIA))
  const prefs = prefBlocks(scope)

  it('6府県ぶん定義されている', () => {
    expect(prefs.map(([pref]) => pref)).toHaveLength(6)
  })

  for (const [pref, body] of prefs) {
    const accent = declared(body, '--pref-accent')
    const tint = declared(body, '--pref-tint')

    it(`${pref} は accent と tint を持つ`, () => {
      expect(accent, `${pref} の --pref-accent`).toBeDefined()
      expect(tint, `${pref} の --pref-tint`).toBeDefined()
    })

    it(`${pref} の accent は自分の tint の上で 4.5:1 以上`, () => {
      expect(contrastRatio(accent!, tint!)).toBeGreaterThanOrEqual(4.5)
    })

    it(`${pref} の accent はカードの面の上でも 4.5:1 以上`, () => {
      expect(contrastRatio(accent!, theme['--color-surface'])).toBeGreaterThanOrEqual(4.5)
    })
  }
})

/**
 * 地図のピン。**面は府県アクセントで、その明暗がテーマで入れ替わる**
 * （ライトは濃い面、ダークは明るい面）。面の上に載る芯を片方のテーマだけで選ぶと
 * もう片方で消え、ダークでは明るい面にゴールドの芯で 1.1:1 まで落ちていた。
 *
 * 文字ではないので基準は 3:1（WCAG 1.4.11 の「文字以外のコントラスト」）。
 * 選択中の輪（--map-pin-ring）は色だけに頼らない補助の印なので、ここでは見ない。
 */
describe.each(THEMES)('地図のピンのコントラスト（%s）', (name, theme) => {
  const scope = name === 'ダーク' ? block(css, DARK_MEDIA) : css.slice(0, css.indexOf(DARK_MEDIA))

  for (const [pref, body] of prefBlocks(scope)) {
    const accent = declared(body, '--pref-accent')!

    it(`${pref} のピンは地図の地の上で 3:1 以上`, () => {
      expect(contrastRatio(accent, theme['--map-land'])).toBeGreaterThanOrEqual(3)
    })

    it(`${pref} のピンの芯は面の上で 3:1 以上`, () => {
      expect(contrastRatio(theme['--map-pin-core'], accent)).toBeGreaterThanOrEqual(3)
    })
  }
})
