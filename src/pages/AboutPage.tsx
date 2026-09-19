import useDocumentTitle from '../useDocumentTitle'

export default function AboutPage() {
  useDocumentTitle('このサイトについて')

  return (
    <div className="about">
      <header className="page-head">
        <p className="page-head__eyebrow">ABOUT</p>
        <h1 className="page-head__title">このサイトについて</h1>
      </header>

      <section className="about__section">
        <h2>サービス概要</h2>
        <p>
          関西の音楽練習場、コンサートホールの情報をまとめています。各種条件で検索することができます。
        </p>
      </section>

      <section className="about__section">
        <h2>利用規約</h2>
        <p>
          本サイトのソースコードは{' '}
          <a
            href="https://github.com/kansaimfd/kansaimfd.github.io/blob/master/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="about__link"
          >
            MIT ライセンス
          </a>{' '}
          です。著作権表示とライセンス全文を同梱すれば、商用利用を問わず自由に改変・再配布が可能です。
        </p>
        <p>
          掲載している施設データは{' '}
          <a
            href="https://github.com/kansaimfd/kansaimfd.github.io/blob/master/data/LICENSE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="about__link"
          >
            クリエイティブ・コモンズ 表示 4.0（CC BY 4.0）
          </a>{' '}
          です。出典として本サイト名とURLを示せば、商用利用を問わず自由に複製・改変・再配布が可能です。
        </p>
      </section>

      <section className="about__section">
        <h2>出典</h2>
        <p>
          地図は{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="about__link"
          >
            © OpenStreetMap contributors
          </a>{' '}
          のデータを、OpenStreetMap Foundation が配信するタイルで表示しています。
        </p>
        <p>最寄駅の検算には「国土数値情報（鉄道データ）国土交通省」を加工して使用しています。</p>
        <p>
          施設の情報は、各施設の公式サイトなどの公開情報をもとに整理しています。施設ごとの最終確認日は詳細ページに表示しています。
        </p>
      </section>

      <section className="about__section">
        <h2>免責事項</h2>
        <p>本サイトは、関西地域の音楽関係施設に関する情報をまとめた非公式のウェブサイトです。</p>
        <p>
          掲載している情報は、公開情報をもとに個人が収集・整理したものであり、各施設の公式な見解や情報を保証するものではありません。正確な情報が必要な場合は、必ず各施設の公式サイトや関係機関にて最新の情報をご確認ください。
        </p>
        <p>
          また、本サイトの内容については細心の注意を払っておりますが、掲載情報の正確性・完全性・最新性を保証するものではなく、内容の誤りや情報の不足、更新の遅れ等が発生する可能性があります。
        </p>
        <p>
          本サイトの利用により、ご利用者または第三者に損害やトラブル等が発生した場合でも、当方では一切の責任を負いかねます。利用者ご自身の責任において本サイトをご利用ください。
        </p>
      </section>

      <section className="about__section">
        <h2>プライバシーポリシー</h2>
        <p>本サイトは個人情報を収集しません。アクセス解析等も行っていません。</p>
      </section>

      <section className="about__section">
        <h2>コントリビューション</h2>
        <p>施設データの追加・修正にご協力いただける方を歓迎しています。</p>
        <a
          href="https://github.com/kansaimfd/kansaimfd.github.io/blob/master/CONTRIBUTING.md"
          target="_blank"
          rel="noopener noreferrer"
          className="about__link about__link--block"
        >
          コントリビューションガイドライン →
        </a>
      </section>

      <section className="about__section">
        <h2>ソースコード</h2>
        <p>本サイトのソースコードは GitHub で公開しています。</p>
        <a
          href="https://github.com/kansaimfd/kansaimfd.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="about__link about__link--block"
        >
          GitHub リポジトリ →
        </a>
      </section>
    </div>
  )
}
