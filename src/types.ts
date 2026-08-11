/**
 * 設備の有無。true＝あり / false＝なし。
 * **undefined は「なし」ではなく「未調査」**を意味する（YAMLではキーごと省略する）。
 * この3値の区別を潰さないこと。false と undefined を同一視すると、
 * 実際には設備がある施設が絞り込みから消える。
 */
export type Availability = boolean

/** 情報の出所。1レコードに複数持てる */
export interface Source {
  URL: string
  /** YYYY-MM-DD。この日にこのURLで内容を確認したという意味 */
  確認日: string
  /** このURLで裏が取れたフィールド名。省略時はレコード全体 */
  項目?: string[]
  /** 確認できなかった点・不確かな点 */
  備考?: string
}

export interface Station {
  /** 同一駅に複数路線が乗り入れる場合は並べる 例: [御堂筋線, 中央線] */
  路線?: string[]
  駅: string
  /** 出口・改札名 例: 23号出口, 南改札口 */
  出口?: string
  /** 徒歩分数。公式が距離のみ記載の場合はビルド時に補完される（駅徒歩推定 を参照） */
  駅徒歩?: number
  /** 道路距離（m）。直線距離ではない */
  駅距離?: number
  /** true なら 駅徒歩 は 駅距離 からビルド時に導出した推定値（80m/分・切り上げ） */
  駅徒歩推定?: boolean
}

/** 施設に共通する属性（住所・アクセス・連絡先など、部屋によらないもの） */
interface FacilityBase {
  ID: number
  施設名: string
  /**
   * 施設名のひらがな読み。五十音順ソートに使う。
   * 漢字を含む施設名には付ける（かな・カナのみの名前はビルド時に導出できるので不要）。
   * 括弧内の別名は読みに含めない。
   */
  施設名かな?: string
  都道府県: string
  /** 市・区・町・村まで。政令市は区まで、郡部は郡名から書く 例: 神戸市中央区, 佐用郡佐用町 */
  市区町村: string
  /** 町名・丁目・番地。半角数字とハイフンに統一する */
  番地以下: string
  /** ビル名・階・部屋番号。番地以下に混ぜるとジオコーディングの精度が落ちるため分ける */
  建物?: string
  URL?: string
  申込URL?: string
  料金URL?: string
  最寄駅?: Station[]
  経度: number
  緯度: number
  出典?: Source[]
  /** 出典[].確認日 の最新値。build-data.mjs が派生生成する（YAMLには書かない） */
  最終確認日?: string
}

export type PianoType = 'グランド' | 'アップライト' | '電子'

/** ホール・練習室に共通する備品。「有無(3値) ＋ 詳細(任意)」の形で持つ */
interface RoomBase {
  部屋名?: string
  ピアノ有無?: Availability
  /** ピアノが複数種ある部屋は稀なため単一値で持つ */
  ピアノ種別?: PianoType
  ピアノメーカー?: string
  譜面台貸出?: Availability
  /** 貸出本数。分かる場合のみ。「あるが本数不明」は 譜面台貸出 のみ true にする */
  譜面台数?: number
}

/**
 * ホールの性格。上から順に当てはめて判定する。
 *
 * - `音楽専用` … 施設が自ら「音楽専用」「コンサート専用」と称している
 * - `小ホール・サロン` … 客席数がおおむね300席未満で、リサイタル・室内楽向け
 * - `多目的` … プロセニアム形式で緞帳・舞台機構を持ち、音楽以外（演劇・式典）にも使う。
 *   **音響反射板が可動式・設置式であることが実務上の目印**
 *
 * 判断がつかない場合は設定しない（未調査）。
 */
export type HallType = '音楽専用' | '多目的' | '小ホール・サロン'

/** コンサートホール施設内の個々のホール */
export interface Hall extends RoomBase {
  ホール種別?: HallType
  客席数?: number
  舞台幅?: number
  舞台奥行?: number
  パイプオルガン?: Availability
  /** 製作者。ストップ数などもここに書いてよい 例: クーン社（54ストップ） */
  オルガン製作者?: string
  /** 楽屋の合計収容人数。部屋数では実態を表せないため人数で持つ */
  楽屋収容人数?: number
  親子室?: Availability
}

/** concerthall.yaml の1レコード＝1施設 */
export interface ConcertHallFacility extends FacilityBase {
  築年月?: string
  駐車場?: number
  部屋?: Hall[]
}

/**
 * 一覧・地図用にビルド時へ平坦化した「施設 × ホール」1件。
 * ID は施設IDなので、同一施設の複数ホールでは重複する。React key には キー を使うこと。
 */
export type ConcertHall = Omit<ConcertHallFacility, '部屋'> & Hall & { キー: string }

export interface PracticeRoom extends RoomBase {
  部屋名: string
  面積?: number
  定員?: number
  /**
   * 楽器の可否。実際の施設で区別されているのはほぼ「打楽器」だけなので、
   * 金管・木管は分けずに 管楽器 でまとめる。細かい区別は 楽器制限 に書く。
   */
  管楽器?: Availability
  打楽器?: Availability
  /**
   * 楽器についての条件・補足。「音量制限あり」「養生が必要」「木管のみ可」など。
   * **条件付きで使える場合は 管楽器/打楽器 を true にしたうえで、ここに条件を書く。**
   */
  楽器制限?: string
}

/** practice.yaml の1レコード＝1施設 */
export interface Practice extends FacilityBase {
  TEL?: string
  開館時間?: string
  閉館時間?: string
  休館日?: string
  部屋?: PracticeRoom[]
  ピアノ有無?: Availability
}
