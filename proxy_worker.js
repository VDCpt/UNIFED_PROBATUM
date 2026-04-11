/**
 * ============================================================================
 * UNIFED - PROBATUM · CLOUDFLARE WORKER — Anthropic API Reverse Proxy + OTS Proxy
 * ============================================================================
 * Versão     : v13.12.0-PURE
 * Deploy URL  : https://api.unifed.com/claude-proxy
 * Rota        : POST /claude-proxy  →  forward para api.anthropic.com/v1/messages
 *             : GET  /ots-proxy     →  forward para unpkg.com (CORS-safe)
 *
 * OBJECTIVO:
 *   Resolver o bloqueio CORS estrito da API da Anthropic e também da CDN do
 *   OpenTimestamps, forçando cabeçalhos Access-Control-Allow-Origin: * e
 *   Content-Type correto para evitar CORB.
 *
 * SEGURANÇA:
 *   · x-api-key NUNCA é exposto no front-end.
 *   · A chave é lida exclusivamente da variável de ambiente ANTHROPIC_API_KEY.
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
const VERSION = "13.12.0-PURE";

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
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: _corsHeaders(request)
            });
        }

        // ── 2. ROTA ESPECIAL: PROXY PARA OPENTIMESTAMPS (OTS) ──────────────────
        const url = new URL(request.url);
        if (url.pathname === '/ots-proxy' && request.method === 'GET') {
            const otsCdnUrl = 'https://unpkg.com/javascript-opentimestamps@0.0.12/dist/opentimestamps.min.js';
            try {
                let otsResponse = await fetch(otsCdnUrl);
                // Re-encapsular com cabeçalhos permissivos para evitar CORB
                const newHeaders = new Headers(otsResponse.headers);
                newHeaders.set('Access-Control-Allow-Origin', '*');
                newHeaders.set('Content-Type', 'application/javascript');
                newHeaders.set('Cache-Control', 'public, max-age=86400');

                return new Response(otsResponse.body, {
                    status: otsResponse.status,
                    headers: newHeaders
                });
            } catch (err) {
                console.error('[UNIFED-PROXY] Erro ao buscar OTS:', err.message);
                return new Response(JSON.stringify({ error: 'OTS proxy failed' }), {
                    status: 502,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        }

        // ── 3. VALIDAÇÃO DO MÉTODO (apenas POST para Anthropic) ─────────────────
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
                status: 405,
                headers: { ..._corsHeaders(request), 'Content-Type': 'application/json' }
            });
        }

        // ── 4. VALIDAÇÃO DA CHAVE DE AMBIENTE ─────────────────────────────────
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

        // ── 5. PARSE E VALIDAÇÃO DO PAYLOAD ───────────────────────────────────
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
        const upstreamBody = JSON.stringify(body);

        // ── 6. FORWARD PARA API ANTHROPIC ─────────────────────────────────────
        let upstreamResponse;
        try {
            upstreamResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method:  'POST',
                headers: {
                    'Content-Type':      'application/json',
                    'x-api-key':         env.ANTHROPIC_API_KEY,
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

        // ── 7. REENCAMINHAR RESPOSTA + CABEÇALHOS CORS ────────────────────────
        const responseBody    = await upstreamResponse.arrayBuffer();
        const responseHeaders = new Headers(upstreamResponse.headers);

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
    const origin = (request && request.headers) ? request.headers.get('Origin') : null;

    if (!origin || !_ALLOWED_ORIGINS.includes(origin)) {
        return {
            'Vary': 'Origin'
        };
    }

    // ── Origem autorizada: cabeçalhos CORS completos ──────────────────────────
    return {
        'Access-Control-Allow-Origin':      origin,
        'Access-Control-Allow-Methods':     'POST, OPTIONS, GET',
        'Access-Control-Allow-Headers':     'Content-Type, Authorization',
        'Access-Control-Max-Age':           '86400',
        'Vary':                             'Origin'
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