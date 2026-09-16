import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { Station } from '../types'
import { stationLabel } from '../station'
import { fullAddress } from '../address'

// leaflet のデフォルトアイコン修正。
// バンドラが画像URLを書き換えるため、leaflet が内部で組み立てるURLを消してから
// mergeOptions で差し替える（_getIconUrl は型定義に無い内部プロパティ）。
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

interface Facility {
  ID: number
  施設名: string
  部屋名?: string
  都道府県: string
  市区町村: string
  番地以下: string
  建物?: string
  最寄駅?: Station[]
  経度: number
  緯度: number
}

interface Props {
  facilities: Facility[]
  detailBasePath: string
}

export default function FacilityMap({ facilities, detailBasePath }: Props) {
  return (
    <MapContainer
      center={[34.7, 135.5]}
      zoom={9}
      className="w-full h-[500px] rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {facilities.map((f) => (
        <Marker key={f.ID} position={[f.緯度, f.経度]}>
          <Popup>
            <div className="text-sm space-y-1 min-w-[160px]">
              <p className="font-bold">
                {f.施設名}{f.部屋名 ? `（${f.部屋名}）` : ''}
              </p>
              <p className="text-gray-600">{fullAddress(f)}</p>
              {f.最寄駅?.map((s, i) => (
                <p key={i} className="text-gray-600">{stationLabel(s)}</p>
              ))}
              <Link
                to={`${detailBasePath}/${f.ID}`}
                className="block mt-1 text-blue-600 hover:underline"
              >
                詳細を見る →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
