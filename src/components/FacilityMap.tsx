import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { MappableFacility } from '../types'
import { stationLabel } from '../station'
import { fullAddress } from '../address'
import { createMap, createPin, maplibregl } from './createMap'

interface Props {
  facilities: MappableFacility[]
  /**
   * 詳細ページのパス。練習場一覧にはコンサートホール併設の部屋が混ざり、
   * 施設ごとに行き先が違うので、接頭辞ではなく施設から求める。マーカーの識別にも使う
   */
  detailPath: (f: MappableFacility) => string
}

/** 関西2府4県がおさまる範囲。施設が0件のときに見せる */
const KANSAI_VIEW = { center: [135.5, 34.7] as [number, number], zoom: 7.5 }

/**
 * ポップアップをピンからずらす量。ピンの下端が座標なので、上に開くときはピンの高さぶん、
 * 下に開くときはほぼそのまま。maplibre は地図の端に寄ると開く向きを変えるので向きごとに持つ
 */
const PIN_H = 31
const POPUP_OFFSET: maplibregl.Offset = {
  bottom: [0, -PIN_H],
  'bottom-left': [0, -PIN_H],
  'bottom-right': [0, -PIN_H],
  top: [0, 4],
  'top-left': [0, 4],
  'top-right': [0, 4],
  left: [14, -PIN_H / 2],
  right: [-14, -PIN_H / 2],
  center: [0, 0],
}

const displayName = (f: MappableFacility) => f.施設名 + (f.部屋名 ? `（${f.部屋名}）` : '')

export default function FacilityMap({ facilities, detailPath }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  /** 開いているピン。ピンは maplibre が持つDOMなので、印のクラスは直接付け外しする */
  const activePin = useRef<HTMLElement | null>(null)
  // ポップアップの中身は React で描く（ルーターの Link を使うため）。
  // maplibre には空の器だけを渡し、そこへポータルで流し込む
  const [popupBody] = useState(() => document.createElement('div'))
  const [active, setActive] = useState<MappableFacility | null>(null)

  useEffect(() => {
    const map = createMap(container.current!, KANSAI_VIEW)
    const popup = new maplibregl.Popup({
      offset: POPUP_OFFSET,
      maxWidth: '18rem',
      focusAfterOpen: false,
    }).setDOMContent(popupBody)
    popup.on('close', () => {
      activePin.current?.classList.remove('is-active')
      activePin.current = null
      setActive(null)
    })
    mapRef.current = map
    popupRef.current = popup
    return () => {
      map.remove()
      mapRef.current = null
      popupRef.current = null
    }
  }, [popupBody])

  // 絞り込みが変わるたびにピンを置き直し、残った施設が収まるように寄せる
  useEffect(() => {
    const map = mapRef.current!
    const popup = popupRef.current!
    popup.remove()

    const markers = facilities.map(f => {
      const pin = createPin(f.都道府県, `${displayName(f)}の情報を開く`, true)
      pin.addEventListener('click', e => {
        e.stopPropagation()
        if (activePin.current === pin) return
        // 開いている別のピンを先に閉じる（close で印と active が消える）。
        // 開くのは中身を描いてから（下の effect）。空のまま開くと、maplibre が
        // 上下どちらに開くかを空の大きさで決めてしまい、地図の端で切れる
        popup.remove()
        pin.classList.add('is-active')
        activePin.current = pin
        setActive(f)
      })
      return new maplibregl.Marker({ element: pin, anchor: 'bottom' })
        .setLngLat([f.経度, f.緯度])
        .addTo(map)
    })

    if (facilities.length > 0) {
      const bounds = new maplibregl.LngLatBounds()
      for (const f of facilities) bounds.extend([f.経度, f.緯度])
      // ピンは座標から上へ伸びるので、上の余白はピンの高さぶん多く取る
      map.fitBounds(bounds, {
        padding: { top: 40 + PIN_H, bottom: 40, left: 40, right: 40 },
        maxZoom: 14,
        duration: 0,
      })
    } else {
      map.jumpTo(KANSAI_VIEW)
    }

    return () => markers.forEach(m => m.remove())
  }, [facilities])

  useEffect(() => {
    if (active) popupRef.current!.setLngLat([active.経度, active.緯度]).addTo(mapRef.current!)
  }, [active])

  return (
    <>
      <div ref={container} className="map map--list" />
      {active &&
        createPortal(
          <div className="map-popup" data-pref={active.都道府県}>
            <p className="map-popup__name">{displayName(active)}</p>
            <p className="map-popup__meta">{fullAddress(active)}</p>
            {active.最寄駅?.map((s, i) => (
              <p key={i} className="map-popup__meta">
                {stationLabel(s)}
              </p>
            ))}
            <Link to={detailPath(active)} className="map-popup__link">
              詳細を見る →
            </Link>
          </div>,
          popupBody,
        )}
    </>
  )
}
