import { describe, expect, it, vi } from 'vitest'
import { report, validate } from './validate.mjs'

/** 検査に通る最小の施設。各テストは崩したい項目だけを上書きする */
const 施設 = (overrides = {}) => ({
  ID: 10,
  施設名: 'テストホール',
  都道府県: '大阪府',
  市区町村: '大阪市中央区',
  番地以下: '1-2-3',
  緯度: 34.68,
  経度: 135.5,
  出典: [{ URL: 'https://example.com/hall', 確認日: '2025-06-02' }],
  部屋: [{ 部屋名: '大ホール', 客席数: 1500 }],
  ...overrides,
})

const 部屋付き = room => 施設({ 部屋: [{ 部屋名: '大ホール', ...room }] })

const errorsOf = (...records) => validate([{ file: 'concerthall', records }]).errors
const warningsOf = (...records) => validate([{ file: 'concerthall', records }]).warnings
const kindsOf = (...records) => warningsOf(...records).map(w => w.kind)

/** 崩した項目が1件のエラーとして報告されることを確かめる */
const expectOneError = (record, pattern) => {
  const errors = errorsOf(record)
  expect(errors).toHaveLength(1)
  expect(errors[0]).toMatch(pattern)
}

describe('基準となる施設', () => {
  it('検査に通る', () => {
    expect(errorsOf(施設())).toEqual([])
    expect(warningsOf(施設())).toEqual([])
  })
})

describe('ID', () => {
  it('整数でなければエラー', () => {
    expectOneError(施設({ ID: '10' }), /ID が整数ではありません/)
  })

  // ID は /concert/:id としてURLに使われるので、重複すると別の施設が開く
  it('同一ファイル内で重複したらエラー', () => {
    const errors = errorsOf(施設({ ID: 10 }), 施設({ ID: 10, 施設名: 'べつのホール' }))
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/ID が重複しています/)
  })

  // ID の名前空間はファイルごと。concerthall の 10 と practice の 10 は別施設
  it('ファイルが違えば同じIDでもよい', () => {
    const { errors } = validate([
      { file: 'concerthall', records: [施設({ ID: 10 })] },
      { file: 'practice', records: [施設({ ID: 10 })] },
    ])
    expect(errors).toEqual([])
  })
})

describe('必須フィールド', () => {
  it('欠けていればエラー', () => {
    expectOneError(施設({ 施設名: undefined }), /施設名 がありません/)
  })

  // 1つ直すたびにビルドし直さずに済むよう、1件目で止めずに全件集める
  it('複数の誤りをまとめて報告する', () => {
    const errors = errorsOf(施設({ URL: 'example.com', 開館時間: '9:00' }))
    expect(errors).toHaveLength(2)
  })
})

describe('座標', () => {
  it('府県の概略範囲から外れていたらエラー', () => {
    expectOneError(施設({ 緯度: 35.6, 経度: 139.7 }), /座標が 大阪府 の概略範囲外です/)
  })

  it('関西6府県以外はエラー', () => {
    expectOneError(施設({ 都道府県: '東京都' }), /都道府県が関西6府県ではありません/)
  })
})

describe('住所', () => {
  it('番地以下の全角数字はエラー', () => {
    expectOneError(施設({ 番地以下: '１-2-3' }), /全角数字/)
  })

  it('番地以下の全角ハイフンはエラー', () => {
    expectOneError(施設({ 番地以下: '1−2−3' }), /全角ハイフン/)
  })

  it('番地以下に市区町村が重複していたらエラー', () => {
    expectOneError(施設({ 番地以下: '大阪市中央区1-2-3' }), /重複しています/)
  })

  it('区名だけの重複も捕まえる', () => {
    expectOneError(施設({ 市区町村: '大阪市西区', 番地以下: '西区立売堀1-2-3' }), /西区 が重複/)
  })

  it('政令市は区まで書かせる', () => {
    expectOneError(施設({ 市区町村: '大阪市' }), /政令市は区まで/)
  })

  it('郡部は郡名から書かせる', () => {
    const 兵庫 = { 都道府県: '兵庫県', 市区町村: '佐用町', 緯度: 34.99, 経度: 134.35 }
    expectOneError(施設(兵庫), /郡部は郡名から/)
  })

  // ビル名や階数が番地側にあるとジオコーディングでの座標検算が効かなくなる
  it('番地以下にビル名があればエラー', () => {
    expectOneError(施設({ 番地以下: '1-2-3 テストビル5F' }), /建物 フィールドに分けて/)
  })
})

