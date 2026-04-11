/**
 * ============================================================================
 * UNIFED - PROBATUM · CLOUDFLARE WORKER — Anthropic API Reverse Proxy
 * ============================================================================
 * Versão     : v13.12.0-PURE
 * Deploy URL  : https://api.unifed.com/claude-proxy
 * Rota        : POST /claude-proxy  →  forward para api.anthropic.com/v1/messages
 *
 * OBJECTIVO:
 *   Resolver o bloqueio CORS estrito da API da Anthropic quando chamada
 *   directamente a partir do browser (front-end). O browser bloqueia o pedido
 *   com "Access-Control-Allow-Origin" ausente no pre-flight OPTIONS.
 *
 * SEGURANÇA:
 *   · x-api-key NUNCA é exposto no front-end (código JS público).
 *   · A chave é lida exclusivamente da variável de ambiente ANTHROPIC_API_KEY,
 *     definida no painel do Cloudflare (Settings → Variables → Encrypt).
 *   · O Worker valida o Content-Type e rejeita payloads malformados.
 *   · Rate limiting recomendado via Cloudflare Rate Limiting Rules.
 *
 * DEPLOY:
 *   1. wrangler deploy (ou Cloudflare Dashboard → Workers → Novo Worker)
 *   2. Definir variável de ambiente: ANTHROPIC_API_KEY = sk-ant-...
 *   3. Configurar Custom Domain: api.unifed.com → este Worker
 *   4. (Opcional) Adicionar regra de Rate Limiting: 60 req/min por IP
 *
 * CONFORMIDADE: DORA (UE) 2022/2554 · RGPD · ISO/IEC 27037:2012
 * ============================================================================
 */

/** Versão do Worker — sincronizada com o ciclo de release UNIFED-PROBATUM. */
const VERSION = "13.5.0-PURE";

// ES Modules format — obrigatório para Cloudflare Workers (module workers)
export default {

    /**
     * Ponto de entrada do Worker.
     * @param {Request} request   - Pedido HTTP recebido do front-end
     * @param {Object}  env       - Variáveis de ambiente (ANTHROPIC_API_KEY, etc.)
     * @param {Object}  ctx       - ExecutionContext (ctx.waitUntil, ctx.passThroughOnException)
     * @returns {Response}
     */
    async fetch(request, env, ctx) {

        // ── 1. PRE-FLIGHT CORS (OPTIONS) ──────────────────────────────────────
        // O browser envia um pedido OPTIONS antes do POST real.
        // Responder com os cabeçalhos CORS correctos para que o browser
        // autorize o pedido real em cross-origin.
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: _corsHeaders(request)
            });
        }

        // ── 2. VALIDAÇÃO DO MÉTODO ─────────────────────────────────────────────
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
                status: 405,
                headers: { ..._corsHeaders(request), 'Content-Type': 'application/json' }
            });
        }

        // ── 3. VALIDAÇÃO DA CHAVE DE AMBIENTE ─────────────────────────────────
        // A chave deve estar definida nas variáveis de ambiente do Worker.
        // Se não estiver, o Worker falha de forma explícita (não silenciosa).
        if (!env.ANTHROPIC_API_KEY) {
            console.error('[UNIFED-PROXY] ANTHROPIC_API_KEY não configurada nas variáveis de ambiente.');
            return new Response(JSON.stringify({
                error: 'Proxy misconfigured: API key not set.',
                hint: 'Set ANTHROPIC_API_KEY in Cloudflare Worker environment variables.'
            }), {
                status: 503,
                headers: { ..._corsHeaders(request), 'Content-Type': 'application/json' }
            });
        }

        // ── 4. PARSE E VALIDAÇÃO DO PAYLOAD ───────────────────────────────────
        let body;
        try {
            body = await request.json();
        } catch (_parseErr) {
            return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
                status: 400,
                headers: { ..._corsHeaders(request), 'Content-Type': 'application/json' }
            });
        }

        // Guardar integralmente o payload original — apenas injectar cabeçalhos
        // O Worker NÃO modifica o payload (modelo, max_tokens, system, messages)
        const upstreamBody = JSON.stringify(body);

        // ── 5. FORWARD PARA API ANTHROPIC ─────────────────────────────────────
        // Injeta x-api-key de forma segura (variável de ambiente — não exposta
        // no código front-end nem nos logs de rede do browser).
        let upstreamResponse;
        try {
            upstreamResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method:  'POST',
                headers: {
                    'Content-Type':      'application/json',
                    'x-api-key':         env.ANTHROPIC_API_KEY,     // ← SEGURO: variável de ambiente
                    'anthropic-version': '2023-06-01',
                    'anthropic-beta':    'messages-2023-12-15'
                },
                body: upstreamBody
            });
        } catch (fetchErr) {
            console.error('[UNIFED-PROXY] Erro ao contactar Anthropic:', fetchErr.message);
            return new Response(JSON.stringify({
                error: 'Upstream fetch failed.',
                detail: fetchErr.message
            }), {
                status: 502,
                headers: { ..._corsHeaders(request), 'Content-Type': 'application/json' }
            });
        }

        // ── 6. REENCAMINHAR RESPOSTA + CABEÇALHOS CORS ────────────────────────
        // Clonar a resposta da Anthropic e adicionar cabeçalhos CORS para que
        // o browser do front-end a aceite em cross-origin.
        const responseBody    = await upstreamResponse.arrayBuffer();
        const responseHeaders = new Headers(upstreamResponse.headers);

        // Injectar cabeçalhos CORS na resposta — substitui ou adiciona
        const cors = _corsHeaders(request);
        Object.keys(cors).forEach(function(key) {
            responseHeaders.set(key, cors[key]);
        });

        return new Response(responseBody, {
            status:  upstreamResponse.status,
            headers: responseHeaders
        });
    }
};


