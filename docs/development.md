# 開発

コマンドと開発環境。作業の入口は [CLAUDE.md](../CLAUDE.md)（索引）。

**スキーマと記述ルールは [data-schema.md](./data-schema.md)、構成は [architecture.md](./architecture.md) にある。**

```bash
npm install        # 依存関係インストール
npm run dev        # 開発サーバー起動
npm run build      # 本番ビルド（YAML→JSON変換 + Viteビルド + URLごとの静的HTML・sitemap）
npm run preview    # ビルド結果のプレビュー
npm run data       # YAML→JSON変換だけを実行（データ検査もここで走る）

npm run check      # データ生成 → lint → 型チェック → 整形チェック → テスト（カバレッジ付き）
                   # → 本番ビルド → dist の検品 → ブラウザでのスモーク を一括。CI と同じ内容。
                   # **ビルドまで含めるのは、tsc が通っても vite build は別に落ちうるため**
                   # （JSONの読み込み・動的import）。入れる前はローカル緑・CI赤になりえた
npm run check:dist # 出来た dist を vite preview で実際に配って検品する（→ deployment.md）
npm run test:e2e   # 出来た dist を実際のブラウザで開くスモークテスト（要 npm run build）。
                   # 初回は `npx playwright install chromium` でブラウザを入れる
npm run lint       # ESLintによるコードチェック（src と scripts/*.mjs の両方）
npm run typecheck  # 型チェック。中身は `tsc -b --noEmit`（tsconfig.json は files:[] +
                   # references なので `tsc --noEmit` は1ファイルも検査しない。-b が要る）
npm test           # Vitest。`npm run test:watch` で監視実行
npm run test:coverage # カバレッジ計測（V8）。HTML は coverage/index.html
npm run format     # Prettier で整形。`npm run format:check` は確認のみ

node scripts/build-data.mjs --verbose  # データ検査の警告を全件表示
node scripts/build-data.mjs --coverage # 項目別の調査カバレッジと確認日の鮮度を表で出す
node scripts/audit-coordinates.mjs     # 座標を国土地理院のジオコーディングで検算（随時）
node scripts/audit-urls.mjs            # 登録URLの生死と「別サイトへの転用」を検査（月次CIでも回る）
node scripts/audit-freshness.mjs       # 確認から1年を超えた施設と出典の無い施設を出す（月次CIでも回る）
```

**型チェックとテストの前には `npm run data` が要る**。`src/data/*.json` は `.gitignore` 済みで、
`src/datasets/*.ts` がそれを import しているため、生成前は型チェックが落ちる。
`npm run check` は先頭で `npm run data` を回すので、クローン直後でもそのまま通る
（CI も `npm run data` を型チェックより前に置いている）。

データ検査（`scripts/validate.mjs`）はビルド前に自動実行される。
**エラーがあるとビルドは停止する**。警告は種類ごとに集約して表示され、ビルドは続行する。

**検査が見るのは「書かれている値が正しいか」だけで、書かれていないことは何も言わない。**
設備の3値は未調査をキーの省略で表すので、黙っていると「調べていない」と「無い」の区別が
数の上で見えない。項目別の埋まり具合は `scripts/coverage.mjs` が数え、`npm run data` が
1行の要約を、`--coverage` が項目別の表を出す。未調査の多い項目はそのまま
**使えない絞り込み**になる。
`--coverage` は concerthall の部屋を**ホール（一覧に出る部屋）と併設練習室に分けて**数える
（練習室に客席数を問うても埋まらない。まとめて数えていたころは、一覧のホールでは
ほとんど埋まっている客席数が、半分ほどしか埋まっていないように見えていた）。
**空欄は「未調査」と「公式に記載なし」（`出典[].記載なし`）に分けて出す。** 手を入れるべきは未調査で、
記載なしは公式を読み直しても埋まらない。`npm run data` の1行要約も未調査の多い項目を挙げる。
**件数そのものは文章に書かない**——データは増えるので、`npm run data` の要約と
`--coverage` の表（いつでも実データを数えている）を見ること

