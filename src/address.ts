type HasAddress = {
  都道府県: string
  市区町村: string
  番地以下: string
  建物?: string
}

/** 都道府県から建物まで繋いだ全住所 */
export function fullAddress(f: HasAddress): string {
  return `${f.都道府県}${f.市区町村}${f.番地以下}${f.建物 ? ` ${f.建物}` : ''}`
}

/**
 * 都道府県を省いた住所。一覧など、府県が別に表示されている場所で使う。
 */
export function localAddress(f: HasAddress): string {
  return `${f.市区町村}${f.番地以下}${f.建物 ? ` ${f.建物}` : ''}`
}

/**
 * ジオコーディングに渡す住所。建物名は含めない。
 * ビル名や階数が入ると住所検索の精度が落ちるため。
 */
export function geocodableAddress(f: HasAddress): string {
  return `${f.都道府県}${f.市区町村}${f.番地以下}`
}
