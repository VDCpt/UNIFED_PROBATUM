/**
 * UNIFED - PROBATUM · NEXUS LAYER · v13.12.2-i18n
 * ============================================================================
 * NOTA: Este ficheiro permanece inalterado na sua lógica central.
 * ============================================================================
 */

'use strict';

window.UNIFEDSystem = window.UNIFEDSystem || {};

(function _nexusForensicProxy() {
    if (window.fetch.__isNexusProxy) { console.info('[NEXUS·M1] Proxy Wrapper já está activo.'); return; }
    const originalFetch = window.fetch;
    const handler = {
        apply: function(target, thisArg, argumentsList) {
            const url = argumentsList[0];
            if (typeof url === 'string') console.debug(`[NEXUS-AUDIT] Network Call: ${url}`);
            return Reflect.apply(target, thisArg, argumentsList).catch(err => {
                const reqUrl = argumentsList[0];
                if (typeof reqUrl === 'string' && reqUrl.includes('api.unifed.com')) throw err;
                console.warn(`[NEXUS-AUDIT] Falha de comunicação externa: ${reqUrl} | Motivo: ${err.message}`);
                throw err;
            });
        }
    };
    const proxiedFetch = new Proxy(originalFetch, handler);
    proxiedFetch.__isNexusProxy = true;
    window.fetch = proxiedFetch;
    console.info('[NEXUS·M1] ✅ Passive Network Observer activo.');
})();

(function _nexusRAGJurisprudential() {
    var _JURISPRUDENCE_KB = {
        rgit103: { artigo: 'Art. 103.o RGIT — Fraude Fiscal', texto: 'Constituem fraude fiscal as condutas ilegitimas tipificadas...' },
        rgit104: { artigo: 'Art. 104.o RGIT — Fraude Fiscal Qualificada', texto: 'Os factos previstos no artigo anterior sao puniveis com prisao de 1 a 5 anos...' },
        civa78: { artigo: 'Art. 78.o CIVA — Regularizacoes', texto: 'Os sujeitos passivos podem proceder a deducao do imposto...' },
        civa2: { artigo: 'Art. 2.o CIVA — Incidencia Subjectiva', texto: 'As plataformas digitais de intermediacao de servicos de transporte sao sujeitos passivos de IVA...' },
        cpp125: { artigo: 'Art. 125.o CPP — Admissibilidade da Prova Digital', texto: 'Sao admissiveis todos os meios de prova nao proibidos por lei...' }
    };
    var _STA_ACORDAOS = [
        { proc: 'Proc. 01080/17.3BELRS', tribunal: 'Supremo Tribunal Administrativo — 2.a Seccao', data: '27.09.2023', sumario: 'A plataforma falha no reporte da Contraprestacao Total...' },
        { proc: 'Proc. 0456/19.8BEPRT', tribunal: 'Supremo Tribunal Administrativo — Pleno da Seccao', data: '14.03.2024', sumario: 'A discrepancia entre o valor retido nos extratos da plataforma e o valor faturado constitui evidencia de preco de transferencia dissimulado.' }
    ];
    function _xe(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function _para(text, bold, size, color, align) { /* ... */ return '<w:p>...</w:p>'; }
    function _hr() { return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="003366"/></w:pBdr><w:spacing w:before="120" w:after="120"/></w:pPr></w:p>'; }
    function _tc(text, bold, w, shade) { return '<w:tc>...</w:tc>'; }
    function _tr(cells) { return '<w:tr>' + cells.join('') + '</w:tr>'; }
    function _buildJurisprudenceXML(analysis) { return '<w:tbl>...</w:tbl>'; }
    function _installDOCXHook() { /* ... */ }
    _installDOCXHook();
})();

(function _nexusForecastATF() {
    var _FORECAST_MONTHS = 6;
    function _linearRegression(series) { /* ... */ return { slope, intercept }; }
    function _emaSmoothing(series, alpha) { /* ... */ return ema; }
    function _advanceMonth(aaaamm, n) { /* ... */ return year + month; }
    function _computeForecast(monthlyData) { /* ... */ return forecast; }
    function _injectForecastIntoChart(forecast, historicLen) { /* ... */ }
    function _injectRiscoFuturoPanel(forecast) { /* ... */ }
    function _installATFHook() { /* ... */ }
    _installATFHook();
})();

(function _nexusBlockchainExplorer() {
    var _EXPLORER_INJECTED = false;
    var _EXPLORER_MODAL_ID = 'nexusBlockchainExplorerModal';
    async function _sha256Nexus(content) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(String(content) + 'NEXUS_DIAMOND_SALT_2024');
            const buf = await crypto.subtle.digest('SHA-256', data);
            const arr = Array.from(new Uint8Array(buf));
            return arr.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        } catch (e) {
            console.error('[NEXUS] Falha crítica na geração de SHA-256:', e);
            throw new Error('Ambiente não seguro para geração de SHA-256. A perícia não pode continuar.');
        }
    }
    function _collectDocumentRegistry() { /* ... */ return registry; }
    async function _openBlockchainExplorerModal() { /* ... */ }
    function injectBlockchainExplorerUI() { /* ... */ }
    window.injectBlockchainExplorerUI = injectBlockchainExplorerUI;
    window.nexusOpenBlockchainExplorer = _openBlockchainExplorerModal;
    window.addEventListener('UNIFED_CORE_READY', function() { setTimeout(injectBlockchainExplorerUI, 2000); }, { once: true });
})();

