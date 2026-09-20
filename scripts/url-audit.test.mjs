import { describe, it, expect } from 'vitest'
import {
  decodeBody,
  isEnglishPage,
  judgePage,
  nameHitRatio,
  titleOf,
  visibleText,
} from './url-audit.mjs'

describe('nameHitRatio', () => {
  it('そのまま出てくれば 1', () => {
    expect(nameHitRatio('いずみホール', 'いずみホールのご案内')).toBe(1)
  })

  it('まったく出てこなければ 0', () => {
    expect(nameHitRatio('いずみホール', 'Apartments for rent in London')).toBe(0)
  })

  /** 同じ施設でも表記は揺れる。完全一致で見ると誤検知だらけになる */
  it('全角・半角と大小の違いは無視する', () => {
    expect(nameHitRatio('ＲＨＹ梅田', 'rhy梅田スタジオ')).toBe(1)
    expect(nameHitRatio('Poco四条', 'POCO四条 スタジオ')).toBe(1)
  })

  it('記号と空白は落として比べる', () => {
    expect(nameHitRatio('ザ・シンフォニーホール', 'ザシンフォニーホール')).toBe(1)
  })

  /**
   * 括弧を外すのは施設名の側だけ。ページ側から外すと
   * 「平野区民センター（コミュニティプラザ平野）」のように
   * 括弧の中にこそ登録名が入っている場合に、照合相手を自分で消してしまう
   */
  it('施設名の括弧の中は読みの別名なので外す', () => {
    expect(nameHitRatio('ラブリーホール（河内長野市立文化会館）', 'ラブリーホール')).toBe(1)
    expect(nameHitRatio('平野区民センター', 'コミュニティプラザ平野（平野区民センター）')).toBe(1)
  })

  it('2文字に満たない名前は測れないので 1 にする', () => {
    // 疑いの側へ倒すと、短い名前の施設が毎月 Issue に並び続ける
    expect(nameHitRatio('印', '無関係なページ')).toBe(1)
    expect(nameHitRatio('（略称）', '無関係なページ')).toBe(1)
  })

  it('一部だけ当たれば割合になる', () => {
    // 「あいうえ」の bigram は あい・いう・うえ の3つ
    expect(nameHitRatio('あいうえ', 'あい')).toBeCloseTo(1 / 3)
  })
})

describe('titleOf', () => {
  it('<title> の中身を1行にして返す', () => {
    expect(titleOf('<html><title>\n  いずみ\tホール\n</title>')).toBe('いずみ ホール')
  })

  it('属性付きでも読む', () => {
    expect(titleOf('<title lang="ja">ホール</title>')).toBe('ホール')
  })

  it('題名が無ければ空', () => {
    expect(titleOf('<html><body>本文</body></html>')).toBe('')
  })

  it('長い題名は先頭80文字だけ（Issue に並べるため）', () => {
    expect(titleOf(`<title>${'あ'.repeat(100)}</title>`)).toHaveLength(80)
  })
})

describe('visibleText', () => {
  it('script と style の中身は読まない', () => {
    const body = '<style>.a{}</style><script>var x="ホール"</script><p>本文</p>'
    expect(visibleText(body, '', 'example.jp')).not.toContain('var x')
    expect(visibleText(body, '', 'example.jp')).toContain('本文')
  })

  /**
   * 失効ドメインを取得した転用サイトは、施設名入りのホスト名（sayaka-hall.jp）を
   * タイトルや本文のURLに出す。URLごと数えると「施設名が出てくる」ことになってしまう
   */
  it('ホスト名と本文中のURLは数えない', () => {
    const body = '<p>https://sayaka-hall.jp/about</p><p>sayaka-hall.jp</p>'
    expect(visibleText(body, 'sayaka-hall.jp', 'sayaka-hall.jp')).not.toContain('sayaka')
  })

  it('題名も照合の対象に含める', () => {
    expect(visibleText('<p>本文</p>', 'いずみホール', 'example.jp')).toContain('いずみホール')
  })
})

describe('isEnglishPage', () => {
  it('html の lang でも構造化データでも見つける', () => {
    expect(isEnglishPage('<html lang="en-US">')).toBe(true)
    expect(isEnglishPage('<html lang="en">')).toBe(true)
    expect(isEnglishPage('{"inLanguage":"en-US"}')).toBe(true)
  })

  it('日本語のページは false', () => {
    expect(isEnglishPage('<html lang="ja">')).toBe(false)
  })
})

describe('judgePage', () => {
  const page = (施設名, body) => judgePage({ 施設名, URL: 'https://example.jp/', body })

  it('施設名が出てくれば正常', () => {
    const v = page('いずみホール', '<title>いずみホール</title><p>ご利用案内</p>')
    expect(v.suspect).toBe(false)
    expect(v.title).toBe('いずみホール')
    expect(v.why).toBe('施設名の一致率 100%')
  })

  it('施設名がほとんど出てこなければ疑う', () => {
    const v = page('SAYAKAホール', '<title>Apartments</title><p>Rent in London</p>')
    expect(v.suspect).toBe(true)
    expect(v.ratio).toBeLessThan(0.34)
  })

  /**
   * 日本の施設の公式サイトが英語だけで出来ていることはまずない。
   * 失効ドメインの転用先は英語のテンプレートサイトであることが多いので、
   * 英語ページは一致率の基準を上げる
   */
  it('英語のページは半端な一致率でも疑う', () => {
    // 「あいうえお」の bigram 4つのうち2つが当たる（一致率 50%）
    const 本文 = '<title>Home</title><p>あいう</p>'
    const 英語 = page('あいうえお', `<html lang="en-US">${本文}`)
    expect(英語.ratio).toBeCloseTo(0.5)
    expect(英語.suspect).toBe(true)
    expect(英語.why).toContain('en-US')

    // 同じ一致率でも日本語のページなら通す
    const 日本語 = page('あいうえお', `<html lang="ja">${本文}`)
    expect(日本語.ratio).toBeCloseTo(0.5)
    expect(日本語.suspect).toBe(false)
  })
})

describe('decodeBody', () => {
  it('指定が無ければ UTF-8 として読む', () => {
    expect(decodeBody(Buffer.from('ホール', 'utf8'), null)).toBe('ホール')
  })

  /** 公式サイトには Shift_JIS のまま残っているものがある */
  it('Content-Type の charset に従う', () => {
    const sjis = Buffer.from([0x93, 0xfa, 0x96, 0x7b]) // 「日本」
    expect(decodeBody(sjis, 'text/html; charset=Shift_JIS')).toBe('日本')
  })

  it('windows-31j のような別名も Shift_JIS として読む', () => {
    const sjis = Buffer.from([0x93, 0xfa, 0x96, 0x7b])
    expect(decodeBody(sjis, 'text/html; charset=windows-31j')).toBe('日本')
  })

  it('meta charset からも読む（ヘッダーに無い場合）', () => {
    const body = Buffer.concat([
      Buffer.from('<meta charset="shift_jis">'),
      Buffer.from([0x93, 0xfa, 0x96, 0x7b]),
    ])
    expect(decodeBody(body, '')).toContain('日本')
  })

  it('扱えない符号化は UTF-8 として読む（検査は止めない）', () => {
    expect(decodeBody(Buffer.from('ホール', 'utf8'), 'text/html; charset=x-unknown')).toBe('ホール')
  })
})
