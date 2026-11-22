import { fileURLToPath } from 'node:url'
import { isIP } from 'node:net'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const diretorio = fileURLToPath(new URL('.', import.meta.url))
const origensDistribuicao = {
  production: 'PNT_API_ORIGIN_PRODUCTION',
  homologation: 'PNT_API_ORIGIN_HOMOLOGATION',
}

function lerOrigem(ambiente, nome, distribuicao) {
  const valor = ambiente[nome]?.trim()
  if (!valor) throw new Error(`Configure ${nome} para este modo.`)

  let url
  try { url = new URL(valor) } catch { throw new Error(`${nome} deve ser uma origem HTTP ou HTTPS válida.`) }
  if (!/^https?:\/\/[^/?#]+\/?$/i.test(valor) || url.username || url.password || url.pathname !== '/') {
    throw new Error(`${nome} deve conter somente a origem da API, sem credenciais, caminho, query ou fragmento.`)
  }
  if (distribuicao) {
    const host = url.hostname.replace(/\.$/, '')
    if (url.protocol !== 'https:' || !host.includes('.') || isIP(host)
      || /(?:^|\.)(localhost|localdomain|local|internal|lan|home|test)$|\.home\.arpa$/.test(host)) {
      throw new Error(`${nome} deve usar HTTPS em um domínio não local.`)
    }
  }
  return url
}

export function validarApi(env, command, mode) {
  const distribuicao = command === 'build' || mode !== 'development'
  if (distribuicao && !Object.hasOwn(origensDistribuicao, mode)) {
    throw new Error('Modo inválido. Use production ou homologation para builds de distribuição.')
  }

  const api = lerOrigem(env, 'VITE_API_URL', distribuicao)
  if (distribuicao) {
    const producao = lerOrigem(env, origensDistribuicao.production, true)
    const homologacao = lerOrigem(env, origensDistribuicao.homologation, true)
    if (producao.hostname.replace(/\.$/, '') === homologacao.hostname.replace(/\.$/, '')) {
      throw new Error('Produção e homologação devem usar domínios de API distintos.')
    }
    const esperada = mode === 'production' ? producao : homologacao
    if (api.origin !== esperada.origin) {
      throw new Error(`VITE_API_URL deve corresponder a ${origensDistribuicao[mode]} neste modo.`)
    }
  }
  return api.origin
}

export default defineConfig(({ command, mode, isPreview }) => {
  if (isPreview) return { plugins: [react()] }

  const env = loadEnv(mode, diretorio, ['VITE_API_URL', 'PNT_API_ORIGIN_'])
  const origemApi = validarApi(env, command, mode)

  return {
    plugins: [react()],
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origemApi) },
  }
})
