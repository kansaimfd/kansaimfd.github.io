import type { ConcertHall, ConcertHallFacility, Practice } from './types'
import concerthallsRaw from './data/concerthalls.json'
import concerthallFacilitiesRaw from './data/concerthallFacilities.json'
import practicesRaw from './data/practices.json'

/** 施設 × ホール に平坦化したもの（一覧・地図用） */
export const concerthalls = concerthallsRaw as ConcertHall[]
/** 施設単位（詳細ページ用） */
export const concerthallFacilities = concerthallFacilitiesRaw as ConcertHallFacility[]
export const practices = practicesRaw as Practice[]
