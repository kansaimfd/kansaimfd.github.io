import type { ConcertHall, Practice } from './types'
import concerthallsRaw from './data/concerthalls.json'
import practicesRaw from './data/practices.json'

export const concerthalls = concerthallsRaw as ConcertHall[]
export const practices = practicesRaw as Practice[]
