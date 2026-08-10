/**
 * Gemini API を使ったコンサートホール情報自動収集スクリプト
 *
 * 使い方:
 *   GEMINI_API_KEY=<key> node scripts/research-facilities-gemini.mjs
 *   node scripts/research-facilities-gemini.mjs --api-key <key>   # APIキー直接指定
 *   node scripts/research-facilities-gemini.mjs --id 30           # ID=30 のみ（動作確認用）
 *   node scripts/research-facilities-gemini.mjs --limit 5         # 最大5件
 *   node scripts/research-facilities-gemini.mjs --dry-run         # YAML書き込みなし
 *   node scripts/research-facilities-gemini.mjs --debug           # ツール呼び出しの詳細を表示
 *   node scripts/research-facilities-gemini.mjs --model <name>    # モデル指定（デフォルト: gemini-2.0-flash-lite）
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import jsyaml from 'js-yaml'

const { load: parse, dump } = jsyaml

const GEMINI_BASE    = 'https://generativelanguage.googleapis.com/v1beta/openai'
const DEFAULT_MODEL  = 'gemini-2.0-flash-lite'
const YAML_PATH      = 'data/facilities/concerthall.yaml'
const PROGRESS_PATH  = 'data/facilities/.research-progress.json'
const MAX_TOOL_TURNS = 8  // ループ上限

const TARGET_FIELDS = ['客席数', '舞台幅', '舞台奥行']

// ── CLI 引数パース ────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (name) => { const i = args.indexOf(name); return i !== -1 ? args[i + 1] : null }
const hasFlag = (name) => args.includes(name)

const targetId = getArg('--id') ? Number(getArg('--id')) : null
const limit    = getArg('--limit') ? Number(getArg('--limit')) : Infinity
const dryRun   = hasFlag('--dry-run')
const debug    = hasFlag('--debug')
const modelArg = getArg('--model')
const apiKey   = getArg('--api-key') || process.env.GEMINI_API_KEY

// ── ツール定義 ────────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'ウェブを検索して情報を取得します',
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
      description: '指定URLのページ内容を取得します',
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

// ── ツール実装 ────────────────────────────────────────────────
async function webSearch(query) {
  if (debug) console.log(`  🔍 web_search: ${query}`)
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&kl=jp-jp`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const data = await res.json()
    const parts = []
    if (data.Heading)      parts.push(`# ${data.Heading}`)
    if (data.AbstractText) parts.push(data.AbstractText)
    if (data.AbstractURL)  parts.push(`URL: ${data.AbstractURL}`)
    data.RelatedTopics?.slice(0, 5).forEach(t => t.Text && parts.push(`- ${t.Text}`))
    if (parts.length > 0) return parts.join('\n')
  } catch {}
  return '検索結果が見つかりませんでした'
}

async function fetchPage(url) {
  if (debug) console.log(`  🌐 fetch_page: ${url}`)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) return `ページ取得エラー: ${res.status}`
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000)
    return text || 'ページ内容を取得できませんでした'
  } catch (e) {
    return `エラー: ${e.message}`
  }
}

async function executeTool(name, argsJson) {
  const a = JSON.parse(argsJson)
  if (name === 'web_search') return await webSearch(a.query)
  if (name === 'fetch_page') return await fetchPage(a.url)
  return `未知のツール: ${name}`
}

// ── Gemini API キー確認・モデル取得 ──────────────────────────
async function getModel() {
  if (!apiKey) throw new Error('GEMINI_API_KEY が未設定です。環境変数か --api-key オプションで指定してください')
  return modelArg ?? DEFAULT_MODEL
}

// ── Gemini へリクエスト（ツール呼び出しループ込み）───────────
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

{"客席数": 1024, "舞台幅": 15.0, "舞台奥行": 12.0}
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
            },
            required: ['客席数', '舞台幅', '舞台奥行'],
            additionalProperties: false,
          },
        },
      }
    }

    let res, retryWait = 5000
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await fetch(`${GEMINI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })
      if (res.status !== 429) break
      const retryAfter = Number(res.headers.get('Retry-After') ?? 0) * 1000 || retryWait
      console.log(`  ⏳ レート制限 (429)。${Math.round(retryAfter / 1000)}秒後にリトライ...`)
      await new Promise(r => setTimeout(r, retryAfter))
      retryWait *= 2
    }

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

    const content = assistantMsg.content
    if (!content) throw new Error('最終レスポンスが空です')
    if (debug) console.log(`  RAW: ${content}`)

    try {
      return JSON.parse(content)
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

// ── メイン ───────────────────────────────────────────────────
const halls = parse(readFileSync(YAML_PATH, 'utf8'))

const progress = existsSync(PROGRESS_PATH)
  ? JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'))
  : { completed: [], results: {} }

let model
try {
  model = await getModel()
  console.log(`モデル: ${model}`)
} catch (e) {
  console.error(`❌ ${e.message}`)
  process.exit(1)
}

const targets = halls.filter(h => {
  if (targetId !== null && h['ID'] !== targetId) return false
  if (progress.completed.includes(h['ID'])) return false
  return TARGET_FIELDS.some(f => h[f] == null)
})

if (targets.length === 0) {
  console.log('処理対象がありません（すべて収集済みかスキップ済み）')
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
    }

    const filled = Object.entries(update).filter(([, v]) => v != null).map(([k]) => k)
    console.log(filled.length > 0 ? `  ✓ ${filled.join(', ')} を取得` : '  （情報なし）')

    if (!dryRun) {
      for (const [key, val] of Object.entries(update)) {
        if (val != null && hall[key] == null) hall[key] = val
      }
    }

    progress.completed.push(hall['ID'])
    progress.results[String(hall['ID'])] = update
    if (!dryRun) writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf8')

  } catch (e) {
    console.log(`  ⚠ スキップ: ${e.message}`)
  }

  processed++
  if (processed < targets.length && processed < limit) {
    await new Promise(r => setTimeout(r, 4000))
  }
}

if (!dryRun) {
  writeFileSync(YAML_PATH, dump(halls, { allowUnicode: true, lineWidth: 120, indent: 2 }), 'utf8')
  console.log(`\n✅ ${YAML_PATH} を更新しました`)
} else {
  console.log('\n（dry-run: ファイルは変更されていません）')
}
