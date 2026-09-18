import { describe, expect, it } from 'vitest'
import { SITE_NAME, pageTitle } from './title'

describe('pageTitle', () => {
  it('ページ名にサイト名を添える', () => {
    expect(pageTitle('練習場一覧')).toBe(`練習場一覧 | ${SITE_NAME}`)
  })

  // 区切りだけが残った題名を作らない
  it.each([undefined, null, '', '   '])('ページ名が %p ならサイト名だけを返す', name => {
    expect(pageTitle(name)).toBe(SITE_NAME)
  })

  it('前後の空白は落とす', () => {
    expect(pageTitle('  いずみホール  ')).toBe(`いずみホール | ${SITE_NAME}`)
  })
})