## 開発環境

- **Node は 22 系**（`.nvmrc` / `package.json` の `engines`）。CI は `.nvmrc` を見る
- **CI**（`.github/workflows/ci.yml`）は **PR で** `npm run check` 相当を回す
  （**main への push は `deploy.yml` が同じ検査を回してから配信する**ので、ここでは見ない。
  両方で回すと同じコミットに同じジョブが2本走る。→ deployment.md）
  （`permissions: contents: read` と `concurrency` を明示してある）。
  依存と actions の更新は Dependabot（`.github/dependabot.yml`）が月次で出す。
  **束ねるのは minor と patch だけで、major は1件ずつ来る**（eslint 一族だけは対で上がるので束ねる）。
  major を混ぜていたころ、`typescript` 6→7 が `typescript-eslint` のピア依存に弾かれて
  `npm ci` の段階で落ち、TSと無関係な8件まで道連れになった。
  **`typescript` と `@types/node` の major は ignore してある**（前者は typescript-eslint が
  TS 7 に対応するまで、後者は Node 22 に型を合わせるため）
- **月次のリンク検査**（`.github/workflows/audit-urls.yml`）が毎月1日に `audit-urls.mjs` を回し、
  結果を Issue にまとめる（題名が `リンク切れ検査:` で始まる Issue を**使い回して更新**する。
  毎月新しく立てると同じ施設の話が何本も並んで追えなくなる。全件正常になれば自動で閉じる。
  探索は `github.paginate` で全ページ見る——1ページ目だけだと Issue が100件を超えたときに
  見つけ損ね、使い回すはずが毎月新しく立ってしまう）。
  外部アクセスを伴うので `ci.yml` には入れない
- **月次の鮮度検査**（`.github/workflows/audit-freshness.yml`）が毎月1日に
  `audit-freshness.mjs` を回し、確認から1年を超えた施設と出典の無い施設を Issue にまとめる
  （題名が `確認日の鮮度:` で始まる Issue を使い回す。全件新しくなれば自動で閉じる）。
  **リンク検査が見つけるのは「開かなくなったURL」だけ**で、開くけれど中身が変わった施設
  （休館・移転・貸館終了・料金改定）は見つからないため、別に要る。
  外部アクセスはしないが、ビルドを止める類のものでもないので `ci.yml` には入れない
- 動いている GitHub Actions はこの3つと、main への push で**検品してから**配信する
  `deploy.yml`（→ [deployment.md](./deployment.md)）
- **Prettier の対象はコードだけ**。`data/` のYAMLと `*.md` は `.prettierignore` で除外している
  （YAMLは桁を揃えたコメントや引用符の使い分けに意味があるため）。
  コード側でも桁揃えを保ちたい箇所には `// prettier-ignore` を置く（`validate.mjs` の `PREF_BOX`）
- **本番ビルドのスモークテストは Playwright**（`e2e/smoke.spec.ts` / `playwright.config.ts`）。
  `vite preview` で `dist/` を配り、実際のブラウザで一覧・詳細・直リンク・地図・404を開く。
  **`check-dist.mjs` が見るのは200と `<head>`・noscript・入口の大きさまで**で、
  中身をアプリが描けるかは見ていない。jsdom のスモークテストはソースを読むので、
  **本番ビルドでしか出ない壊れ方**（動的 import の解決、地図ワーカーのURL、CSSの読み込み順）は
  どちらも素通りしていた。ここでも見るのは導線だけで、見た目は対象にしない
