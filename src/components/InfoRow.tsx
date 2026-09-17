interface Props {
  label: string
  value?: string | number | null
}

export default function InfoRow({ label, value }: Props) {
  if (value == null || value === '') return null
  return (
    <tr className="border-b">
      <th className="px-3 py-2 text-left text-sm text-gray-500 font-medium whitespace-nowrap w-36 bg-gray-50">
        {label}
      </th>
      <td className="px-3 py-2 text-sm">{String(value)}</td>
    </tr>
  )
}
