import { describe, expect, it, vi } from 'vitest'
import { createLoader } from './facility'

interface Fixture {
  施設名: string
}

const ok = (name: string) => () => Promise.resolve({ default: { 施設名: name } })

describe('createLoader', () => {
  it('知らないIDでは同期で null を返す', () => {
    const load = createLoader<Fixture>({ '../data/concert/10.json': ok('いずみホール') }, 'concert')
    // Promise で包むと、無いと分かっているIDでも一度「読み込み中」が出てしまう
    expect(load(999)).toBeNull()
  })

  it('同じ施設には同じPromiseを返す', async () => {
    const file = vi.fn(ok('いずみホール'))
    const load = createLoader<Fixture>({ '../data/concert/10.json': file }, 'concert')

    const first = load(10)
    const second = load(10)

    // use() は同じPromiseでなければ解決を受け取れない
    expect(first).toBe(second)
    expect(file).toHaveBeenCalledTimes(1)
    expect(await first).toEqual({ 施設名: 'いずみホール' })
  })

  it('失敗したPromiseは覚えず、次に開いたときは読み直す', async () => {
    // 1回目だけ失敗させる。通信が一時的に途切れた場合を模している
    const file = vi
      .fn<() => Promise<{ default: Fixture }>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockImplementation(ok('いずみホール'))
    const load = createLoader<Fixture>({ '../data/concert/10.json': file }, 'concert')

    await expect(load(10)).rejects.toThrow('network')

    // 覚えたままだと、この施設は再読み込みするまで二度と開けない
    const retry = load(10)
    expect(await retry).toEqual({ 施設名: 'いずみホール' })
    expect(file).toHaveBeenCalledTimes(2)
  })

  it('ディレクトリごとに別のファイルを見る', async () => {
    const files = {
      '../data/practice/10.json': ok('RHY梅田'),
    }
    expect(createLoader<Fixture>(files, 'concert')(10)).toBeNull()
    expect(await createLoader<Fixture>(files, 'practice')(10)).toEqual({ 施設名: 'RHY梅田' })
  })
})
