import type { PracticeListItem } from '../types'
import raw from '../data/practices.json'

/** 練習場の一覧用。詳細ページは datasets/facility.ts から1施設ずつ読む */
export const practices = raw as PracticeListItem[]
