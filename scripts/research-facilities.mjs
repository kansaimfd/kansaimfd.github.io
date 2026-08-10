/**
 * LM Studio + web-search MCP を使ったコンサートホール情報自動収集スクリプト
 *
 * 使い方:
 *   node scripts/research-facilities.mjs              # 全件処理
 *   node scripts/research-facilities.mjs --id 30      # ID=30 のみ（動作確認用）
 *   node scripts/research-facilities.mjs --limit 5    # 最大5件
 *   node scripts/research-facilities.mjs --dry-run    # YAML書き込みなし
 *   node scripts/research-facilities.mjs --debug      # ツール呼び出しの詳細を表示
 *   node scripts/research-facilities.mjs --model <name>  # モデル指定
 *
 * 前提:
 *   LM Studio が localhost:1234 で起動中であること
 *   C:/mcp-servers/web-search-mcp/dist/index.js が存在すること
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { spawn } from 'child_process'
import { createInterface } from 'readline'
import jsyaml from 'js-yaml'

const { load: parse, dump } = jsyaml

const LM_STUDIO_BASE = 'http://localhost:1234/v1'
const MCP_SERVER     = 'C:/mcp-servers/web-search-mcp/dist/index.js'
const MCP_CWD        = 'C:/mcp-servers/web-search-mcp'
const YAML_PATH      = 'data/facilities/concerthall.yaml'   // 読み取り専用ソース
const DRAFT_DIR      = 'data/facilities/draft'
const MAX_TOOL_TURNS = 8  // ループ上限

const TARGET_FIELDS = ['客席数', '舞台幅', '舞台奥行', '舞台高さ', '最寄駅']

// ── CLI 引数パース ────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (name) => { const i = args.indexOf(name); return i !== -1 ? args[i + 1] : null }
const hasFlag = (name) => args.includes(name)

const targetId = getArg('--id') ? Number(getArg('--id')) : null
const limit    = getArg('--limit') ? Number(getArg('--limit')) : Infinity
const dryRun   = hasFlag('--dry-run')
const debug    = hasFlag('--debug')
const modelArg = getArg('--model')

// ── ラン番号の決定（dry-run は既存番号を再利用） ─────────────
mkdirSync(DRAFT_DIR, { recursive: true })
function detectRunNumber() {
  let n = 1
  while (existsSync(`${DRAFT_DIR}/concerthall_${n}.yaml`)) n++
  return n
}
const RUN_NUMBER    = detectRunNumber()
const DRAFT_PATH    = `${DRAFT_DIR}/concerthall_${RUN_NUMBER}.yaml`
const PROGRESS_PATH = `data/facilities/.research-progress-${RUN_NUMBER}.json`

// ── MCP クライアント ──────────────────────────────────────────
class McpClient {
  #proc
  #rl
  #pending = new Map()
  #nextId = 1
  #started = false
  #readyResolve = null

  constructor() {
    this.#proc = spawn('node', [MCP_SERVER], {
      cwd: MCP_CWD,
      stdio: ['pipe', 'pipe', debug ? 'inherit' : 'ignore'],
    })

    this.#proc.on('error', err => {
      throw new Error(`MCP サーバー起動失敗: ${err.message}`)
    })

    this.#rl = createInterface({ input: this.#proc.stdout })
    this.#rl.on('line', line => {
      // サーバー起動完了メッセージを検出
      if (line.includes('Web Search MCP Server started')) {
        this.#started = true
        if (this.#readyResolve) { this.#readyResolve(); this.#readyResolve = null }
        return
      }

      // JSON-RPC レスポンスを処理
      if (!line.startsWith('{')) return
      try {
        const msg = JSON.parse(line)
        if (msg.jsonrpc !== '2.0' || msg.id == null) return
        const cb = this.#pending.get(Number(msg.id))
        if (cb) { this.#pending.delete(Number(msg.id)); cb(msg) }
      } catch {}
    })
  }

  waitForStart() {
    if (this.#started) return Promise.resolve()
    return new Promise((resolve, reject) => {
      this.#readyResolve = resolve
      setTimeout(() => {
        if (this.#readyResolve) {
          this.#readyResolve = null
          reject(new Error('MCP サーバーの起動がタイムアウトしました'))
        }
      }, 15000)
    })
  }

  #write(obj) {
    this.#proc.stdin.write(JSON.stringify(obj) + '\n')
  }

  #call(method, params) {
    const id = this.#nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id)
        reject(new Error(`MCP タイムアウト: ${method}`))
      }, 30000)
      this.#pending.set(id, msg => {
        clearTimeout(timer)
        resolve(msg)
      })
      this.#write({ jsonrpc: '2.0', id, method, params })
    })
  }

  async initialize() {
    await this.#call('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'research-facilities', version: '1.0.0' },
    })
    // initialized は通知なのでレスポンスなし
    this.#write({ jsonrpc: '2.0', method: 'notifications/initialized' })
  }

  async search(query) {
    const resp = await this.#call('tools/call', {
      name: 'full-web-search',
      arguments: { query, limit: 3 },
    })
    if (resp.error) return `検索エラー: ${resp.error.message}`
    return resp.result?.content?.[0]?.text ?? '検索結果が見つかりませんでした'
  }

  async fetchPage(url) {
    const resp = await this.#call('tools/call', {
      name: 'get-single-web-page-content',
      arguments: { url, maxContentLength: 6000 },
    })
    if (resp.error) return `取得エラー: ${resp.error.message}`
    return resp.result?.content?.[0]?.text ?? 'ページ内容を取得できませんでした'
  }

  close() {
    try { this.#rl.close() } catch {}
    try { this.#proc.kill() } catch {}
  }
}

let mcpClient

// ── ツール定義 ────────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'ウェブを検索し、上位ページのフルコンテンツを取得します。最初の調査に最適です。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '検索クエリ' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_page',
      description: '指定URLのページ内容を取得します。公式URLが分かっている場合に使用してください。',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '取得するURL' }
        },
        required: ['url']
      }
    }
  }
]

// ── ツール実装（MCP 経由）────────────────────────────────────
async function webSearch(query) {
  if (debug) console.log(`  🔍 web_search: ${query}`)
  return await mcpClient.search(query)
}

async function fetchPage(url) {
  if (debug) console.log(`  🌐 fetch_page: ${url}`)
  return await mcpClient.fetchPage(url)
}

async function executeTool(name, argsJson) {
  const a = JSON.parse(argsJson)
  if (name === 'web_search') return await webSearch(a.query)
  if (name === 'fetch_page') return await fetchPage(a.url)
  return `未知のツール: ${name}`
}

// ── LM Studio 接続確認・モデル取得 ───────────────────────────
async function getModel() {
  if (modelArg) return modelArg
  const res = await fetch(`${LM_STUDIO_BASE}/models`)
  if (!res.ok) throw new Error(`LM Studio に接続できません (${res.status})`)
  const { data } = await res.json()
  if (!data?.length) throw new Error('LM Studio にロード済みのモデルがありません')
  return data[0].id
}

// ── LM Studio へリクエスト（ツール呼び出しループ込み）────────
async function research(hall, model) {
  const address  = `${hall['都道府県']}${hall['市区町村']}${hall['番地以下']}`
  const urlLine  = hall['URL'] ? `公式URL: ${hall['URL']}` : ''
  const roomLine = hall['部屋名'] ? `部屋名: ${hall['部屋名']}` : ''

  const userPrompt = `
以下の日本のコンサートホールについて、web_search や fetch_page ツールを使って公式サイトやWikipediaを検索し、情報を収集してください。

施設名: ${hall['施設名']}
${roomLine ? roomLine + '\n' : ''}住所: ${address}
${urlLine}

調査が完了したら、次のJSON形式で回答してください。確認できなかった項目は null にしてください。
最寄駅は路線名・駅名・徒歩分数を配列で。複数路線がある場合はすべて含めてください。
備考は情報源URL・確認できた根拠・不確かな点を1〜2文で簡潔に記してください。

{"客席数": 1024, "舞台幅": 15.0, "舞台奥行": 12.0, "舞台高さ": 8.0, "最寄駅": [{"路線": "大阪メトロ長堀鶴見緑地線", "駅": "大阪ビジネスパーク駅", "駅徒歩": 5}], "備考": "公式サイト https://example.com/hall より取得。舞台高さは記載なし。"}
`.trim()

  const messages = [
    {
      role: 'system',
      content: 'あなたは日本のコンサートホール情報を調査するアシスタントです。必ず web_search や fetch_page ツールを使って情報を調べてから回答してください。',
    },
    { role: 'user', content: userPrompt },
  ]

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const isLastTurn = turn === MAX_TOOL_TURNS - 1

    const body = {
      model,
      messages,
      tools: TOOLS,
      tool_choice: isLastTurn ? 'none' : 'auto',
      temperature: 0.1,
    }

    // 最終ターンのみ JSON スキーマを強制
    if (isLastTurn) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'facility_research',
          schema: {
            type: 'object',
            properties: {
              客席数:   { type: ['integer', 'null'] },
              舞台幅:   { type: ['number',  'null'] },
              舞台奥行: { type: ['number',  'null'] },
              舞台高さ: { type: ['number',  'null'] },
              最寄駅: {
                type: ['array', 'null'],
                items: {
                  type: 'object',
                  properties: {
                    路線:   { type: ['string', 'null'] },
                    駅:     { type: 'string' },
                    駅徒歩: { type: ['integer', 'null'] },
                  },
                  required: ['駅'],
                  additionalProperties: false,
                },
              },
              備考: { type: ['string', 'null'], maxLength: 200 },
            },
            required: ['客席数', '舞台幅', '舞台奥行', '舞台高さ', '最寄駅', '備考'],
            additionalProperties: false,
          },
        },
      }
    }

    const res = await fetch(`${LM_STUDIO_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API エラー (${res.status}): ${text}`)
    }

    const data = await res.json()
    const choice = data.choices?.[0]
    if (!choice) throw new Error('レスポンスが空です')

    const assistantMsg = choice.message
    messages.push(assistantMsg)

    if (debug) console.log(`  [turn ${turn + 1}] finish_reason: ${choice.finish_reason}`)

    // ツール呼び出しがあれば実行して結果を返す
    if (choice.finish_reason === 'tool_calls' && assistantMsg.tool_calls?.length) {
      for (const toolCall of assistantMsg.tool_calls) {
        const result = await executeTool(toolCall.function.name, toolCall.function.arguments)
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }
      continue
    }

    // 最終回答
    const content = assistantMsg.content
    if (!content) throw new Error('最終レスポンスが空です')
    if (debug) console.log(`  RAW: ${content}`)

    try {
      const json = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
      return JSON.parse(json)
    } catch (e) {
      if (!debug) console.log(`  RAW: ${content}`)
      throw new Error(`JSON パース失敗: ${e.message}`)
    }
  }

  throw new Error('最大ループ回数に達しました')
}

// ── 数値検証 ─────────────────────────────────────────────────
function toValidNum(v) {
  if (v == null) return null
  const n = Number(v)
  return isNaN(n) || n <= 0 ? null : n
}

// ── 最寄駅配列の検証 ─────────────────────────────────────────
function toValidStations(v) {
  if (!Array.isArray(v) || v.length === 0) return null
  const stations = v
    .filter(s => s && typeof s === 'object' && typeof s['駅'] === 'string' && s['駅'].trim())
    .map(s => {
      const entry = {}
      if (s['路線'] && typeof s['路線'] === 'string' && s['路線'].trim()) {
        entry['路線'] = s['路線'].trim()
      }
      entry['駅'] = s['駅'].trim()
      if (s['駅徒歩'] != null) {
        const n = Math.round(Number(s['駅徒歩']))
        if (!isNaN(n) && n > 0) entry['駅徒歩'] = n
      }
      return entry
    })
  return stations.length > 0 ? stations : null
}

// ── メイン ───────────────────────────────────────────────────
console.log(`ラン番号: ${RUN_NUMBER}  draft → ${DRAFT_PATH}`)

const halls = parse(readFileSync(YAML_PATH, 'utf8'))

const progress = existsSync(PROGRESS_PATH)
  ? JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'))
  : { run: RUN_NUMBER, completed: [], results: {} }

// MCP サーバーを起動
mcpClient = new McpClient()
try {
  process.stdout.write('MCP サーバーを起動中...')
  await mcpClient.waitForStart()
  await mcpClient.initialize()
  console.log(' 完了')
} catch (e) {
  console.error(`\n❌ ${e.message}`)
  mcpClient.close()
  process.exit(1)
}

let model
try {
  model = await getModel()
  console.log(`モデル: ${model}`)
} catch (e) {
  console.error(`❌ ${e.message}`)
  mcpClient.close()
  process.exit(1)
}

const targets = halls.filter(h => {
  if (targetId !== null && h['ID'] !== targetId) return false
  if (progress.completed.includes(h['ID'])) return false
  return true
})

if (targets.length === 0) {
  console.log('処理対象がありません（すべて収集済みかスキップ済み）')
  mcpClient.close()
  process.exit(0)
}

console.log(`対象: ${targets.length} 件 (--dry-run: ${dryRun})`)

let processed = 0
for (const hall of targets) {
  if (processed >= limit) break

  const label = `[ID:${hall['ID']}] ${hall['施設名']}${hall['部屋名'] ? ` (${hall['部屋名']})` : ''}`
  process.stdout.write(`${label} ...\n`)

  try {
    const result = await research(hall, model)

    const update = {
      客席数:   toValidNum(result['客席数']),
      舞台幅:   toValidNum(result['舞台幅']),
      舞台奥行: toValidNum(result['舞台奥行']),
      舞台高さ: toValidNum(result['舞台高さ']),
      最寄駅:   toValidStations(result['最寄駅']),
    }

    const filled = Object.entries(update).filter(([, v]) => v != null).map(([k]) => k)
    console.log(filled.length > 0 ? `  ✓ ${filled.join(', ')} を取得` : '  （情報なし）')
    if (result['備考']) console.log(`  📝 ${result['備考']}`)

    if (!dryRun) {
      for (const [key, val] of Object.entries(update)) {
        if (val != null && hall[key] == null) hall[key] = val
      }
    }

    progress.completed.push(hall['ID'])
    progress.results[String(hall['ID'])] = {
      施設名: hall['施設名'],
      ...update,
      備考: result['備考'] ?? null,
    }
    if (!dryRun) writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf8')

  } catch (e) {
    console.log(`  ⚠ スキップ: ${e.message}`)
  }

  processed++
  if (processed < targets.length && processed < limit) {
    await new Promise(r => setTimeout(r, 1500))
  }
}

mcpClient.close()

if (!dryRun) {
  writeFileSync(DRAFT_PATH, dump(halls, { allowUnicode: true, lineWidth: 120, indent: 2 }), 'utf8')
  console.log(`\n✅ draft を出力しました: ${DRAFT_PATH}`)
  console.log(`   進捗ファイル:         ${PROGRESS_PATH}`)
} else {
  console.log('\n（dry-run: ファイルは変更されていません）')
}