describe('施設名かな', () => {
  it('カタカナで書かれていたらエラー', () => {
    expectOneError(施設({ 施設名かな: 'テストホール' }), /ひらがなで書いて/)
  })

  it('ひらがな・長音符・中黒は通す', () => {
    expect(errorsOf(施設({ 施設名かな: 'ざ・ふぇにっくすほーる' }))).toEqual([])
  })

  // 読みがないと五十音順に並ばず末尾のグループへ送られるが、ビルドは止めない
  it('漢字を含むのに未設定なら警告', () => {
    expect(kindsOf(施設({ 施設名: '京都会館' }))).toContain(
      '施設名かなが未設定（五十音順に並ばない）',
    )
  })

  it('かなだけの施設名は未設定でよい', () => {
    expect(kindsOf(施設({ 施設名: 'アイホール' }))).toEqual([])
  })
})

describe('URL・時刻・出典', () => {
  it('URLの形式でなければエラー', () => {
    expectOneError(施設({ 申込URL: 'example.com/apply' }), /申込URL がURLの形式では/)
  })

  it('時刻は "HH:MM" のゼロ埋め', () => {
    expectOneError(施設({ 開館時間: '9:00' }), /開館時間 は "HH:MM"/)
  })

  it('開館時間が閉館時間以降なら警告', () => {
    expect(kindsOf(施設({ 開館時間: '22:00', 閉館時間: '09:00' }))).toContain(
      '開館時間が閉館時間以降',
    )
  })

  it('確認日は YYYY-MM-DD', () => {
    expectOneError(
      施設({ 出典: [{ URL: 'https://example.com', 確認日: '2025-6-2' }] }),
      /確認日 は YYYY-MM-DD/,
    )
  })

  // 出典のないデータは未検証として扱う
  it('出典が未記録なら警告', () => {
    expect(kindsOf(施設({ 出典: undefined }))).toContain('出典が未記録')
  })
})

describe('設備の3値', () => {
  // 〇 / × をそのまま書くと、未調査（キーごと省略）と false の区別が崩れる
  it('〇 が残っていたらエラー', () => {
    expectOneError(部屋付き({ ピアノ有無: '〇' }), /boolean ではありません/)
  })

  it('false は正しい記録として通す', () => {
    expect(errorsOf(部屋付き({ ピアノ有無: false }))).toEqual([])
  })
})

describe('備品の「有無 ＋ 詳細」', () => {
  it('詳細だけあって有無が立っていなければエラー', () => {
    expectOneError(部屋付き({ ピアノ種別: 'グランド' }), /ピアノ有無 が true ではありません/)
  })

  it('有無だけで詳細がないのは「あるが種別不明」として通す', () => {
    expect(errorsOf(部屋付き({ ピアノ有無: true }))).toEqual([])
  })

  it('譜面台数があるのに貸出が false ならエラー', () => {
    expectOneError(部屋付き({ 譜面台貸出: false, 譜面台数: 5 }), /譜面台貸出 が false/)
  })

  it('オルガン製作者だけあってもエラー', () => {
    expectOneError(
      部屋付き({ オルガン製作者: 'クーン社' }),
      /パイプオルガン が true ではありません/,
    )
  })
})

describe('列挙値', () => {
  it('ピアノ種別は3種のいずれか', () => {
    expectOneError(部屋付き({ ピアノ有無: true, ピアノ種別: '電子ピアノ' }), /ピアノ種別 は/)
  })

  it('ホール種別は3種のいずれか', () => {
    expectOneError(部屋付き({ ホール種別: 'コンサート専用' }), /ホール種別 は/)
  })
})

describe('部屋', () => {
  it('客席数などは正の数', () => {
    expectOneError(部屋付き({ 客席数: 0 }), /客席数 が正の数ではありません/)
  })

  it('部屋が複数あるのに名前がなければエラー', () => {
    expectOneError(施設({ 部屋: [{ 客席数: 1500 }, { 客席数: 300 }] }), /区別できません/)
  })

  it('単一の部屋なら名前を省略できる', () => {
    expect(errorsOf(施設({ 部屋: [{ 客席数: 1500 }] }))).toEqual([])
  })

  it('部屋が未登録なら警告', () => {
    expect(kindsOf(施設({ 部屋: undefined }))).toContain('部屋が未登録')
  })
})

