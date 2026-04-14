/**
 * ============================================================================
 * UNIFED - PROBATUM · CLOUDFLARE WORKER — Anthropic API Reverse Proxy + OTS Proxy
 * ============================================================================
 * Versão     : v13.12.1-FIX (consolidado)
 * Deploy URL  : https://api.unifed.com/claude-proxy
 * Rotas       : POST /claude-proxy  →  forward para api.anthropic.com/v1/messages
 *             : GET  /ots-proxy     →  forward dinâmico para URL fornecida (CORS-safe)
 *             : GET  /health        →  health check (retorna 200)
 *
 * OBJECTIVO:
 *   Resolver o bloqueio CORS estrito da API da Anthropic e também de CDNs externas
 *   (OpenTimestamps, etc.) fornecendo um proxy que injecta cabeçalhos
 *   Access-Control-Allow-Origin: * e Content-Type adequado.
 *
 * SEGURANÇA:
 *   · x-api-key NUNCA é exposto no front-end.
 *   · A chave é lida exclusivamente da variável de ambiente ANTHROPIC_API_KEY.
 *   · O proxy OTS restringe os domínios permitidos (whitelist) para evitar abuso.
 *   · Rate limiting recomendado via Cloudflare Rate Limiting Rules.
 *   · CORS com whitelist estrita (apenas domínios oficiais).
 *
 * DEPLOY:
 *   1. wrangler deploy (ou Cloudflare Dashboard → Workers → Novo Worker)
 *   2. Definir variável de ambiente: ANTHROPIC_API_KEY = sk-ant-...
 *   3. Configurar Custom Domain: api.unifed.com → este Worker
 *   4. (Opcional) Adicionar regra de Rate Limiting: 60 req/min por IP
 *
 * CONFORMIDADE: DORA (UE) 2022/2554 · RGPD · ISO/IEC 27037:2012 · eIDAS
 * ============================================================================
 */

const VERSION = "13.12.1-FIX";

const ALLOWED_OTS_DOMAINS = [
    'unpkg.com',
    'cdn.jsdelivr.net',
    'raw.githubusercontent.com',
    'github.com',
    'cdn.skypack.dev',
    'esm.sh'
];

const ALLOWED_CORS_ORIGINS = [
    'https://unifed.com',
    'https://api.unifed.com'
];

export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: getHeaders(request)
            });
        }

        const url = new URL(request.url);
        if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
            return new Response(JSON.stringify({
                status: 'ok',
                version: VERSION,
                service: 'UNIFED-API-Gateway'
            }), {
                status: 200,
                headers: {
                    ...getHeaders(request),
                    'Content-Type': 'application/json'
                }
            });
        }

        if (url.pathname === '/ots-proxy' && request.method === 'GET') {
            const targetUrlParam = url.searchParams.get('url');
            if (!targetUrlParam) {
                return new Response(JSON.stringify({ error: 'Missing ?url parameter' }), {
                    status: 400,
                    headers: {
                        ...getHeaders(request),
                        'Content-Type': 'application/json'
                    }
                });
            }

            let targetUrl;
            try {
                targetUrl = new URL(targetUrlParam);
            } catch (_) {
                return new Response(JSON.stringify({ error: 'Invalid URL parameter' }), {
                    status: 400,
                    headers: {
                        ...getHeaders(request),
                        'Content-Type': 'application/json'
                    }
                });
            }

            if (targetUrl.protocol !== 'https:' && targetUrl.protocol !== 'http:') {
                return new Response(JSON.stringify({ error: 'Only HTTP/HTTPS allowed' }), {
                    status: 403,
                    headers: {
                        ...getHeaders(request),
                        'Content-Type': 'application/json'
                    }
                });
            }

            if (!ALLOWED_OTS_DOMAINS.includes(targetUrl.hostname)) {
                console.warn(`[UNIFED-PROXY] Domínio não autorizado no proxy OTS: ${targetUrl.hostname}`);
                return new Response(JSON.stringify({ error: 'Domain not allowed' }), {
                    status: 403,
                    headers: {
                        ...getHeaders(request),
                        'Content-Type': 'application/json'
                    }
                });
            }

            try {
                let otsResponse = await fetch(targetUrl.toString(), {
                    headers: {
                        'User-Agent': 'UNIFED-Forensic-Bot/1.0'
                    }
                });

                const newHeaders = new Headers(otsResponse.headers);
                const corsHeaders = getHeaders(request);
                Object.keys(corsHeaders).forEach(key => {
                    newHeaders.set(key, corsHeaders[key]);
                });
                let contentType = otsResponse.headers.get('Content-Type');
                if (!contentType || contentType.includes('text/plain')) {
                    if (targetUrl.pathname.endsWith('.js')) {
                        contentType = 'application/javascript';
                    } else if (targetUrl.pathname.endsWith('.css')) {
                        contentType = 'text/css';
                    } else {
                        contentType = contentType || 'application/octet-stream';
                    }
                }
                newHeaders.set('Content-Type', contentType);
                newHeaders.set('Cache-Control', 'public, max-age=86400');

                return new Response(otsResponse.body, {
                    status: otsResponse.status,
                    headers: newHeaders
                });
            } catch (err) {
                console.error('[UNIFED-PROXY] Erro ao buscar recurso externo:', err.message);
                return new Response(JSON.stringify({ error: 'OTS proxy fetch failed', detail: err.message }), {
                    status: 502,
                    headers: {
                        ...getHeaders(request),
                        'Content-Type': 'application/json'
                    }
                });
            }
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
                status: 405,
                headers: {
                    ...getHeaders(request),
                    'Content-Type': 'application/json'
                }
            });
        }

        if (!env.ANTHROPIC_API_KEY) {
            console.error('[UNIFED-PROXY] ANTHROPIC_API_KEY não configurada nas variáveis de ambiente.');
            return new Response(JSON.stringify({
                error: 'Proxy misconfigured: API key not set.',
                hint: 'Set ANTHROPIC_API_KEY in Cloudflare Worker environment variables.'
            }), {
                status: 503,
                headers: {
                    ...getHeaders(request),
                    'Content-Type': 'application/json'
                }
            });
        }

        let body;
        try {
            body = await request.json();
        } catch (_parseErr) {
            return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
                status: 400,
                headers: {
                    ...getHeaders(request),
                    'Content-Type': 'application/json'
                }
            });
        }

        const upstreamBody = JSON.stringify(body);

        let upstreamResponse;
        try {
            upstreamResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': env.ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01',
                    'anthropic-beta': 'messages-2023-12-15'
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
                headers: {
                    ...getHeaders(request),
                    'Content-Type': 'application/json'
                }
            });
        }

        const responseBody = await upstreamResponse.arrayBuffer();
        const responseHeaders = new Headers(upstreamResponse.headers);

        const cors = getHeaders(request);
        Object.keys(cors).forEach(function(key) {
            responseHeaders.set(key, cors[key]);
        });

        return new Response(responseBody, {
            status: upstreamResponse.status,
            headers: responseHeaders
        });
    }
};

function getHeaders(request) {
    const origin = (request && request.headers) ? request.headers.get('Origin') : null;

    if (!origin || !ALLOWED_CORS_ORIGINS.includes(origin)) {
        return {
            'Vary': 'Origin',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY'
        };
    }

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
    };
}