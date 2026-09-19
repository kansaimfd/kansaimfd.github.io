import { useEffect, useRef } from 'react'
import { createMap, createPin, maplibregl } from './createMap'

interface Props {
  lat: number
  lng: number
  name: string
  都道府県: string
}

export default function DetailMap({ lat, lng, name, 都道府県 }: Props) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const map = createMap(container.current!, { center: [lng, lat], zoom: 15 })
    new maplibregl.Marker({ element: createPin(都道府県, name, false), anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(map)
    return () => map.remove()
  }, [lat, lng, name, 都道府県])

  return <div ref={container} className="map map--detail" />
}
