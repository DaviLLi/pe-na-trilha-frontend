import { readFileSync } from 'node:fs'
import { isIP } from 'node:net'
import process from 'node:process'
import { parseEnv } from 'node:util'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const modosLocais = {
  production: { host: 'localhost', port: 5173, api: 'http://localhost:3000' },
  homologation: { host: '127.0.0.1', port: 5174, api: 'http://127.0.0.1:3001' },
}

export function validarApi(env, command, mode) {
  if (!Object.hasOwn(modosLocais, mode)) {
    throw new Error('Use o modo production ou homologation.')
  }
  if (command === 'serve' || mode === 'homologation') return modosLocais[mode].api

  const valor = env.VITE_API_URL?.trim()
  if (!valor) throw new Error('Configure VITE_API_URL com a origem HTTPS da API de produção.')
  let url
  try {
    url = new URL(valor)
  } catch {
    throw new Error('VITE_API_URL deve ser uma origem HTTPS válida.')
  }
  const host = url.hostname.replace(/\.$/, '')
  if (!/^https:\/\/[^/?#]+\/?$/i.test(valor) || url.username || url.password
    || !host.includes('.') || isIP(host)
    || /(?:^|\.)(localhost|localdomain|local|internal|lan|home|test)$|\.home\.arpa$/.test(host)) {
    throw new Error('VITE_API_URL deve usar HTTPS em um domínio não local, sem credenciais, caminho, query ou fragmento.')
  }
  return url.origin
}

function ambienteProducao() {
  if (process.env.VITE_API_URL !== undefined) return { VITE_API_URL: process.env.VITE_API_URL }
  try {
    return parseEnv(readFileSync(new URL('./.env.production', import.meta.url), 'utf8'))
  } catch (erro) {
    if (erro.code === 'ENOENT') return {}
    throw erro
  }
}

export default defineConfig(({ command, mode, isPreview }) => {
  if (isPreview) return { plugins: [react()], envDir: false }

  const origemApi = validarApi(command === 'build' && mode === 'production' ? ambienteProducao() : {}, command, mode)
  const { host, port } = modosLocais[mode]

  return {
    plugins: [react()],
    envDir: false,
    server: { host, port, strictPort: true },
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origemApi) },
  }
})
