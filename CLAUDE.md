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

```
data/facilities/concerthall.yaml  data/facilities/facilities.yaml
        ↓ (scripts/build-data.mjs)
src/data/concerthalls.json        src/data/practices.json
        ↓ (src/data.ts でimport)
React コンポーネント
```

### Key Directories

- `data/facilities/` — 施設データのYAMLファイル群
- `scripts/build-data.mjs` — YAML→JSON変換スクリプト
- `src/data/` — 変換後JSONの出力先（`.gitignore` 済み）
- `src/types.ts` — `ConcertHall` / `Practice` 型定義
- `src/data.ts` — JSONデータの読み込みと型付け
- `src/components/` — 共通UIコンポーネント
- `src/pages/` — ページ単位のコンポーネント

### Data Schema (YAML)

施設データは日本語キーのYAMLリスト形式で記述する。ファイルは `data/facilities/` 以下に分類別で管理する。

**共通フィールド:**

```yaml
- ID: number                   # 必須（URLに使用: /concert/:id, /practice/:id）
  施設名: string               # 必須
  都道府県: string             # 必須 例: 大阪府, 京都府, 兵庫県 など
  市区町村: string             # 必須
  番地以下: string             # 必須
  URL: string                  # 任意
  分類: string                 # 任意 例: アンサンブル用, コンサートホール
  最寄駅: string               # 任意
  最寄駅徒歩: number           # 任意（分）
  ピアノ有無: 〇 | ×           # 任意
  経度: number                 # 必須
  緯度: number                 # 必須
```

**`concerthall.yaml`（コンサートホール）固有フィールド:**

```yaml
  部屋名: string               # 任意（同一施設の複数ホール区別用）
  申込URL: string              # 任意
  料金URL: string              # 任意
  築年月: string               # 任意（YYYY-MM形式 例: 1995-04）
  最寄駅路線: string           # 任意
  舞台高さ: number             # 任意（m）
  舞台奥行: number             # 任意（m）
  舞台幅: number               # 任意（m）
  客席数: number               # 任意
  駐車場: number               # 任意（台数）
  パイプオルガン: 〇 | ×       # 任意
  譜面台貸出: 〇 | ×           # 任意
  親子室: 〇 | ×               # 任意
```

## Design

- **カラー**: ネイビー（`#1B2E4B`）＋ゴールド（`#B8962E`）＋クリーム背景（`#F8F6F0`）
- **フォント**: 見出しに Noto Serif JP（クラシカル感）、本文に Noto Sans JP
- **テーマ**: クラシック音楽・オーケストラ・親しみやすい・モダン

## Deployment

GitHub Pages にデプロイ（リポジトリ名 `kansai-mfd`）。`vite.config.ts` の `base` と React Router の `basename` はともに `/kansai-mfd/` に設定済み。

## Notes

- `src/data/concerthalls.json` と `src/data/practices.json` はビルド成果物なので `.gitignore` 済み
- YAMLからJSONへの変換は `npm run dev` / `npm run build` の前処理として自動実行される
- `concerthall.yaml` の `築年月` は `YYYY-MM` 形式で記述する（Excelシリアル値は変換済み）
- `concerthall.yaml` に同一施設の複数ホール（部屋名で区別）が含まれる場合、一覧では別エントリとして表示する
