export interface Station {
  路線?: string
  駅: string
  駅徒歩?: number
}

export interface ConcertHall {
  ID: number
  施設名: string
  部屋名?: string
  都道府県: string
  市区町村: string
  番地以下: string
  URL?: string
  申込URL?: string
  料金URL?: string
  分類?: string
  築年月?: string
  最寄駅?: Station[]
  舞台高さ?: number
  舞台奥行?: number
  舞台幅?: number
  客席数?: number
  駐車場?: number
  ピアノ有無?: '〇' | '×'
  パイプオルガン?: '〇' | '×'
  譜面台貸出?: '〇' | '×'
  親子室?: '〇' | '×'
  経度: number
  緯度: number
}

export interface Practice {
  ID: number
  施設名: string
  都道府県: string
  市区町村: string
  番地以下: string
  URL?: string
  分類?: string
  最寄駅?: string
  最寄駅徒歩?: number
  ピアノ有無?: '〇' | '×'
  経度: number
  緯度: number
}
