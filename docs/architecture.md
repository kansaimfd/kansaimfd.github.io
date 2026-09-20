# 構成

データの流れ・一覧の状態の置き場所・ディレクトリの役割。作業の入口は [CLAUDE.md](../CLAUDE.md)（索引）。

## Data Flow

YAML（正規化・人間が編集）を、UIが消費しやすい非正規化JSONへビルド時に変換する。

```
data/facilities/concerthall.yaml          data/facilities/practice.yaml
  1レコード = 1施設（部屋[] を内包）        1レコード = 1施設（部屋[] を内包）
        ↓ (scripts/build-data.mjs)               ↓
src/data/concerthalls.json                src/data/practices.json
  施設 × ホール に平坦化（一覧・地図用）     一覧用に絞ったもの
src/data/concert/<ID>.json                src/data/practice/<ID>.json
  施設1件（詳細ページ用）                    施設1件（詳細ページ用）
        ↓ (src/datasets/*.ts でimport)
React コンポーネント
```

**一覧用と詳細用でJSONを分ける。** 一覧用には一覧が読むフィールドだけを載せる
（`transform.mjs` の `LIST_*_FIELDS`。TEL・休館日・料金URL・出典などは入らない）。
除外リストではなく採用リストで書くのは、スキーマにフィールドが増えたときに
書き足しを忘れても漏れないようにするため。

**コンサートホール施設の「ホールでない部屋」は練習場一覧に出す。** 練習室・リハーサル室・
スタジオなどを `concerthalls.json` から外し、施設1件ぶんを `practices.json` に
`ホール併設: true` を付けて足す（`transform.mjs` の `isHallRoom` / `toHallPracticeList`）。
ホールと見なすのは、客席数・舞台寸法・ホール種別・パイプオルガンのどれかがあるか、
部屋名が「◯◯ホール」（レセプション・展示・コンベンション・交流・セミナーなどを除く）か、
部屋名が無い部屋。**詳細ページはコンサートホール側（`/concert/:id`）** を使うので、
練習場一覧のリンク・key は `practiceDetailPath()` で作る（IDの名前空間がファイルごとに別なため）。

**貸館を終えた施設（`終了` / `廃止`）は両一覧とも既定で隠す。** フィルタの
「貸館終了・閉館も表示」（URL は `closed=1`）を選んだときだけ出す。
`休止`（再開予定あり）と `予定`（まだ借りられる）は隠さない。

**ルートは全部分割する。一覧も静的に読まない。** 以前はコンサートホール一覧だけ
静的に読んでいたが（入口なので1往復を惜しんだ）、その一覧は全ホールぶんのJSONを抱えていて、
**入口以外から来た人にもまるごと配られていた**。分割すると、一覧を見ない利用者
（詳細への直リンク・練習場・このサイトについて）は一覧ぶんのJSONを落とさずに済む。
代わりに入口の表示に1往復増える。入口の大きさは `check-dist.mjs` の `ENTRY_BUDGET` が止める。

**詳細ページ用は1施設1ファイルに分ける。** 全施設をまとめた1つのJSONを
静的 import していたころ、`/concert/10` を直接開いた利用者は1施設を見るために
全施設ぶん（当時 gzip 171KB）を落としていた。`src/datasets/facility.ts` が
`import.meta.glob` で1件ずつ動的に読む（施設1件あたり gzip 約4KB）。

## 一覧の状態はURLが持つ

**一覧の絞り込み・並び替え・表示は `useState` ではなくURLのクエリに持つ。**
`useState` だったころは、絞り込んだ結果を人に送れず、戻るボタンが一覧そのものを離れ、
地図から詳細へ行って戻ると条件が消えていた。置き場所をURLにすると3つとも同時に解ける。

```
/concert?pref=大阪府,兵庫県&city=大阪市北区&walk=10&seats=1000-&equip=piano,organ&view=table&sort=客席数.desc
```

- 変換は `src/query.ts`（汎用の読み書き）と `concerthall.ts` / `practice.ts` の
  `*StateFromParams` / `*StateToParams`。**Reactに触れないので往復を単体でテストできる**
- **既定値は書かない。** 何も絞り込んでいない `/concert` にクエリが付いて回ると、
  共有したときに条件が付いているように見える
- **読む側は知っている値だけを通す。** URLは手で書き換えられるので、知らない府県名や
  設備キーをそのまま絞り込みに渡すと「0件だがなぜか分からない」画面になる