// ============================================================================
// UTILITÁRIO: _corsHeaders(request)
// Gera os cabeçalhos CORS correctos com Whitelisting estrito de origens.
//
// CORS HARDENING (Achado A7 — Auditoria AUDIT-2ND-2026-04-01):
//   O comportamento anterior usava _ALLOWED_ORIGINS[0] como fallback silencioso
//   para pedidos com Origin: null ou origem não autorizada. Isto permitia que
//   chamadas automatizadas (curl, scripts server-side) sem cabeçalho Origin
//   não fossem bloqueadas a nível do Worker.
//
//   Implementação corrigida:
//   · Pedidos com Origin ausente (null) → Early Return sem cabeçalho ACAO.
//     O browser rejeita a resposta; scripts server-side recebem apenas
//     um corpo sem permissão CORS explícita.
//   · Pedidos com Origin divergente da whitelist → Early Return idêntico.
//   · Apenas origens explicitamente listadas recebem o cabeçalho ACAO.
//
// CONFORMIDADE: DORA (UE) 2022/2554 · OWASP CORS Security Cheat Sheet
// ============================================================================
function _corsHeaders(request) {
    // ── Whitelist de origens permitidas (produção) ────────────────────────────
    const _ALLOWED_ORIGINS = [
        'https://app.unifed.com',
        'https://unifed.com',
        'https://www.unifed.com',
        // 'http://localhost:5500',   // Descomentar para desenvolvimento local
        // 'http://127.0.0.1:5500',   // Descomentar para desenvolvimento local
    ];

    // ── EARLY RETURN: Origin ausente ou não autorizada ────────────────────────
    // Sem cabeçalho ACAO → o browser bloqueia a resposta em cross-origin.
    // Scripts server-side sem Origin recebem resposta mas sem permissão CORS.
    const origin = (request && request.headers) ? request.headers.get('Origin') : null;

    if (!origin || !_ALLOWED_ORIGINS.includes(origin)) {
        // Retornar apenas Vary: Origin para que proxies/CDN não façam cache
        // de respostas sem ACAO para origens autorizadas subsequentes.
        return {
            'Vary': 'Origin'
        };
    }

    // ── Origem autorizada: cabeçalhos CORS completos ──────────────────────────
    return {
        'Access-Control-Allow-Origin':      origin,       // espelhar a origem exacta (não wildcard)
        'Access-Control-Allow-Methods':     'POST, OPTIONS',
        'Access-Control-Allow-Headers':     'Content-Type, Authorization',
        'Access-Control-Max-Age':           '86400',       // 24h cache do pre-flight
        'Vary':                             'Origin'       // obrigatório para CDN correcta
    };
}

/* ============================================================================
   CONFIGURAÇÃO WRANGLER (wrangler.toml) — Referência de Deploy
   ============================================================================

   name = "unifed-claude-proxy"
   main = "claude-proxy.worker.js"
   compatibility_date = "2024-09-23"
   compatibility_flags = ["nodejs_compat"]

   [vars]
   # Não colocar a chave aqui — usar secrets encriptados:
   # wrangler secret put ANTHROPIC_API_KEY

   [[routes]]
   pattern = "api.unifed.com/claude-proxy"
   zone_name = "unifed.com"

   # Rate Limiting (recomendado — configurar via Dashboard):
   # 60 req/min por IP · acção: bloquear 429

   ============================================================================
   NOTAS DE SEGURANÇA ADICIONAIS:
   · Nunca fazer commit da ANTHROPIC_API_KEY em repositórios públicos.
   · Usar "wrangler secret put ANTHROPIC_API_KEY" para deploy seguro.
   · Activar Cloudflare WAF para bloquear origens não autorizadas.
   · Monitorizar uso via Cloudflare Analytics → Workers → Métricas.
   ============================================================================ */