describe('貸館', () => {
  it('状態は4つのいずれか', () => {
    expectOneError(施設({ 貸館: { 状態: '閉館' } }), /貸館.状態 は/)
  })

  it('開始・再開は "YYYY-MM"', () => {
    expectOneError(施設({ 貸館: { 状態: '休止', 開始: '2025-4' } }), /貸館.開始 は "YYYY-MM"/)
  })

  // 終了・廃止は再開しないことが定義。再開が入っているのは状態の取り違え
  it('終了に再開があればエラー', () => {
    expectOneError(施設({ 貸館: { 状態: '終了', 再開: '2027-03' } }), /状態 は 休止 か 予定 です/)
  })

  it('再開が開始以前ならエラー', () => {
    expectOneError(
      施設({ 貸館: { 状態: '休止', 開始: '2027-03', 再開: '2025-04' } }),
      /再開 が 開始 以前です/,
    )
  })

  // 予定は「まだ借りられる」の意味なので、開始月が来たら 休止 か 終了 に直す
  it('期限切れの予定はエラー', () => {
    expectOneError(施設({ 貸館: { 状態: '予定', 開始: '2020-01' } }), /がもう来ています/)
  })

  it('これからの予定は通る', () => {
    expect(errorsOf(施設({ 貸館: { 状態: '予定', 開始: '2099-01' } }))).toEqual([])
  })

  // 一部の部屋だけ休止している施設があるので、部屋側にも同じ形で書ける
  it('部屋側の貸館も同じ規則で検査する', () => {
    expectOneError(部屋付き({ 貸館: { 状態: '閉館' } }), /部屋\[0\] の 貸館.状態 は/)
  })
})

describe('利用条件', () => {
  it('種別は3つのいずれか', () => {
    expectOneError(施設({ 利用条件: { 種別: '会員限定', 説明: '会員のみ' } }), /利用条件.種別 は/)
  })

  it('説明がなければエラー', () => {
    expectOneError(施設({ 利用条件: { 種別: '要紹介' } }), /利用条件.説明 に/)
  })

  it('種別と説明が揃っていれば通る', () => {
    const 条件 = { 種別: '資格限定', 説明: '市内在住・在勤・在学者が5割以上' }
    expect(errorsOf(施設({ 利用条件: 条件 }))).toEqual([])
  })
})

describe('最寄駅', () => {
  it('駅がなければエラー', () => {
    expectOneError(施設({ 最寄駅: [{ 路線: ['JR京都線'] }] }), /最寄駅\[0\] に 駅 がありません/)
  })

  it('路線は配列', () => {
    expectOneError(施設({ 最寄駅: [{ 駅: '大阪駅', 路線: 'JR京都線' }] }), /路線 は配列で/)
  })

  it('駅徒歩・駅距離は正の数', () => {
    expectOneError(施設({ 最寄駅: [{ 駅: '大阪駅', 駅徒歩: -3 }] }), /駅徒歩 が正の数では/)
  })

  // 公正競争規約の 80m=1分 から1分以上ずれていたら、どちらかの記載を疑う
  it('駅徒歩と駅距離が食い違えば警告', () => {
    const 施 = 施設({ 最寄駅: [{ 駅: '大阪駅', 駅徒歩: 15, 駅距離: 300 }] })
    expect(kindsOf(施)).toContain('駅徒歩と駅距離が食い違う')
  })

  it('1分のずれは誤差として通す', () => {
    const 施 = 施設({ 最寄駅: [{ 駅: '大阪駅', 駅徒歩: 5, 駅距離: 450 }] })
    expect(kindsOf(施)).toEqual([])
  })

  it('徒歩が長すぎればバス利用を疑って警告', () => {
    expect(kindsOf(施設({ 最寄駅: [{ 駅: '大阪駅', 駅徒歩: 45 }] }))).toContain(
      '駅徒歩が長すぎる（バス利用の疑い）',
    )
  })

  it('駅名の語尾が不自然なら警告', () => {
    expect(kindsOf(施設({ 最寄駅: [{ 駅: '大阪' }] }))).toContain('駅名の語尾が不自然')
  })

  it('表記が揃っている路線名は警告しない', () => {
    const kinds = kindsOf(
      施設({ ID: 10, 最寄駅: [{ 駅: '本町駅', 路線: ['大阪メトロ御堂筋線'] }] }),
      施設({ ID: 20, 最寄駅: [{ 駅: '心斎橋駅', 路線: ['大阪メトロ御堂筋線'] }] }),
    )
    expect(kinds).not.toContain('路線名の表記ゆれ')
  })

  // 「大阪メトロ御堂筋線」と「Osaka Metro御堂筋線」が混ざっていることに気づけるように
  it('路線名の表記ゆれをファイル横断で拾う', () => {
    const kinds = kindsOf(
      施設({ ID: 10, 最寄駅: [{ 駅: '本町駅', 路線: ['大阪メトロ御堂筋線'] }] }),
      施設({ ID: 20, 最寄駅: [{ 駅: '心斎橋駅', 路線: ['Osaka Metro御堂筋線'] }] }),
    )
    expect(kinds).toContain('路線名の表記ゆれ')
  })
})