- **条件をひとつ変えるたびに履歴をひとつ積む**（戻るで直前の絞り込みに戻る）。
  ただしフリーワードは置き換える。打鍵ごとに積むと戻るが文字を1つ消すだけの操作になる
- 集合（設備）は選択肢の並び順に揃えてから書く。同じ条件なら同じURLになるようにするため
- **読み書きの手順は `src/useListState.ts` が持つ**（クエリから状態を作る・履歴を積む・
  フリーワードだけ置き換える・絞り込みだけを解除する）。変換そのものは一覧ごとに違うので受け取る。
  以前は同じ手順がページごとに書かれていた
- **「条件をすべて解除」は絞り込みだけを戻す**（`EMPTY_HALL_CRITERIA` / `EMPTY_PRACTICE_CRITERIA`）。
  **表示と並び替えは残す**——探し方まで戻されると、表で見ていた人がリストに飛ばされる。
  効いている条件が1つも無ければボタンを出さない（書き出したクエリが解除後と同じかで判断する）
- **`unknown=1` は「判断できないものも出す」**（→ `src/filter.ts`）。既定は出さない側。
  未調査は「無い」ではないので、除外した件数を知らせるだけでなく含める道を用意してある
- **読む側と書く側は別々に手で並べてある**ので、片方に足し忘れても型チェックも lint も通る。
  `*.test.ts` の「絞り込みの全項目がURLを往復する」が全キーを1つずつ立てて確かめる

**重要**: YAMLは常に「1レコード = 1施設」で書く。同一施設に複数のホール／練習室がある場合は
行を分けず `部屋:` 配列に入れる。住所・URL・最寄駅などの施設属性を複製しないため。
一覧表示に必要な「1行 = 1ホール」の形は `build-data.mjs` が派生生成する。

## Key Directories

- `data/facilities/` — 施設データのYAMLファイル群
- `scripts/build-data.mjs` — YAML→JSON変換の入口。ファイル入出力と検査の呼び出しだけを持つ
- `scripts/transform.mjs` — 変換そのもの（駅徒歩の補完・音楽外の部屋の除外・平坦化）。
  読み書きを伴わないので単体でテストできる（`scripts/transform.test.mjs`）
- `scripts/coverage.mjs` — 項目別の調査カバレッジ（記入／公式に記載なし／未調査）と確認日の鮮度
- `scripts/validate.mjs` — データ検査（オフラインで完結するもののみ）。ビルド前に自動実行される
- `scripts/static-pages.mjs` — URLごとの静的HTML（題名・説明・canonical・OGP・構造化データ）と
  sitemap.xml の組み立て。書き出しは `build-static-pages.mjs` が `npm run build` の最後に行う（→ [deployment.md](./deployment.md)）
- `scripts/check-dist.mjs` — 出来た `dist/` を `vite preview` で実際に配って検品する。
  **デプロイは CI の完了を待たないので、成果物を実際に配ってみる経路はここだけ**。
  全URLが200で返り、題名・canonical・noscript の本文がページごとに違うこと、
  404.html が noindex で canonical を持たないこと、
  **入口チャンクが `ENTRY_BUDGET`（gzip）を超えないこと**を見る
- `scripts/audit-coordinates.mjs` — 座標の検算（外部APIを使うためビルドには組み込まない）
- `scripts/url-audit.mjs` — 「開くが別サイト」の判定（一致率・英語ページ・文字符号化）。
  **通信を持たないので単体でテストできる**（`audit-urls.mjs` が決めているのは月次Issueの中身で、
  閾値を動かせば見逃しにも誤検知にも振れる。スクリプトに閉じていると全施設へ
  実際に通信してみるまで確かめられなかった）
- `scripts/audit-freshness.mjs` — 確認日の鮮度の一覧（選び出しは `coverage.mjs` の `staleRecords`）
- `scripts/build-station-master.mjs` — 駅座標マスタの生成（随時。出力はコミット済み）
- `data/stations.json` — 関西1,904駅の座標（同名でも事業者が違えば別の駅）。出典: 国土数値情報（鉄道データ）国土交通省
- `src/data/` — 変換後JSONの出力先（`.gitignore` 済み。ビルドのたびに作り直す）
- `src/types.ts` — `ConcertHallFacility` / `ConcertHall` / `Practice` / `PracticeListItem` 型定義。
  **一覧用の型（`ConcertHall` / `PracticeListItem`）は `transform.mjs` の採用リストと対になっている。**
  片方だけ足すと、型にはあるのに値が来ない
