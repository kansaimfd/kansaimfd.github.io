import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

/**
 * 読み込みに失敗したときの受け皿。
 *
 * **これが無いと、失敗はヘッダーもフッターも消えた白紙になる。**
 * ページは全部 `lazy()`、詳細ページのデータは `use()` で読んでいるので、
 * チャンクやJSONの取得が落ちると例外が描画の途中で投げられる。React は
 * 受け止める境界が無ければツリーごと捨てるため、利用者からは
 * 「真っ白な画面」としか見えず、再読み込みすれば直ることも分からない。
 *
 * 通信の一時的な失敗のほか、**新しいビルドを公開したあとに開きっぱなしだった
 * 古いタブ**でも起きる（古いタブが指すチャンク名はもう配信されていない）。
 *
 * 境界はエラーを覚え続けるので、`resetKey`（＝現在のURL）が変わったら消す。
 * そうしないと、ヘッダーのリンクで別のページへ移っても案内が出たままになる。
 */
interface Props {
  children: ReactNode
  resetKey: string
}

interface State {
  failed: boolean
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 握りつぶすと原因を追えなくなる。表示は差し替えるが、記録は残す
    console.error('画面の描画に失敗しました', error, info.componentStack)
  }

  componentDidUpdate(prev: Props): void {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) {
      this.setState({ failed: false })
    }
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children

    return (
      <div className="loaderror" role="alert">
        <h1 className="loaderror__title">表示できませんでした</h1>
        <p className="loaderror__lead">
          データの読み込みに失敗しました。通信が一時的に途切れたか、
          このページを開いたままサイトが更新された可能性があります。
          再読み込みすると直ることがあります。
        </p>
        <div className="loaderror__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
          <Link to="/concert" className="btn btn--ghost">
            コンサートホール一覧
          </Link>
          <Link to="/practice" className="btn btn--ghost">
            練習場一覧
          </Link>
        </div>
      </div>
    )
  }
}

/**
 * URLをリセットのきっかけとして渡すためのラッパー。
 * クラスコンポーネントからはフックを呼べないので、ここで読んで渡す。
 */
export default function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation()
  return <ErrorBoundary resetKey={pathname + search}>{children}</ErrorBoundary>
}