describe('駅座標マスタとの突き合わせ', () => {
  const stationMaster = { 駅: [{ 駅: '新大阪', 緯度: 34.7335, 経度: 135.5003 }] }
  const check = record =>
    validate([{ file: 'concerthall', records: [record] }], { stationMaster }).warnings.map(
      w => w.kind,
    )

  it('マスタにない駅名は表記ゆれを疑って警告', () => {
    expect(check(施設({ 最寄駅: [{ 駅: '新大坂駅', 駅徒歩: 5 }] }))).toContain(
      '駅がマスタに見つからない（表記ゆれの疑い）',
    )
  })

  // 直線距離が申告値を大きく超えるなら、道路距離としてありえない
  it('直線距離より近く書かれていたら警告', () => {
    const 遠い施設 = 施設({ 緯度: 34.68, 経度: 135.5, 最寄駅: [{ 駅: '新大阪駅', 駅徒歩: 3 }] })
    expect(check(遠い施設)).toContain('駅までの距離が実際より近く書かれている')
  })

  // 公式が距離で書いている施設は 駅徒歩 を持たないので、距離側でも同じ照合が要る
  it('駅距離しかなくても同じ照合をする', () => {
    const 遠い施設 = 施設({ 緯度: 34.68, 経度: 135.5, 最寄駅: [{ 駅: '新大阪駅', 駅距離: 500 }] })
    expect(check(遠い施設)).toContain('駅までの距離が実際より近く書かれている')
  })

  // 徒歩分数も距離も未調査なら、照合する相手がない
  it('徒歩分数も距離も無ければ距離の照合はしない', () => {
    const 遠い施設 = 施設({ 緯度: 34.68, 経度: 135.5, 最寄駅: [{ 駅: '新大阪駅' }] })
    expect(check(遠い施設)).not.toContain('駅までの距離が実際より近く書かれている')
  })

  it('マスタが無くても検査自体は動く', () => {
    expect(errorsOf(施設({ 最寄駅: [{ 駅: '新大阪駅', 駅徒歩: 5 }] }))).toEqual([])
  })

  // JR福島と阪神福島のように、同名で場所の違う駅がある
  it('同名の駅が複数あれば施設に近いほうで照合する', () => {
    const 同名マスタ = {
      駅: [
        { 駅: '福島', 緯度: 34.6949, 経度: 135.489 },
        { 駅: '福島', 緯度: 34.6, 経度: 135.6 },
      ],
    }
    const 南の福島駅前 = 施設({ 緯度: 34.6, 経度: 135.6, 最寄駅: [{ 駅: '福島駅', 駅徒歩: 3 }] })
    const warnings = validate([{ file: 'concerthall', records: [南の福島駅前] }], {
      stationMaster: 同名マスタ,
    }).warnings
    expect(warnings.map(w => w.kind)).not.toContain('駅までの距離が実際より近く書かれている')
  })
})

