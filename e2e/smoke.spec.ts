import { test, expect, type Page } from '@playwright/test'

/**
 * 本番ビルドの成果物を実際のブラウザで開くスモークテスト（→ playwright.config.ts）。
 *
 * **捕まえたいのは「ビルドは通ったが、開くと何も出ない」類の壊れ方。**
 * ルートも詳細データも地図も動的 import なので、取得に失敗すれば画面は
 * 白紙（か「読み込みに失敗しました」）になるが、型チェックも単体テストも通る。
 *
 * 見るのは導線だけで、見た目・文言・絞り込みの挙動は対象にしない
 * （それぞれ `src/App.test.tsx` と純粋関数のテストが見ている）。
 */

/** 開いているあいだに出たコンソールエラーとページ例外を集める */
function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', e => errors.push(e.message))
  return errors
}

test('コンサートホール一覧が描ける', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/concert')

  await expect(page.getByRole('heading', { name: 'コンサートホール一覧', level: 1 })).toBeVisible()
  // カードが1枚も無ければ、一覧のJSONが届いていない
  await expect(page.locator('.facility-card').first()).toBeVisible()
  expect(await page.locator('.facility-card').count()).toBeGreaterThan(10)
  expect(errors).toEqual([])
})

test('一覧から施設の詳細ページへ行ける', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/concert')

  const firstCard = page.locator('.facility-card').first()
  const name = await firstCard.locator('.facility-card__name').innerText()
  await firstCard.locator('.facility-card__name').click()

  // 施設1件ぶんのJSONは動的に読む。届かなければ見出しが出ない
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
  await expect(page).toHaveTitle(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  expect(errors).toEqual([])
})

/**
 * 施設ページへの直リンク。**URLごとの静的HTMLが200で返り、そこからアプリが立ち上がる**
 * （`check-dist.mjs` が見ているのは200と `<head>` までで、その先は見ていない）
 */
test('施設ページを直接開ける', async ({ page }) => {
  const errors = collectErrors(page)
  const response = await page.goto('/concert/10')

  expect(response?.status()).toBe(200)
  await expect(page.locator('.detail-head__title')).toBeVisible()
  expect(errors).toEqual([])
})

/**
 * 練習場側。**一覧も詳細もコンサートホールとは別のチャンク**なので、片方が
 * 届かなくなってもここを踏まなければ気づけない（ルートも詳細データも動的 import で、
 * check-dist.mjs が見ているのは200と <head> まで）。
 * 実際このスモークは6回とも /concert 系を開いていて、練習場は本番ビルドで
 * 一度も開かれていなかった。
 */
test('練習場一覧が描ける', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/practice')

  await expect(page.getByRole('heading', { name: '練習場一覧', level: 1 })).toBeVisible()
  await expect(page.locator('.facility-card').first()).toBeVisible()
  expect(await page.locator('.facility-card').count()).toBeGreaterThan(10)
  expect(errors).toEqual([])
})

/**
 * 一覧から詳細へ。**行き先は2種類ある**——練習場一覧には、コンサートホール施設に
 * 併設された練習室も並び、そちらのカードは /concert/:id を指す（→ practiceDetailPath）。
 * どちらに当たっても、押した施設の見出しが出ることを見る
 */
test('練習場一覧から施設の詳細ページへ行ける', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/practice')

  const firstCard = page.locator('.facility-card').first()
  const name = await firstCard.locator('.facility-card__name').innerText()
  await firstCard.locator('.facility-card__name').click()

  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
  expect(errors).toEqual([])
})

/** 練習場ページへの直リンク。URLごとの静的HTMLは練習場ぶんも書き出している */
test('練習場ページを直接開ける', async ({ page }) => {
  const errors = collectErrors(page)
  const response = await page.goto('/practice/10')

  expect(response?.status()).toBe(200)
  await expect(page.locator('.detail-head__title')).toBeVisible()
  expect(errors).toEqual([])
})

/**
 * 地図。maplibre-gl は**バンドラを通したときにワーカーのURLが解決できず**、
 * 開発では動いても本番ビルドでだけ落ちうる（createMap.ts の worker&url がそれ）。
 * WebGL が要るので、ここでしか確かめられない。
 */
test('地図表示に切り替えると地図が出る', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/concert?view=map')

  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible()
  expect(errors).toEqual([])
})

/**
 * 知らないURL。**HTTPステータスはここでは見ない**——`404.html` を返すのは配信側の仕事で、
 * `vite preview` は SPA のフォールバックとして 200 で index.html を返す
 * （`404.html` 自体の中身は `check-dist.mjs` がファイルとして確かめている）。
 * ここで見るのは、受け皿があって案内が描かれること
 */
test('知らないURLには案内を出す', async ({ page }) => {
  await page.goto('/concert/999999999')
  await expect(page.getByText('施設が見つかりません')).toBeVisible()

  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { name: 'ページが見つかりません' })).toBeVisible()
})
