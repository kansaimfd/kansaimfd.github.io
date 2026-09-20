# 配信

GitHub Pages への配信と、URLごとの静的HTML。作業の入口は [CLAUDE.md](../CLAUDE.md)（索引）。

**main への push で GitHub Pages に配信される**（https://kansaimfd.github.io/）。
`.github/workflows/deploy.yml` が `npm run check` を通してから `dist/` を Pages に上げる。
Pages のソースは **GitHub Actions**（`build_type: workflow`）で、ブランチを直に配っているのではない。

**配る前に検品する。** 以前ここは `npm run build` だけで、`ci.yml` は push で独立に走っていたため、
**`npm run check` が落ちている main でもそのまま配信されえた**（「壊したまま push しない」という
規律だけが止めていた）。いまは deploy.yml 自身がデータ生成 → lint → 型 → 整形 → テスト →
ビルド → dist の検品 → ブラウザでのスモークまでを回し、**通った dist だけが上がる**。
落ちれば配信はされず、main には前の版が残る。
そのぶん main への push では `ci.yml` を走らせない（同じ検査が2本走るため。→ development.md）。

**2026-09-20 まで停止していた**（private 化・GitHub Pages の無効化・ワークフローの手動停止）。
public に戻し、Pages を有効化し、`gh workflow enable "Deploy to GitHub Pages"` で再開した。
このとき**全コミットの著者・コミッタのメールを GitHub の noreply に書き換えている**
（public にすると個人のアドレスが誰でも読めるため）。**このリポジトリの `git config user.email` は
noreply にしてある**（このマシンの global も同じ値に変えてある）。

**このときリポジトリごと作り直している。** 履歴を書き換えて force push しても、GitHub は
閉じた PR の `refs/pull/*` を恒久的に保持するので、そこから親をたどると旧メールのコミットに
届いてしまう（force push でも `git gc` でも消えない）。そのため新しい
`kansaimfd/kansaimfd.github.io` を作って書き換え済みの履歴だけを push した。
**Actions の実行履歴と過去の PR がこの日より前に遡れないのはそのため。**
旧リポジトリは `kansaimfd/kansaimfd.github.io-archive` として private で残してある
（Pages 解除・Actions 停止済み）。**既定ブランチは作り直しに合わせて `master` から `main` にした。**

- リポジトリ名が `kansaimfd/kansaimfd.github.io` なので **User Pages となり、
  https://kansaimfd.github.io/ のルートで配信される**（プロジェクトページのようなサブパスは付かない）。
  そのため `vite.config.ts` の `base` と React Router の `basename` はともに **`/`**。
  配信先を変えない限り、**この2つは触らないこと**
- **URLごとの静的HTMLはビルドが書き出す**（`scripts/build-static-pages.mjs`）。
  GitHub Pages は SPA のルーティングを知らないので、以前は `index.html` を `404.html` に写して
  直リンクを表示させていたが、**HTTPステータスが404のまま**で検索エンジンには「無いページ」だった。
  いまは `dist/concert/10.html` のように施設ごとのファイルがあり、静的配信のまま200で返る。
  - 中身（`<body>`）は `index.html` のままで、差し替えるのは `<head>` だけ
    （題名・説明・canonical・OGP・`MusicVenue`／`Place` の構造化データ）。表示はこれまでどおりアプリが描く
  - `/concert/10` → `concert/10.html` は、拡張子を省いたURLに `.html` を当てる配信側の挙動に頼っている
    （GitHub Pages・Cloudflare Pages・`vite preview` はそうする）。一覧（`/concert`）は同名のディレクトリと
    並ぶので `concert.html` と `concert/index.html` の両方に書いてある。
    **ローカルの preview で全URLが200で返ることは `npm run check:dist` が毎回確かめている**
    （`scripts/check-dist.mjs`。CI でも回る）。**ただし確かめているのは preview の挙動であって、
    GitHub Pages の挙動ではない**。再開時（2026-09-20）に本番でも全URLが200・題名と canonical が
    ページごとに違うこと・存在しないURLが noindex の404で返ることを確かめた
  - `404.html` もビルドが書く（`noindex`、canonical なし）。存在しないURLは従来どおりアプリの「見つかりません」を出す
  - 絶対URLは `static-pages.mjs` の `SITE_URL`（`https://kansaimfd.github.io`）と `public/robots.txt` にある。
    **配信先を変えるならこの2か所を直す**
  - 題名の規則は `src/title.ts` と二重に持っている（.mjs から .ts を読めないため）。一致はテストで確かめている
  - **OGP 画像は全ページ共通の1枚**（`public/ogp.png`、1200×630）。原稿は `design/ogp/ogp.html` で、
    dev サーバーで `/design/ogp/ogp.html` を開いてスクリーンショットを撮れば作り直せる
    （`file://` では Google Fonts が効かないので dev サーバー経由で開く）。
    **窓を 1200×630 ちょうどにすると下端の府県の帯（92px）が落ちる**ことがあるので、
    広めに開いて 1200×630 に切り出す。並べる府県は `static-pages.mjs` の `DESCRIBED_PREFS` と合わせる。
    **画像は CSS 変数を読めないので、`tokens.css` の色やロゴを変えたら原稿を合わせて PNG を作り直す**。
    施設ごとの画像は作らない（施設名はカードの題名に出る。ビルドに日本語フォントと画像生成を抱えるほどの得が無い）
- **残っている手当て**: Search Console に sitemap を登録し、
  X・Facebook の確認ツールでカードの見え方を確かめる（どちらも未着手）
