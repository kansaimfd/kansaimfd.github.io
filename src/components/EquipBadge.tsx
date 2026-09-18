/** 設備が「あり」と確認できている場合だけ出す小さな印。未調査では何も出さない */
export default function EquipBadge({ label, on }: { label: string; on?: boolean }) {
  if (!on) return null
  return (
    <span className="equip-badge">
      <span className="equip-badge__dot" />
      {label}
    </span>
  )
}
