# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**このファイルは索引。** 詳細は `docs/` に分けてある。
以前はスキーマ・構成・デザイン・配信の全部がここに入って600行あり、
外部の寄稿者にも「スキーマの正は CLAUDE.md」と案内していた
（AI向けの名前のファイルが人間向けの仕様書でもある、という分かりにくさがあった）。

| 読むもの | 中身 |
| --- | --- |
| [docs/data-schema.md](./docs/data-schema.md) | **施設データのスキーマと記述ルール**（YAMLを触るならここが正） |
| [docs/architecture.md](./docs/architecture.md) | データの流れ・一覧の状態の置き場所・ディレクトリの役割 |
| [docs/development.md](./docs/development.md) | コマンド・開発環境・CI・テストとカバレッジの方針 |
| [docs/design.md](./docs/design.md) | 色・フォント・スタイルの書き方 |
| [docs/deployment.md](./docs/deployment.md) | GitHub Pages への配信・URLごとの静的HTML |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 施設データを送る人向けの手順 |

## Project Overview

関西地方の音楽施設（Music Facility Directory）情報を閲覧できる静的Webサービス。バックエンドなし。

## Tech Stack

- **Vite** — ビルドツール
- **React + TypeScript** — UIフレームワーク
- **素のCSS** — スタイリング（`src/styles/` のグローバルCSS。CSSフレームワークは使わない）
- **React Router v7** — クライアントサイドルーティング（`basename="/"`）
- **MapLibre GL JS + OpenStreetMap のベクトルタイル**（OSMF 配信の Shortbread）— 地図表示
- **js-yaml** — YAML→JSON変換（ビルドスクリプト内で使用）。
  **5系は既定エクスポートを持たない**ので `import * as yaml from 'js-yaml'` と書く
  （`import yaml from` だと `yaml` が undefined になり、lint も型チェックも通ったまま実行時に落ちる）
- **Playwright** — 本番ビルドのスモークテスト（`e2e/`）

## Commands

```bash
npm run dev        # 開発サーバー（前処理で YAML→JSON 変換が走る）
npm run data       # YAML→JSON変換だけを実行（データ検査もここで走る）
npm run check      # CI と同じ一式：データ生成 → lint → 型 → 整形 → テスト →
                   # ビルド → dist の検品 → ブラウザでのスモーク
npm run build      # 本番ビルド（YAML→JSON + Vite + URLごとの静的HTML・sitemap）
```

**一覧と、監査スクリプトを含めた全コマンドは [docs/development.md](./docs/development.md)。**
`npm run check` の中身と、それぞれが何を止めるのかもそちらにある。

## 踏み外しやすい前提

作業前にこれだけは頭に入れる。理由と例外は各ドキュメントにある。

- **1レコード = 1施設。** 同じ施設の複数のホール・練習室は行を分けず `部屋:` 配列に入れる
  （→ [data-schema.md](./docs/data-schema.md)）
- **設備の3値。** `true`＝あり、`false`＝なし、**キーごと省略＝未調査**。
  「調べていない」を `false` と書かない。**未調査は「無い」ではない**という扱いは
  boolean 以外の項目（客席数・定員・徒歩分数）にも及び、絞り込みでは
  「合わない」ではなく「判断できない」として数え、件数を利用者に開示する（→ `src/filter.ts`）
- **ID は一度振ったら変更しない。** `/concert/:id` `/practice/:id` としてURLに使う
- **一覧の状態は `useState` ではなくURLが持つ**（→ [architecture.md](./docs/architecture.md)）
- **スタイルは `src/styles/` のCSSにしか書かない。** インライン `style` もユーティリティクラスも使わない
  （→ [design.md](./docs/design.md)）
- **`src/data/` はビルド生成物**（`.gitignore` 済み）。**正は `data/facilities/` のYAML**
- スキーマの設計方針と未対応の課題は `docs/schema-review.md`（コミット対象外）で管理している
