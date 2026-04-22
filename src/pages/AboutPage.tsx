export default function AboutPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">このサイトについて</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">サービス概要</h2>
        <p className="text-gray-700 text-sm leading-relaxed">
          関西の音楽練習場、コンサートホールの情報をまとめています。各種条件で検索することができます。
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">利用規約</h2>
        <p className="text-gray-700 text-sm leading-relaxed">
          本サイトのソースコードは{' '}
          <a
            href="https://github.com/kansaimfd/kansaimfd.github.io/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            MIT ライセンス
          </a>
          {' '}です。商用利用を問わず、自由に利用することができます。
        </p>
        <p className="text-gray-700 text-sm leading-relaxed mt-2">
          著作権表示とライセンス全文を同梱すれば、自由に改変・再配布が可能です。
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">免責事項</h2>
        <p className="text-gray-700 text-sm leading-relaxed">
          本サイトは、関西地域の音楽関係施設に関する情報をまとめた非公式のウェブサイトです。
        </p>
        <p className="text-gray-700 text-sm leading-relaxed mt-2">
          掲載している情報は、公開情報をもとに個人が収集・整理したものであり、各施設の公式な見解や情報を保証するものではありません。正確な情報が必要な場合は、必ず各施設の公式サイトや関係機関にて最新の情報をご確認ください。
        </p>
        <p className="text-gray-700 text-sm leading-relaxed mt-2">
          また、本サイトの内容については細心の注意を払っておりますが、掲載情報の正確性・完全性・最新性を保証するものではなく、内容の誤りや情報の不足、更新の遅れ等が発生する可能性があります。
        </p>
        <p className="text-gray-700 text-sm leading-relaxed mt-2">
          本サイトの利用により、ご利用者または第三者に損害やトラブル等が発生した場合でも、当方では一切の責任を負いかねます。利用者ご自身の責任において本サイトをご利用ください。
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">プライバシーポリシー</h2>
        <p className="text-gray-700 text-sm leading-relaxed">
          本サイトは個人情報を収集しません。アクセス解析等も行っていません。
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">コントリビューション</h2>
        <p className="text-gray-700 text-sm leading-relaxed">
          施設データの追加・修正にご協力いただける方を歓迎しています。
        </p>
        <a
          href="https://github.com/kansaimfd/kansaimfd.github.io/blob/main/CONTRIBUTING.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-blue-600 hover:underline text-sm"
        >
          コントリビューションガイドライン →
        </a>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">ソースコード</h2>
        <p className="text-gray-700 text-sm">
          本サイトのソースコードは GitHub で公開しています。
        </p>
        <a
          href="https://github.com/kansaimfd/kansaimfd.github.io"
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
