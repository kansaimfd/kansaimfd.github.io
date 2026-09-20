// @vitest-environment jsdom
/**
 * フリーワード検索が、日本語の変換中に絞り込みを走らせないことを見る。
 *
 * 変換中の入力は `input` イベントとして届くので、素通しすると打鍵ごとに
 * 検索語が変わり、確定するまで0件が点滅する（→ SearchBox.tsx）。
 * **型チェックも lint も通る**うえ、英数字で打っている限り再現しないので、
 * 変換イベントを実際に起こして確かめる以外に気づく方法が無い。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import SearchBox from './SearchBox'

afterEach(cleanup)

/** 親（一覧ページ）の代わり。渡ってきた検索語を記録する */
function setup(initial = '') {
  const onChange = vi.fn()
  render(<SearchBox value={initial} onChange={onChange} />)
  return { input: screen.getByRole('searchbox', { name: 'フリーワード検索' }), onChange }
}

describe('変換を伴わない入力', () => {
  it('打鍵ごとにそのまま渡す', () => {
    const { input, onChange } = setup()
    fireEvent.change(input, { target: { value: 'RHY' } })
    expect(onChange).toHaveBeenCalledExactlyOnceWith('RHY')
  })

  it('×で空にしたことも渡す（絞り込みが解けないと結果が戻らない）', () => {
    const { input, onChange } = setup('ホール')
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenCalledExactlyOnceWith('')
  })
})

describe('日本語の変換中', () => {
  it('確定するまで親へ渡さない', () => {
    const { input, onChange } = setup()

    // 「ほーる」を打つ途中。ローマ字の綴りはどの施設にも当たらない
    fireEvent.compositionStart(input)
    for (const composing of ['h', 'ほ', 'ほー', 'ほーる']) {
      fireEvent.change(input, { target: { value: composing } })
    }

    expect(onChange).not.toHaveBeenCalled()
  })

  it('入力欄には変換中の文字を出す（打っているものが見えないと変換できない）', () => {
    const { input } = setup()
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'ほー' } })
    expect((input as HTMLInputElement).value).toBe('ほー')
  })

  it('確定したときに一度だけ渡す', () => {
    const { input, onChange } = setup()

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'ほーる' } })
    fireEvent.compositionEnd(input, { target: { value: 'ホール' } })

    expect(onChange).toHaveBeenCalledExactlyOnceWith('ホール')
  })

  it('確定したあとは、また打鍵ごとに渡す', () => {
    const { input, onChange } = setup()

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'ほーる' } })
    fireEvent.compositionEnd(input, { target: { value: 'ホール' } })
    onChange.mockClear()

    fireEvent.change(input, { target: { value: 'ホールA' } })
    expect(onChange).toHaveBeenCalledExactlyOnceWith('ホールA')
  })

  it('変換を2度続けても取りこぼさない', () => {
    const { input, onChange } = setup()

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'おおさか' } })
    fireEvent.compositionEnd(input, { target: { value: '大阪' } })

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: '大阪しないほーる' } })
    fireEvent.compositionEnd(input, { target: { value: '大阪市内ホール' } })

    expect(onChange.mock.calls).toEqual([['大阪'], ['大阪市内ホール']])
  })
})
