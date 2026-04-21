# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

関西地方の音楽施設（Music Facility Directory）情報を閲覧できる静的Webサービス。バックエンドなし。

## Tech Stack

- **Vite** — ビルドツール
- **React** — UIフレームワーク
- **Tailwind CSS** — スタイリング
- **Leaflet + OpenStreetMap** — 地図表示
- **YAML → JSON** — 施設データはYAMLで管理し、ビルド時にJSONへ変換してフロントエンドに埋め込む

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
data/facilities/*.yaml
        ↓ (scripts/build-data.js などビルドスクリプト)
src/data/facilities.json
        ↓ (import)
React コンポーネント
```

### Key Directories

- `data/` — 施設データのYAMLファイル群
- `scripts/` — YAML→JSON変換スクリプト
- `src/data/` — 変換後JSONの出力先（gitignore推奨）
- `src/components/` — Reactコンポーネント
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

## Deployment

GitHub Pages にデプロイ。React Router を使う場合は `basename` の設定とリダイレクト対応が必要。

## Notes

- `src/data/facilities.json` はビルド成果物なので `.gitignore` に追加する
- YAMLからJSONへの変換は `npm run build` の前処理として実行すること
- `concerthall.yaml` の `築年月` は `YYYY-MM` 形式で記述する（Excelシリアル値は変換が必要）
