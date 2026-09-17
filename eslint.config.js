import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // いずれも生成物。src/data は build-data.mjs、coverage は vitest が出す
  globalIgnores(['dist', 'src/data', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // ビルド・検査スクリプト。Node で直接動かす素の ESM なので React 系の規則は当てない
  {
    files: ['**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // 失敗を既定値で握り潰すのが正しい箇所（fetch のフォールバック・best-effort な close）がある
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
])
