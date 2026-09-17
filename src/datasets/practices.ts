import type { Practice } from '../types'
import raw from '../data/practices.json'

/** 練習場。施設単位（一覧・詳細とも同じものを使う） */
export const practices = raw as Practice[]
