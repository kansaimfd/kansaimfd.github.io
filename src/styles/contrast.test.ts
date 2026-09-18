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

/** tokens.css の `--name: #rrggbb;` を集める */
function readTokens(source: string): Record<string, string> {
  const found: Record<string, string> = {}
  for (const [, name, hex] of source.matchAll(/(--color-[\w-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)) {
    found[name] = hex
  }
  return found
}

const tokens = readTokens(css)

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

describe('文字色のコントラスト', () => {
  for (const token of TEXT_TOKENS) {
    for (const bg of BACKGROUNDS) {
      it(`${token} は ${bg} の上で 4.5:1 以上`, () => {
        expect(contrastRatio(tokens[token], tokens[bg])).toBeGreaterThanOrEqual(4.5)
      })
    }
  }

  /**
   * 薄い順に text > muted > faint という段があること。
   * 上の下限を満たそうとして3つとも同じ濃さにすると、
   * 情報の優先度を色で表すという狙いのほうが消える。
   */
  it('3段の濃さの順序が保たれている', () => {
    const cream = tokens['--color-cream']
    const text = contrastRatio(tokens['--color-text'], cream)
    const muted = contrastRatio(tokens['--color-text-muted'], cream)
    const faint = contrastRatio(tokens['--color-text-faint'], cream)
    expect(text).toBeGreaterThan(muted)
    expect(muted).toBeGreaterThan(faint)
  })
})

/**
 * 罫・図形・大きな文字は 3:1（WCAG 1.4.11 / 大きな文字の AA）。
 * ゴールドの 500 と 600 は本文には薄すぎるが、この用途では使える。
 */
describe('図形・大きな文字のコントラスト', () => {
  for (const token of ['--color-gold-600']) {
    it(`${token} は クリーム地で 3:1 以上`, () => {
      expect(contrastRatio(tokens[token], tokens['--color-cream'])).toBeGreaterThanOrEqual(3)
    })
  }
})
