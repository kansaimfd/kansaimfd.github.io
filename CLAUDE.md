# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

関西地方の音楽施設（Music Facility Directory）情報を閲覧できる静的Webサービス。バックエンドなし。

## Tech Stack

- **Vite** — ビルドツール
- **React + TypeScript** — UIフレームワーク
- **Tailwind CSS v4** — スタイリング（`@tailwindcss/vite` プラグイン経由）
- **React Router v7** — クライアントサイドルーティング（`basename="/kansai-mfd/"`）
- **Leaflet + react-leaflet + OpenStreetMap** — 地図表示
- **js-yaml** — YAML→JSON変換（ビルドスクリプト内で使用）

## Commands

```bash
npm install        # 依存関係インストール
npm run dev        # 開発サーバー起動
npm run build      # 本番ビルド（YAML→JSON変換 + Viteビルド）
npm run preview    # ビルド結果のプレビュー
npm run lint       # ESLintによるコードチェック
```

## Architecture

### Data Flow

YAML（正規化・人間が編集）を、UIが消費しやすい非正規化JSONへビルド時に変換する。

```
data/facilities/concerthall.yaml          data/facilities/practice.yaml
  1レコード = 1施設（部屋[] を内包）        1レコード = 1施設（部屋[] を内包）
        ↓ (scripts/build-data.mjs)               ↓
src/data/concerthallFacilities.json       src/data/practices.json
  施設単位（詳細ページ用）                   施設単位
src/data/concerthalls.json
  施設 × ホール に平坦化（一覧・地図用）
        ↓ (src/data.ts でimport)
React コンポーネント
```

**重要**: YAMLは常に「1レコード = 1施設」で書く。同一施設に複数のホール／練習室がある場合は
行を分けず `部屋:` 配列に入れる。住所・URL・最寄駅などの施設属性を複製しないため。
一覧表示に必要な「1行 = 1ホール」の形は `build-data.mjs` が派生生成する。

### Key Directories

- `data/facilities/` — 施設データのYAMLファイル群
- `scripts/build-data.mjs` — YAML→JSON変換スクリプト
- `src/data/` — 変換後JSONの出力先（`.gitignore` 済み）
- `src/types.ts` — `ConcertHallFacility` / `ConcertHall` / `Practice` 型定義
- `src/data.ts` — JSONデータの読み込みと型付け
- `src/station.ts` — 最寄駅の表記・徒歩分数まわりの共通ヘルパー
- `src/components/` — 共通UIコンポーネント
- `src/pages/` — ページ単位のコンポーネント

### Data Schema (YAML)

施設データは日本語キーのYAMLリスト形式で記述する。ファイルは `data/facilities/` 以下に用途別で管理する。
**1レコード = 1施設**（コンサートホール・練習場とも同じモデル）。

**共通フィールド（両YAMLファイル）:**

```yaml
- ID: number                   # 必須（URLに使用: /concert/:id, /practice/:id）
  施設名: string               # 必須
  都道府県: string             # 必須 例: 大阪府, 京都府, 兵庫県 など
  市区町村: string             # 必須（政令市は区まで含める 例: 神戸市中央区）
  番地以下: string             # 必須
  分類: string                 # 任意
  URL: string                  # 任意
  申込URL: string              # 任意
  料金URL: string              # 任意
  最寄駅:                      # 任意（配列）
    - 路線: [string, ...]      # 任意。同一駅に複数路線が乗り入れる場合は並べる
      駅: string               # 必須
      出口: string             # 任意 例: ⑥号出口, 南改札口
      駅徒歩: number           # 任意（分）公式が徒歩分数で書いている場合
      駅距離: number           # 任意（m・道路距離）公式が距離で書いている場合
  出典:                        # 任意（配列）
    - URL: string              # 必須（値の裏が取れたページ）
      確認日: 'YYYY-MM-DD'     # 必須（クォート付き）
      項目: [string, ...]      # 任意。このURLで裏が取れたフィールド名
      備考: string             # 任意。確認できなかった点・不確かな点
  経度: number                 # 必須
  緯度: number                 # 必須
```

**`concerthall.yaml`（コンサートホール）固有フィールド:**

```yaml
  築年月: string               # 任意（YYYY-MM形式 例: 1995-04）
  駐車場: number               # 任意（台数）
  部屋:                        # 任意（配列）＝施設内の各ホール
    - 部屋名: string           # 任意（単一ホールの施設では省略可）
      客席数: number           # 任意
      舞台幅: number           # 任意（m）
      舞台奥行: number         # 任意（m）
      舞台高さ: number         # 任意（m）
      ピアノ有無: boolean      # 任意
      パイプオルガン: boolean  # 任意
      譜面台貸出: boolean      # 任意
      親子室: boolean          # 任意
```

**`practice.yaml`（練習場）固有フィールド:**

```yaml
  TEL: string                  # 任意
  開館時間: string             # 任意（"HH:MM" 24時間表記 例: "09:00"）
  閉館時間: string             # 任意（"HH:MM" 例: "22:00"）
  休館日: string               # 任意
  部屋:                        # 任意（配列）
    - 部屋名: string
      面積: number             # 任意（㎡）
      定員: number             # 任意（人）
      ピアノ有無: boolean      # 任意
  ピアノ有無: boolean          # 任意（部屋レベルで管理する場合は省略可）
```

### 記述ルール

- **設備の3値**: `true`＝あり、`false`＝なし、**キーごと省略＝未調査**。
  `false` を「未調査」の意味で使わない。混同すると、実際には設備がある施設が絞り込みから消える。
  `〇` / `×` を書くと `build-data.mjs` がビルドを止める
- **出典**: 値の裏を取ったURLと確認日を必ず残す。LLMによる自動収集は誤りを含むため、
  出典のないデータは未検証として扱う（詳細ページに「出典・確認日は未記録です」と表示される）
- **時刻**: `"HH:MM"` の24時間表記・ゼロ埋め・クォート付き
- **駅徒歩 / 駅距離**: 公式サイトに書いてある方だけを書く（両方あれば両方）。
  `駅距離` のみの場合、`build-data.mjs` が **道路距離80m＝徒歩1分・端数切り上げ**
  （不動産の表示に関する公正競争規約に準拠）で `駅徒歩` を補完し、`駅徒歩推定: true` を付ける。
  逆方向（徒歩→距離）の補完は行わない
- **駅距離は道路距離**であって直線距離ではない
- **ID**: 一度振ったら変更しない。欠番があってよく、並び順に意味を持たせない（URLに使われるため）

## Design

- **カラー**: ネイビー（`#1B2E4B`）＋ゴールド（`#B8962E`）＋クリーム背景（`#F8F6F0`）
- **フォント**: 見出しに Noto Serif JP（クラシカル感）、本文に Noto Sans JP
- **テーマ**: クラシック音楽・オーケストラ・親しみやすい・モダン

## Deployment

GitHub Pages にデプロイ（リポジトリ名 `kansai-mfd`）。`vite.config.ts` の `base` と React Router の `basename` はともに `/kansai-mfd/` に設定済み。

## Notes

- `src/data/` 以下のJSONはビルド成果物なので `.gitignore` 済み
- YAMLからJSONへの変換は `npm run dev` / `npm run build` の前処理として自動実行される
- `concerthall.yaml` の `築年月` は `YYYY-MM` 形式で記述する（Excelシリアル値は変換済み）
- 同一施設の複数ホールは `部屋:` 配列に入れる。一覧では `build-data.mjs` が平坦化した別エントリとして表示される
- スキーマの設計方針と未対応の課題は `docs/schema-review.md`（コミット対象外）で管理している
