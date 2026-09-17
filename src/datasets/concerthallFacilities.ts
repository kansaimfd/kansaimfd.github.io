import type { ConcertHallFacility } from '../types'
import raw from '../data/concerthallFacilities.json'

/** 施設単位（詳細ページ用。出典を含む） */
export const concerthallFacilities = raw as ConcertHallFacility[]