// YAML の書き損じは値そのものより「形」を間違えることが多い。
// 配列で書くべき所をスカラで書く、マッピングを文字列で書く、といった崩し方を通す
describe('型そのものが違う書き方', () => {
  it('貸館をマッピング以外で書いたらエラー', () => {
    expectOneError(施設({ 貸館: '休止' }), /貸館 はマッピングで書いてください/)
  })

  it('利用条件をマッピング以外で書いたらエラー', () => {
    expectOneError(施設({ 利用条件: '要紹介' }), /利用条件 はマッピングで書いてください/)
  })

  it('座標が数値でなければエラー', () => {
    expectOneError(施設({ 緯度: '34.68' }), /座標が数値ではありません/)
  })

  it('部屋を配列以外で書いたらエラー', () => {
    expectOneError(施設({ 部屋: '大ホール' }), /部屋 は配列で書いてください/)
  })

  it('出典を配列以外で書いたらエラー', () => {
    expectOneError(施設({ 出典: 'https://example.com' }), /出典 は配列で書いてください/)
  })

  it('出典の項目を配列以外で書いたらエラー', () => {
    const 出典 = [{ URL: 'https://example.com', 確認日: '2025-06-02', 項目: '客席数' }]
    expectOneError(施設({ 出典 }), /項目 は配列で書いてください/)
  })

  it('出典のURLが形式を満たさなければエラー', () => {
    const 出典 = [{ URL: 'example.com/hall', 確認日: '2025-06-02' }]
    expectOneError(施設({ 出典 }), /出典\[0\] の URL がURLの形式ではありません/)
  })

  it('楽器制限を文字列以外で書いたらエラー', () => {
    expectOneError(部屋付き({ 楽器制限: true }), /楽器制限 は文字列で書いてください/)
  })
})

// 備品は部屋にも施設にも書ける。受付で申し込む貸出備品として持つ施設があるため、
// 施設レベルでも部屋レベルと同じ検査が要る
describe('施設レベルの備品', () => {
  it('譜面台数が正の数でなければエラー', () => {
    expectOneError(施設({ 譜面台数: 0 }), /譜面台数 が正の数ではありません/)
  })

  it('譜面台数があるのに貸出が false ならエラー', () => {
    expectOneError(施設({ 譜面台数: 5, 譜面台貸出: false }), /譜面台貸出 が false/)
  })

  it('有無と本数が揃っていれば通る', () => {
    expect(errorsOf(施設({ 譜面台数: 5, 譜面台貸出: true }))).toEqual([])
  })
})

describe('report', () => {
  const silence = () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  }

  it('エラーがあれば true を返す（ビルドを止める）', () => {
    silence()
    expect(report({ errors: ['なにかの誤り'], warnings: [] })).toBe(true)
  })

  // 警告はビルドを止めない
  it('警告だけなら false を返す', () => {
    silence()
    expect(report({ errors: [], warnings: [{ kind: '出典が未記録', detail: '' }] })).toBe(false)
  })

  it('同種の警告は件数にまとめ、全件は --verbose のときだけ出す', () => {
    silence()
    const warnings = Array.from({ length: 10 }, (_, i) => ({
      kind: '出典が未記録',
      detail: `施設${i}`,
    }))
    report({ errors: [], warnings })
    const summary = console.warn.mock.calls.map(c => c[0]).join('\n')
    expect(summary).toMatch(/出典が未記録: 10件/)
    expect(summary).toMatch(/ほか 7件/)

    vi.clearAllMocks()
    report({ errors: [], warnings }, { verbose: true })
    expect(console.warn.mock.calls.map(c => c[0]).join('\n')).not.toMatch(/ほか/)
  })

  // 百件並ぶ種類を先に出すと、対処すべき数件が画面の外へ流れてしまう
  it('件数の少ない種類から先に出す', () => {
    silence()
    const warnings = [
      ...Array.from({ length: 5 }, () => ({ kind: '出典が未記録', detail: '' })),
      { kind: '部屋が未登録', detail: '' },
    ]
    report({ errors: [], warnings })
    const lines = console.warn.mock.calls.map(c => c[0])
    const 順 = lines.filter(l => /: \d+件$/.test(l)).map(l => l.trim())
    expect(順).toEqual(['部屋が未登録: 1件', '出典が未記録: 5件'])
  })
})
