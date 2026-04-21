import { MapContainer, TileLayer, Marker } from 'react-leaflet'

interface Props {
  lat: number
  lng: number
  name: string
}

export default function DetailMap({ lat, lng }: Props) {
  return (
    <MapContainer center={[lat, lng]} zoom={15} className="w-full h-64 rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} />
    </MapContainer>
  )
}
