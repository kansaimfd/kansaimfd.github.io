import { Suspense, lazy } from 'react'
import type { MappableFacility } from '../types'

// 地図は maplibre-gl（gzip で約420KB）を引き込むので、地図表示に切り替えるまで読み込まない。
// **遅延読み込みの宣言はここ1か所**。一覧ごとに書くと、片方だけ静的 import に戻しても気づけない
const FacilityMap = lazy(() => import('./FacilityMap'))

interface Props {
  facilities: MappableFacility[]
  detailPath: (f: MappableFacility) => string
}

export default function MapView(props: Props) {
  return (
    <Suspense fallback={<p className="loading">地図を読み込んでいます…</p>}>
      <FacilityMap {...props} />
    </Suspense>
  )
}
