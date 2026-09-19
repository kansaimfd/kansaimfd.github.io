import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 同じ作業ツリーで複数の dev サーバーが並ぶことがあるので（.claude/launch.json の
// autoPort が PORT で空きポートを渡す）、指定があればそれを使う
const port = Number(process.env.PORT) || undefined

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: { port, strictPort: port !== undefined },
  preview: { port, strictPort: port !== undefined },
})
