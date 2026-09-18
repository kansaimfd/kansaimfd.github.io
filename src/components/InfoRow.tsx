interface Props {
  label: string
  value?: string | number | null
}

/** 詳細ページの基本情報の1行。値が無い項目は行ごと出さない */
export default function InfoRow({ label, value }: Props) {
  if (value == null || value === '') return null
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{String(value)}</td>
    </tr>
  )
}
