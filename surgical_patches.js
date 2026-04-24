/* ============================================================================
   UNIFED-PROBATUM · SURGICAL PATCHES v1.0 — 2026-04-23
   ============================================================================
   Perito       : UNIFED-Probatum Debug Engine
   Âmbito       : Retificações cirúrgicas sem alteração de fórmulas de cálculo
   Ficheiros    : script_injection.js · script.js
   Método       : Search-and-Replace exacto (string match)
   ============================================================================ */


/* ============================================================================
   PATCH #1 — script_injection.js · Linha 542
   FALHA    : TypeError: Cannot read properties of null (reading 'substring')
   CAUSA    : data.masterHash pode ser null quando _unifedDataLoaded é true
              mas o campo não foi ainda hidratado pelo motor de análise
   IMPACTO  : Console F12 · quebra de renderização do hash no VEREDICTO
   ============================================================================ */

// ─── REMOVER (linha 542 original): ────────────────────────────────────────
'pure-hash-prefix': (sys && sys.masterHash) ? sys.masterHash.substring(0, 12).toUpperCase() + '...' : (window._unifedDataLoaded === true ? data.masterHash.substring(0, 12) + '...' : '---'),

// ─── SUBSTITUIR POR: ───────────────────────────────────────────────────────
'pure-hash-prefix': (sys && sys.masterHash) ? sys.masterHash.substring(0, 12).toUpperCase() + '...' : (window._unifedDataLoaded === true ? ((data.masterHash || '').substring(0, 12) + '...') : '---'),


/* ============================================================================
   PATCH #2 — script_injection.js · Linha 543
   FALHA    : Idêntica à linha 542 — pure-hash-prefix-verdict
   ============================================================================ */

// ─── REMOVER (linha 543 original): ────────────────────────────────────────
'pure-hash-prefix-verdict': (sys && sys.masterHash) ? sys.masterHash.substring(0, 16).toUpperCase() + '...' : (window._unifedDataLoaded === true ? data.masterHash.substring(0, 16) + '...' : '---'),

// ─── SUBSTITUIR POR: ───────────────────────────────────────────────────────
'pure-hash-prefix-verdict': (sys && sys.masterHash) ? sys.masterHash.substring(0, 16).toUpperCase() + '...' : (window._unifedDataLoaded === true ? ((data.masterHash || '').substring(0, 16) + '...') : '---'),


/* ============================================================================
   PATCH #3 — script.js · Função injectAuxiliaryHelperBoxes() · ~Linha 8320
   FALHA    : Injeção prematura — dashboardAlerts não existe no DOM quando
              a função é invocada pelo motor de inicialização antes do render
   CAUSA    : Ausência de mecanismo de retry diferido
   IMPACTO  : Console warn · módulo auxiliar não renderizado
   ============================================================================ */

// ─── REMOVER (bloco original): ────────────────────────────────────────────
    const container = document.getElementById('dashboardAlerts');
    if (!container) {
        console.warn('[AUX] Container dashboardAlerts não encontrado. Injeção adiada.');
        return;
    }

// ─── SUBSTITUIR POR: ───────────────────────────────────────────────────────
    const container = document.getElementById('dashboardAlerts');
    if (!container) {
        /* FIX-SCR-8322: Retry diferido via rAF — evita injeção prematura sem polling */
        if (!injectAuxiliaryHelperBoxes._retryPending) {
            injectAuxiliaryHelperBoxes._retryPending = true;
            requestAnimationFrame(function _retryInjectAux() {
                injectAuxiliaryHelperBoxes._retryPending = false;
                const retryContainer = document.getElementById('dashboardAlerts');
                if (retryContainer) {
                    injectAuxiliaryHelperBoxes();
                } else {
                    console.info('[AUX] dashboardAlerts ainda não disponível. Aguardar revealForensicData().');
                }
            });
        }
        return;
    }