- **テストは純粋関数と、ルーティングのスモークテスト**（`src/App.test.tsx`）。
  `vitest.config.ts` の既定は `environment: 'node'` のままで、DOM が要るのは
  スモークテストだけなので、そのファイルの先頭で `// @vitest-environment jsdom` を宣言している
  （全テストを jsdom で動かすと純粋関数のテストまで遅くなる）。JSX は Vite（oxc）の
  既定の変換で通るので React プラグインは足していない。
  **スモークテストが見るのは導線の有無だけ**で、見た目は対象にしない。
  一覧から詳細へのリンクとヘッダーの練習場リンクが揃って抜けていたことがあり、
  この類の欠落は型チェックも lint も通ってしまうため。
  **絞り込みと並び替えは純粋関数（`src/concerthall.ts` / `src/practice.ts`）に
  切り出してあり、条件ごとの挙動はそちらでテストする。**
  スモークテストの側で見るのは「押せること」と「押した結果が一覧に反映されること」まで
- **カバレッジの `include` は src と scripts の全体**。テストから読み込まれなかったファイルも
  0% として数える（分母から外すと「測っていない範囲」が数字から消えて実態より良く見えるため）。
  そのため全体の数字は追わない。**追うのは全体値ではなく、テスト対象モジュール
  （`transform` / `validate` / `coverage` / `static-pages` / `url-audit` / `station` / `availability` /
  `address` / `name` / `rental` / `concerthall` / `practice` / `filter` / `options` / `query` / `sort` /
  `toggle` / `title` / `mapStyle`）が
  4指標とも100%であること**。これは `vitest.config.ts` の `thresholds` で固定してあり、
  下回ると `npm run check` と CI が落ちる（文章で書いてあるだけでは気づかないうちに落ちていく）。
  **しきい値は `--coverage` のときしか効かない**ので、`check` と CI は `test:coverage` を回す。
  `datasets/facility.ts` を対象にしていないのは、`import.meta.glob` が施設の数だけ
  動的 import の関数を作るためで、100%にするには全施設を読むしかない
  ページとコンポーネントの数字はスモークテストが通りがかりに
  踏んだ結果で、**その値を上げにいかない**（導線以外を見ないテストなので、数字を追うと
  スモークテストの目的から外れる）。外部アクセスを伴う監査スクリプト
  （`audit-coordinates` / `audit-urls`）は未着手で0%
  （`audit-urls` の判定そのものは `url-audit.mjs` に出してテストしてある）。
  なお text レポーターは全項目100%のファイルを表から省く（`skipFull` とは無関係）。
  一覧は `coverage/index.html` か `coverage-summary.json` を見る

## その他

- `src/data/` 以下のJSONはビルド成果物なので `.gitignore` 済み
- YAMLからJSONへの変換は `npm run dev` / `npm run build` の前処理として自動実行される
- `concerthall.yaml` の `築年月` は `YYYY-MM` 形式で記述する（Excelシリアル値は変換済み）
- 同一施設の複数ホールは `部屋:` 配列に入れる。`build-data.mjs` が平坦化した「1行 = 1ホール」を
  そのまま使うのは表だけで、**リストのカードは1施設1枚**（`concerthall.ts` の `groupByFacility`。
  複数ホールの施設は `HallStats` がホール名を添えた数値をホールの数だけ重ねる）、地図のピンも施設ごとに1本。
  絞り込み・並び替えはホール単位で行い、束ねるのは最後（条件に合わないホールはカードに出ない）
- スキーマの設計方針と未対応の課題は `docs/schema-review.md`（コミット対象外）で管理している
- **表計算との相互変換（`sheet:export` / `sheet:import`）は廃止した。** 列定義が旧スキーマのまま
  止まっており（`分類`・`舞台高さ` が残り、コンサートホールは `部屋` 配列を持たず施設行に
  `部屋名`/`客席数` が直付け）、取り込みは YAML を丸ごと上書きする作りだった。
  **出典・貸館・利用条件・施設名かな・ホール種別などは列に無いので、手順どおり往復させると消える。**
  書き出し側も既存の xlsx を読んでから更新する作りで、その xlsx は `.gitignore` 済みだったため
  クローン直後は動かなかった。表形式で見比べたくなったら、**現行スキーマから作り直し、
  「YAML→xlsx→YAML が同値」の往復テストと対で入れること**（往復テストの無い変換は必ず腐る）
