import type { ConcertHall } from '../types'
import raw from '../data/concerthalls.json'

/** 施設 × ホール に平坦化したもの（一覧・地図用） */
export const concerthalls = raw as ConcertHall[]