- `src/datasets/` — 変換後JSONの読み込みと型付け。**データセットごとにファイルを分ける**
  （1モジュールで全部を import するとバンドルが分割できず、入口の一覧しか見ない利用者にも
  全データが配られる。`src/datasets/README.md`）。
  詳細ページは `datasets/facility.ts` から1施設ずつ動的に読む
- `src/concerthall.ts` / `src/practice.ts` — 一覧の絞り込みと並び替え、URLクエリとの相互変換。
  **ページから出しているのは、中心機能なのに描画しないと動かせずテストが書けなかったため**
- `src/useListState.ts` — 一覧の状態をURLに持たせる共通のフック（→ 一覧の状態はURLが持つ）
- `src/filter.ts` — 絞り込み条件を「合う／合わない／**判断できない**」の3つで扱う共通部品。
  **未調査で外れた件数と項目名を数えるのは設備だけではない。** 客席数・舞台寸法・
  ホール種別・定員・徒歩分数も埋まり具合はまちまちで（客席数は一覧のホールの1割ほどが未調査）、
  黙って落とすと「なぜ0件なのか分からない画面」になる。
  一覧は条件をこの形に並べて `applyConditions` に渡す
- `src/query.ts` — URLクエリと絞り込み条件の相互変換（→ 一覧の状態はURLが持つ）
- `src/options.ts` — 一覧の「選べるもの」（府県・市区町村・最寄駅・設備）を作る。**両一覧で共通**。
  **必ず0件になる選択肢を出さない**（施設のある府県だけ／選んだ府県・市区町村の中の駅だけ）。
  市区町村・駅には読みが無く五十音順に並べられないので、`<optgroup>` で府県ごとに束ねて
  探す範囲を狭める。**いま選ばれている値は範囲の外でも必ず残す**（URLは手で書き換えられる。
  絞り込みには効いているのに選択欄が未選択に見えると「0件だがなぜか分からない」画面になる）
- `src/station.ts` — 最寄駅の表記・徒歩分数まわりの共通ヘルパー。
  `knownWalk()` は分数が1駅も分からなければ `undefined` を返す
  （番兵値の `NO_WALK` のまま扱うと「999分の施設」と区別がつかない）
- `src/sort.ts` — 一覧の並び替えで共通の比較。**未調査は向きに関わらず末尾へ送る**
  （番兵値に均していたころ、「客席数の少ない順」で未調査の18ホールが先頭を占めていた）。
  並び替えの選択肢の文言（`sortOptions`）も**両一覧ぶんまとめてここが持つ**
- `src/address.ts` — 住所の連結（`geocodableAddress()` は建物名を含めない）
- `src/availability.ts` — 設備の3値（あり／なし／未調査）の表示と絞り込み
- `src/name.ts` — 施設名の五十音順ソート
- `src/mapStyle.ts` — 地図のスタイル（MapLibre の style JSON）。タイル・フォントの配信元URLはここにだけ書く
  （OSMF の規約が、配信停止に備えてURLを散らばらせないよう求めているため）
- `src/components/createMap.ts` — 地図の共通初期化とピン。**maplibre-gl を import するのはここだけ**
- `src/pref.ts` — 府県の並びと英字表記（**色は持たない**。→ [design.md](./design.md)）
- `design/ogp/` — OGP 画像の原稿（HTML）。書き出した PNG は `public/ogp.png`（→ [deployment.md](./deployment.md)）
- `src/styles/` — スタイルシート。読み込み順に tokens → base → layout → components → pages
- `src/components/` — 共通UIコンポーネント。**一覧ページの骨格も部品**（`ListLayout`）で、
  見出し・検索と並び替え・絞り込みパネル・件数と表示の切り替え・未調査の注意書きの並びは
  2つの一覧で共通。ページ側に残るのは「絞り込みの中身」と「表示の中身」だけ。
  絞り込みのピル（`Pill` / `PrefPills` / `EquipPills` / `ClosedToggle`）、
  表示の枠（`CardList` / `DataTable` / `MapView`）、0件の表示（`EmptyResult`）も同様に共通
- `src/pages/` — ページ単位のコンポーネント
- `e2e/` — 本番ビルドのスモークテスト（Playwright。→ development.md）
