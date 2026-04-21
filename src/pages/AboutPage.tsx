export default function AboutPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">このサイトについて</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">サービス概要</h2>
        <p className="text-gray-700 text-sm leading-relaxed">
          関西地方のコンサートホール・音楽練習場の情報を掲載しています。施設の検索・比較にご活用ください。
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">免責事項</h2>
        <p className="text-gray-700 text-sm leading-relaxed">
          本サイトに掲載している情報は可能な限り正確を期していますが、内容の正確性・完全性を保証するものではありません。
          施設の利用にあたっては、各施設の公式サイト等で最新情報をご確認ください。
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">プライバシーポリシー</h2>
        <p className="text-gray-700 text-sm leading-relaxed">
          本サイトは個人情報を収集しません。アクセス解析等も行っていません。
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">ソースコード</h2>
        <p className="text-gray-700 text-sm">
          本サイトのソースコードは GitHub で公開しています。
        </p>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-blue-600 hover:underline text-sm"
        >
          GitHub リポジトリ →
        </a>
      </section>
    </div>
  )
}