(function _nexusCore() {
    window.addEventListener('error', function(e) {
        if (e.target && e.target.tagName === 'SCRIPT' && e.target.src && e.target.src.includes('opentimestamps')) {
            console.info('[NEXUS] 🛡️ Cadeia de Custódia operando em Nível 1 (Offline/Local).');
            if (window.UNIFEDSystem) window.UNIFEDSystem.integrityLevel = 'LEVEL_1_LOCAL';
        }
    }, true);
    if (window.fetch && !window.fetch.__nexusWrapped) {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            if (typeof url === 'string' && url.includes('api.unifed.com')) return originalFetch.apply(this, args).catch(err => { console.debug('[NEXUS] Requisição para api.unifed.com falhou (CORS esperado).', err.message); throw err; });
            return originalFetch.apply(this, args);
        };
        window.fetch.__nexusWrapped = true;
    }
    if (window.UNIFEDSystem && window.UNIFEDSystem.utils) {
        window.UNIFEDSystem.utils.sealCanvas = function(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const sessionHash = window.UNIFEDSystem.masterHash || 'UNIFED-FIX-PENDING';
            ctx.save();
            ctx.font = '8px "JetBrains Mono", "Courier New", monospace';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText(`CUSTÓDIA: ${sessionHash.substring(0, 16)}...`, 5, canvas.height - 5);
            ctx.restore();
        };
    } else {
        if (!window.UNIFEDSystem) window.UNIFEDSystem = {};
        if (!window.UNIFEDSystem.utils) window.UNIFEDSystem.utils = {};
        window.UNIFEDSystem.utils.sealCanvas = function(canvasId) { /* fallback */ };
    }
    console.log('[NEXUS] Camada adaptativa carregada.');
})();

(function _enforceBilingualIntegrity() {
    if (window.__nexusBilingualObserverActive) return;
    window.__nexusBilingualObserverActive = true;
    const _enforceBilingualIntegrity = function() {
        const observer = new MutationObserver((mutations, obs) => {
            obs.disconnect();
            const lang = document.documentElement.lang === 'en' ? 'en' : 'pt';
            document.querySelectorAll('[data-' + lang + ']').forEach(el => {
                const targetText = el.getAttribute('data-' + lang).trim();
                if (el.textContent.trim() !== targetText && !el.querySelector('i')) el.textContent = targetText;
            });
            obs.observe(document.body, { childList: true, subtree: true });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        console.info('[NEXUS·M5] ✅ Bilingual Integrity Observer activo.');
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _enforceBilingualIntegrity);
    else _enforceBilingualIntegrity();
})();

console.info('%c[NEXUS · UNIFED-PROBATUM · v13.12.2-i18n]', 'color:#00E5FF;font-family:Courier New,monospace;font-weight:700;');