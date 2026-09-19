/**
 * 一覧・詳細の地図で共通の初期化。maplibre-gl を読むのはこのファイルだけで、
 * 地図のコンポーネントは遅延読み込みしているので、地図を開くまで配られない。
 */
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
/*
 * v6 のワーカーは共有チャンク（maplibre-gl-shared.mjs）を import する ES モジュールで、
 * バンドル後は maplibre-gl が探しに行く「自分の隣」に置かれない。Vite にワーカーとして
 * 束ねさせ、そのURLを渡す。
 * そのぶん共有部分が本体とワーカーの両方に入り、地図を開くと gzip 約420KB が届く
 * （配布ファイルをそのまま配れば約300KB だが、ビルドに専用の仕組みが要る）。
 * v5 は1ファイルで約280KB だったが、6.4.0 以前には XSS の既知の脆弱性がある
 */
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { buildMapStyle, readMapColors } from '../mapStyle'

maplibregl.setWorkerUrl(workerUrl)

/** 操作部品の文言。既定は英語 */
const LOCALE = {
  'NavigationControl.ZoomIn': '拡大',
  'NavigationControl.ZoomOut': '縮小',
  'NavigationControl.ResetBearing': '北を上にする',
  'Popup.Close': '閉じる',
  'AttributionControl.ToggleAttribution': '出典の表示を切り替える',
  'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl キーを押しながらスクロールで拡大・縮小',
  'CooperativeGesturesHandler.MacHelpText': '⌘ キーを押しながらスクロールで拡大・縮小',
  'CooperativeGesturesHandler.MobileHelpText': '2本の指で地図を動かせます',
}

export function createMap(
  container: HTMLElement,
  view: { center: [lng: number, lat: number]; zoom: number },
): maplibregl.Map {
  const root = getComputedStyle(document.documentElement)
  const map = new maplibregl.Map({
    container,
    style: buildMapStyle(readMapColors(name => root.getPropertyValue(name))),
    ...view,
    // 漢字・かなはタイル側のフォントに無いので、ページと同じ書体で描く
    localIdeographFontFamily: root.getPropertyValue('--font-sans'),
    locale: LOCALE,
    // ページの途中にある地図なので、ホイールや1本指でページのスクロールを奪わない
    cooperativeGestures: true,
    // 回転・傾きは施設を探すのに要らず、誤操作で北が分からなくなるだけ
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    maxZoom: 18,
    attributionControl: { compact: true },
  })
  map.touchZoomRotate.disableRotation()
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
  return map
}

/**
 * 施設のピン。色は府県のアクセント（`data-pref` → tokens.css）で、JS 側に色を持たない。
 * 押せるピンは button にして、キーボードでもポップアップを開けるようにする
 */
export function createPin(pref: string, label: string, interactive: boolean): HTMLElement {
  const el = document.createElement(interactive ? 'button' : 'div')
  el.className = 'map-pin'
  el.dataset.pref = pref
  el.setAttribute('aria-label', label)
  if (el instanceof HTMLButtonElement) el.type = 'button'
  else el.setAttribute('role', 'img')
  const head = document.createElement('span')
  head.className = 'map-pin__head'
  el.append(head)
  return el
}

export { maplibregl }
