/**
 * ============================================================================
 * UNIFED - PROBATUM · unifed_panel_activator.js
 * ============================================================================
 * Versão      : v1.0.0 · FIX-ACHADO-A
 * Gerado em   : 2026-04-14
 * Conformidade: DORA (UE) 2022/2554 · Art. 125.º CPP · ISO/IEC 27037:2012
 * ============================================================================
 * ÂMBITO:
 *   Resolve o Achado A identificado no Relatório Técnico Forense
 *   (análise de 2026-04-14): window._activatePurePanel estava referenciada
 *   em script.js (linhas 3277, 4095, 4101, 8269) e em script_injection.js
 *   (linhas 1020, 1052) mas nunca definida em nenhum ficheiro entregue.
 *
 *   Sem esta função, o fluxo "CASO REAL ANONIMIZADO" executava a hidratação
 *   de dados correctamente, mas o #pureDashboardWrapper permanecia com
 *   opacity: 0 (estado inicial em index.html:507), tornando os resultados
 *   invisíveis ao utilizador apesar de existirem no DOM.
 *
 * ORDEM DE CARREGAMENTO OBRIGATÓRIA:
 *   Inserir ANTES de script.js no index.html:
 *   <script src="unifed_panel_activator.js"></script>
 *   <script src="script.js"></script>
 *   <script src="enrichment.js"></script>
 *   <script src="nexus.js"></script>
 *   <script src="script_injection.js"></script>
 *   <script src="unifed_triada_export.js"></script>
 *
 * GARANTIA DE IDEMPOTÊNCIA:
 *   Guarda _PANEL_ACTIVATOR_INSTALLED previne re-execução em double-load.
 * ============================================================================
 */

(function _installPanelActivator() {
    'use strict';

    if (window._PANEL_ACTIVATOR_INSTALLED === true) {
        console.info('[UNIFED-ACTIVATOR] Módulo já instalado. Ignorando re-instalação.');
        return;
    }
    window._PANEL_ACTIVATOR_INSTALLED = true;

    /**
     * _activatePurePanel(forceReset)
     * ─────────────────────────────
     * Torna visível o #pureDashboardWrapper e a secção #pureDashboard,
     * registando a activação no ForensicLogger quando disponível.
     *
     * @param {boolean} [forceReset=false]
     *   Quando true, repõe o wrapper a opacity:0 antes de animar —
     *   útil para garantir a transição visual mesmo em re-activações.
     * @returns {Promise<void>}
     *   Resolve após a transição CSS (300ms) ou imediatamente se o
     *   elemento não estiver presente (degradação silenciosa).
     */
    window._activatePurePanel = async function _activatePurePanel(forceReset) {
        const wrapper = document.getElementById('pureDashboardWrapper');
        const section = document.getElementById('pureDashboard');

        // ── Degradação silenciosa: elemento ainda não injectado no DOM ───────
        if (!wrapper && !section) {
            console.warn('[UNIFED-ACTIVATOR] #pureDashboardWrapper e #pureDashboard ausentes do DOM. ' +
                         'Activação adiada — o painel ainda pode não ter sido injectado.');
            return;
        }

        // ── Forçar visibilidade da secção raiz ────────────────────────────────
        if (section) {
            section.style.display    = 'block';
            section.style.visibility = 'visible';
        }

        if (!wrapper) {
            // Degradação: wrapper não existe, mas section existe — suficiente.
            console.warn('[UNIFED-ACTIVATOR] #pureDashboardWrapper ausente; usando #pureDashboard directamente.');
            return;
        }

        // ── [FIX ACHADO A] Transição de opacidade ────────────────────────────
        // O index.html define pureDashboardWrapper com opacity:0 por defeito.
        // A transição CSS (opacity 0→1) garante experiência visual consistente.
        if (forceReset === true) {
            wrapper.style.opacity    = '0';
            wrapper.style.transition = 'none';
            // Forçar reflow antes de restaurar transição
            void wrapper.offsetHeight;
        }

        wrapper.style.display    = 'block';
        wrapper.style.visibility = 'visible';
        wrapper.style.height     = 'auto';
        wrapper.style.overflow   = 'visible';
        wrapper.style.transition = 'opacity 0.3s ease';

        // Aguardar próximo frame de pintura para garantir que display:block
        // foi processado antes de iniciar a transição de opacidade.
        await new Promise(resolve => requestAnimationFrame(resolve));

        wrapper.style.opacity = '1';

        // Aguardar conclusão da transição CSS (300ms) antes de resolver
        await new Promise(resolve => setTimeout(resolve, 320));

        // ── Log de auditoria (não-bloqueante) ─────────────────────────────────
        try {
            if (typeof window.ForensicLogger !== 'undefined' &&
                typeof window.ForensicLogger.addEntry === 'function') {
                window.ForensicLogger.addEntry('PANEL_ACTIVATED', {
                    wrapperId: 'pureDashboardWrapper',
                    forceReset: !!forceReset,
                    timestamp: new Date().toISOString()
                });
            }
            if (typeof window.logAudit === 'function') {
                window.logAudit('[UNIFED-ACTIVATOR] #pureDashboardWrapper activado com sucesso.', 'success');
            }
        } catch (_logErr) {
            // Logging é não-crítico — nunca bloquear o fluxo principal
        }

        console.log('[UNIFED-ACTIVATOR] _activatePurePanel() concluída — painel visível.');
    };

    // ── CSS de segurança: impedir que regras externas escondam o wrapper ──────
    // Injecto inline para garantir presença mesmo antes de style.css carregar.
    (function _injectActivatorCSS() {
        const STYLE_ID = 'unifed-activator-safety-css';
        if (document.getElementById(STYLE_ID)) return;

        const style       = document.createElement('style');
        style.id          = STYLE_ID;
        style.textContent = `
            /* [UNIFED-ACTIVATOR] Garante que o wrapper não fica colapsado
               por regras de altura ou overflow conflituantes após activação */
            #pureDashboardWrapper.activated {
                display:    block    !important;
                opacity:    1        !important;
                height:     auto     !important;
                overflow:   visible  !important;
                visibility: visible  !important;
            }
            /* Transição suave sem interferir com animações existentes */
            #pureDashboardWrapper {
                transition: opacity 0.3s ease;
            }
        `;
        const target = document.head || document.documentElement;
        target.appendChild(style);
    })();

    console.log('[UNIFED-ACTIVATOR] window._activatePurePanel registada (v1.0.0 · FIX-ACHADO-A).');

})();
