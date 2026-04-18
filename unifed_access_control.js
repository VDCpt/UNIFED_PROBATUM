/**
 * ============================================================================
 * UNIFED - PROBATUM · CONTROLO DE ACESSO SOBERANO — HALT EXECUTION PROTOCOL
 * unifed_access_control.js
 * ============================================================================
 * Versão      : v2.0.0-HALT-EXEC
 * Data        : 2026-04-18
 * Perito      : Consultor Estratégico Independente
 * Finalidade  : Controlo de acesso com bloqueio real de execução de módulos.
 *               Os scripts subsequentes NÃO existem no DOM até autenticação
 *               criptográfica (SHA-256) ser validada com sucesso.
 *
 * ARQUITECTURA — HALT EXECUTION PROTOCOL:
 *   - O index.html carrega APENAS este ficheiro via <script src="...">
 *   - Todos os restantes módulos são injectados DINAMICAMENTE após login
 *   - Zero-State real: nenhum módulo de dados ou UI carrega antes da auth
 *   - Sequência de carregamento canónica definida em MODULES_SEQUENCE abaixo
 *
 * ALTERAR A PASSWORD:
 *   1. Terminal: echo -n "NovaPassword" | sha256sum
 *   2. Substitua STORED_HASH pelo hash de 64 caracteres obtido.
 *
 * PASSWORD PADRÃO : Beatriz2026###@@@
 * HASH PADRÃO     : 2cc9039cff521fa20ce9748ea10ebb59b83de0e922899071a81f1494a0728b54
 *
 * CONFORMIDADE: Art. 125.º CPP · ISO/IEC 27037:2012 · RGPD Art. 32.º
 * MODELO       : Uso Exclusivo e Perpétuo — Soberania do Perito
 * ============================================================================
 */

'use strict';

(function _installAccessControl() {

    // =========================================================================
    // CONFIGURAÇÃO — ÚNICO CAMPO A EDITAR PARA MUDAR A PASSWORD
    // =========================================================================

    /**
     * STORED_HASH — SHA-256 da password de acesso.
     * Para alterar: echo -n "NovaPwd" | sha256sum → substituir os 64 chars abaixo.
     * @type {string}
     */
    const STORED_HASH = '2cc9039cff521fa20ce9748ea10ebb59b83de0e922899071a81f1494a0728b54';

    const MAX_ATTEMPTS = 3;
    const LOCKOUT_MS   = 30000;

    // =========================================================================
    // SEQUÊNCIA CANÓNICA DE MÓDULOS (injectados apenas após autenticação)
    // =========================================================================

    /**
     * MODULES_SEQUENCE — Lista ordenada de scripts a carregar dinamicamente.
     * A ordem é estritamente sequencial: cada script aguarda o load do anterior.
     * Corresponde à ordem canónica definida no index.html original,
     * com a excepção de que unifed_access_control.js já está no DOM (Passo 0).
     */
    const MODULES_SEQUENCE = [
        'unifed_panel_activator.js',       // Passo 1
        'unifed_core_harmonizer.js',       // Passo 2 — substitui 6 módulos Fase II
        'script.js',                       // Passo 3
        'script_injection.js',             // Passo 4
        'enrichment.js',                   // Passo 5
        'nexus.js',                        // Passo 6
        'proxy_worker.js'                  // Passo 7 (worker Cloudflare — referência)
    ];

    // =========================================================================
    // ESTADO INTERNO
    // =========================================================================

    let _attempts    = 0;
    let _locked      = false;
    let _lockoutEnd  = 0;
    let _overlayEl   = null;
    let _inputEl     = null;
    let _statusEl    = null;
    let _btnEl       = null;
    let _lockTimerEl = null;

    // Flag global — permanece false até autenticação bem-sucedida
    window._UNIFED_ACCESS_GRANTED = false;

    // =========================================================================
    // FUNÇÃO SHA-256 VIA WEBCRYPTO (nativa — sem dependências externas)
    // =========================================================================

    /**
     * computeSHA256() — SHA-256 de uma string via SubtleCrypto.
     * @param {string} message
     * @returns {Promise<string>} — 64 caracteres hexadecimais lowercase
     */
    async function computeSHA256(message) {
        const encoder    = new TextEncoder();
        const data       = encoder.encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray  = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // =========================================================================
    // CARREGAMENTO DINÂMICO SEQUENCIAL DE MÓDULOS (Halt Execution Protocol)
    // =========================================================================

    /**
     * _loadScriptDynamic() — Carrega um script dinamicamente via createElement.
     * Resolve quando o script dispara o evento 'load'.
     * Rejeita se o script disparar o evento 'error' (ficheiro não encontrado).
     *
     * @param {string} src — Caminho relativo do script
     * @returns {Promise<void>}
     */
    function _loadScriptDynamic(src) {
        return new Promise(function(resolve, reject) {
            const el    = document.createElement('script');
            el.src      = src;
            el.async    = false; // Manter ordem de execução garantida
            el.defer    = false;

            el.addEventListener('load', function() {
                console.log('[UNIFED-ACCESS] ✓ Módulo carregado: ' + src);
                resolve();
            });

            el.addEventListener('error', function() {
                const err = new Error('[UNIFED-ACCESS] ❌ Falha ao carregar: ' + src);
                console.error(err.message);
                reject(err);
            });

            document.body.appendChild(el);
        });
    }

    /**
     * _loadModulesSequentially() — Itera MODULES_SEQUENCE em série.
     * Um módulo só é injectado no DOM após o módulo anterior ter carregado.
     * Falhas são registadas na consola mas não interrompem a sequência
     * (comportamento fail-soft para módulos opcionais como proxy_worker.js).
     *
     * @returns {Promise<void>}
     */
    async function _loadModulesSequentially() {
        console.log('[UNIFED-ACCESS] ▶ Iniciando carregamento sequencial de ' + MODULES_SEQUENCE.length + ' módulos...');
        let loaded  = 0;
        let failed  = 0;

        for (let i = 0; i < MODULES_SEQUENCE.length; i++) {
            const src = MODULES_SEQUENCE[i];
            try {
                await _loadScriptDynamic(src);
                loaded++;
            } catch (err) {
                failed++;
                console.warn('[UNIFED-ACCESS] ⚠ Módulo ignorado (fail-soft): ' + src);
            }
        }

        console.log('[UNIFED-ACCESS] ✅ Sequência concluída. Carregados: ' + loaded + ' | Falhas: ' + failed);

        // Disparar evento UNIFED_CORE_READY para sincronização (unifed_triada_export.js aguarda este evento)
        window.dispatchEvent(new CustomEvent('UNIFED_CORE_READY', {
            detail: { loaded: loaded, failed: failed, timestamp: new Date().toISOString() }
        }));

        // Disparar evento de acesso concedido (listeners em index.html)
        document.dispatchEvent(new CustomEvent('unifed:access:granted', {
            detail: { timestamp: new Date().toISOString() }
        }));
    }

    // =========================================================================
    // INJECÇÃO DO OVERLAY DE LOGIN NO DOM
    // =========================================================================

    function _injectOverlay() {
        const OVERLAY_CSS = `
            #unifed-access-overlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                background: #000000;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Courier New', 'Lucida Console', monospace;
            }
            #unifed-access-overlay * { box-sizing: border-box; }
            #unifed-access-box {
                width: 420px;
                max-width: 95vw;
                background: #0a0a0a;
                border: 1px solid #1a3a1a;
                border-radius: 4px;
                padding: 0;
                overflow: hidden;
                box-shadow: 0 0 60px rgba(0,255,80,0.06), 0 0 0 1px #0f2a0f;
                animation: _fadeInScale 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
            }
            #unifed-access-header {
                background: #0d1f0d;
                border-bottom: 1px solid #1a3a1a;
                padding: 20px 28px 16px;
            }
            #unifed-access-header .badge {
                display: inline-block;
                font-size: 9px;
                letter-spacing: 2px;
                color: #2a6a2a;
                border: 1px solid #1a3a1a;
                padding: 2px 8px;
                border-radius: 2px;
                margin-bottom: 10px;
                text-transform: uppercase;
            }
            #unifed-access-header h1 {
                margin: 0;
                font-size: 15px;
                font-weight: 700;
                letter-spacing: 1.5px;
                color: #00c850;
                text-transform: uppercase;
            }
            #unifed-access-header p {
                margin: 6px 0 0;
                font-size: 10px;
                color: #3a5a3a;
                letter-spacing: 0.5px;
            }
            #unifed-access-body { padding: 28px 28px 24px; }
            #unifed-access-body label {
                display: block;
                font-size: 9px;
                letter-spacing: 2px;
                color: #2a5a2a;
                text-transform: uppercase;
                margin-bottom: 8px;
            }
            #unifed-access-input-wrap {
                position: relative;
                margin-bottom: 16px;
            }
            #unifed-pwd-input {
                width: 100%;
                background: #060f06;
                border: 1px solid #1a3a1a;
                border-radius: 2px;
                color: #00c850;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                padding: 12px 44px 12px 14px;
                outline: none;
                transition: border-color 0.2s;
                caret-color: #00c850;
            }
            #unifed-pwd-input:focus {
                border-color: #00c850;
                box-shadow: 0 0 0 2px rgba(0,200,80,0.08);
            }
            #unifed-pwd-input.error {
                border-color: #c80000;
                box-shadow: 0 0 0 2px rgba(200,0,0,0.08);
                animation: _shake 0.35s ease;
            }
            #unifed-pwd-toggle {
                position: absolute;
                right: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                cursor: pointer;
                color: #2a5a2a;
                font-size: 12px;
                padding: 4px;
                transition: color 0.2s;
            }
            #unifed-pwd-toggle:hover { color: #00c850; }
            #unifed-access-btn {
                width: 100%;
                background: #0d2a0d;
                border: 1px solid #00c850;
                border-radius: 2px;
                color: #00c850;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 2px;
                text-transform: uppercase;
                padding: 13px;
                cursor: pointer;
                transition: background 0.2s, color 0.2s, box-shadow 0.2s;
                margin-bottom: 14px;
            }
            #unifed-access-btn:hover:not(:disabled) {
                background: #00c850;
                color: #000;
                box-shadow: 0 0 20px rgba(0,200,80,0.25);
            }
            #unifed-access-btn:disabled {
                opacity: 0.35;
                cursor: not-allowed;
                border-color: #1a3a1a;
                color: #2a4a2a;
            }
            #unifed-status-msg {
                font-size: 10px;
                letter-spacing: 0.5px;
                min-height: 16px;
                text-align: center;
                transition: color 0.2s;
            }
            #unifed-status-msg.ok   { color: #00c850; }
            #unifed-status-msg.err  { color: #c83030; }
            #unifed-status-msg.warn { color: #c8a000; }
            #unifed-status-msg.info { color: #2a6a2a; }
            #unifed-lock-timer {
                font-size: 10px;
                text-align: center;
                color: #c83030;
                margin-top: 8px;
                min-height: 14px;
                letter-spacing: 0.5px;
            }
            #unifed-access-footer {
                border-top: 1px solid #0f1f0f;
                padding: 12px 28px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            #unifed-access-footer span {
                font-size: 8px;
                color: #1a3a1a;
                letter-spacing: 1px;
                text-transform: uppercase;
            }
            /* Barra de progresso de carregamento de módulos */
            #unifed-load-progress {
                display: none;
                flex-direction: column;
                gap: 6px;
                margin-top: 12px;
            }
            #unifed-load-progress.active { display: flex; }
            #unifed-load-bar-track {
                width: 100%;
                height: 3px;
                background: #0f2a0f;
                border-radius: 2px;
                overflow: hidden;
            }
            #unifed-load-bar-fill {
                height: 100%;
                width: 0%;
                background: #00c850;
                transition: width 0.3s ease;
                border-radius: 2px;
            }
            #unifed-load-label {
                font-size: 8px;
                color: #2a6a2a;
                letter-spacing: 1px;
                text-align: center;
            }
            @keyframes _fadeInScale {
                from { opacity: 0; transform: scale(0.96) translateY(8px); }
                to   { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes _shake {
                0%,100% { transform: translateX(0); }
                20%      { transform: translateX(-6px); }
                40%      { transform: translateX(6px); }
                60%      { transform: translateX(-4px); }
                80%      { transform: translateX(4px); }
            }
            #unifed-access-overlay::before {
                content: '';
                position: fixed;
                inset: 0;
                background: repeating-linear-gradient(
                    0deg, transparent, transparent 2px,
                    rgba(0,255,80,0.015) 2px, rgba(0,255,80,0.015) 4px
                );
                pointer-events: none;
                z-index: 100000;
            }
        `;

        const styleEl       = document.createElement('style');
        styleEl.id          = 'unifed-access-control-css';
        styleEl.textContent = OVERLAY_CSS;
        (document.head || document.documentElement).appendChild(styleEl);

        const overlay    = document.createElement('div');
        overlay.id       = 'unifed-access-overlay';
        overlay.setAttribute('role',       'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Autenticação UNIFED-PROBATUM');
        overlay.innerHTML = `
            <div id="unifed-access-box">
                <div id="unifed-access-header">
                    <div class="badge">ACESSO RESTRITO · USO EXCLUSIVO · ZERO-STATE</div>
                    <h1>🔐 UNIFED-PROBATUM</h1>
                    <p>v13.12.2-i18n · Sistema de Peritagem Forense Digital · Soberania do Perito</p>
                </div>
                <div id="unifed-access-body">
                    <label for="unifed-pwd-input">Credencial de Acesso</label>
                    <div id="unifed-access-input-wrap">
                        <input
                            type="password"
                            id="unifed-pwd-input"
                            autocomplete="current-password"
                            spellcheck="false"
                            autofocus
                            placeholder="••••••••••••••••••"
                            maxlength="128"
                        />
                        <button
                            id="unifed-pwd-toggle"
                            type="button"
                            title="Mostrar / Ocultar"
                            aria-label="Alternar visibilidade da password"
                        >👁</button>
                    </div>
                    <button id="unifed-access-btn" type="button">
                        ▶ AUTENTICAR
                    </button>
                    <div id="unifed-status-msg" class="info" role="status" aria-live="polite">
                        Introduza a credencial de acesso para continuar.
                    </div>
                    <div id="unifed-lock-timer" aria-live="assertive"></div>
                    <div id="unifed-load-progress" role="progressbar" aria-label="Carregamento de módulos">
                        <div id="unifed-load-bar-track">
                            <div id="unifed-load-bar-fill"></div>
                        </div>
                        <div id="unifed-load-label">A carregar módulos forenses...</div>
                    </div>
                </div>
                <div id="unifed-access-footer">
                    <span>SHA-256 · WebCrypto · Sem transmissão de dados</span>
                    <span>Halt Execution Protocol · v2.0.0</span>
                </div>
            </div>
        `;

        const target = document.body || document.documentElement;
        target.insertBefore(overlay, target.firstChild);

        _overlayEl   = overlay;
        _inputEl     = document.getElementById('unifed-pwd-input');
        _statusEl    = document.getElementById('unifed-status-msg');
        _btnEl       = document.getElementById('unifed-access-btn');
        _lockTimerEl = document.getElementById('unifed-lock-timer');

        _bindEvents();
        console.log('[UNIFED-ACCESS] Overlay montado. Sistema em Zero-State real.');
    }

    // =========================================================================
    // EVENTOS
    // =========================================================================

    function _bindEvents() {
        _inputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); _attemptLogin(); }
        });
        _btnEl.addEventListener('click', _attemptLogin);

        const toggleBtn = document.getElementById('unifed-pwd-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                _inputEl.type = (_inputEl.type === 'password') ? 'text' : 'password';
                toggleBtn.textContent = (_inputEl.type === 'text') ? '🙈' : '👁';
                _inputEl.focus();
            });
        }

        document.addEventListener('keydown', function _trapFocus(e) {
            if (e.key === 'Tab' && _overlayEl && document.contains(_overlayEl)) {
                e.preventDefault();
                _inputEl.focus();
            }
        });
    }

    // =========================================================================
    // LÓGICA DE AUTENTICAÇÃO
    // =========================================================================

    async function _attemptLogin() {
        if (_locked) {
            const remaining = Math.ceil((_lockoutEnd - Date.now()) / 1000);
            if (remaining > 0) {
                _setStatus('Sistema bloqueado. Aguarde ' + remaining + 's.', 'err');
                return;
            } else {
                _locked = false; _attempts = 0;
                _lockTimerEl.textContent = '';
                _btnEl.disabled = false; _inputEl.disabled = false;
            }
        }

        const pwd = _inputEl.value;
        if (!pwd || pwd.length === 0) {
            _setStatus('Campo vazio. Introduza a credencial.', 'warn');
            _shakeInput();
            return;
        }

        _btnEl.disabled   = true;
        _inputEl.disabled = true;
        _setStatus('A verificar credencial via SubtleCrypto...', 'info');

        try {
            const inputHash = await computeSHA256(pwd);

            if (inputHash === STORED_HASH) {
                // ── ACESSO CONCEDIDO: activar Halt Execution Protocol ──────────
                window._UNIFED_ACCESS_GRANTED = true;
                _setStatus('✓ Credencial válida. A carregar módulos forenses...', 'ok');
                console.log('[UNIFED-ACCESS] Autenticação bem-sucedida. Iniciando carregamento dinâmico.');

                // Mostrar barra de progresso
                const progressEl = document.getElementById('unifed-load-progress');
                const barFill    = document.getElementById('unifed-load-bar-fill');
                const barLabel   = document.getElementById('unifed-load-label');
                if (progressEl) progressEl.classList.add('active');

                // Carregar módulos sequencialmente com feedback visual
                let loaded = 0;
                const total = MODULES_SEQUENCE.length;

                for (let i = 0; i < total; i++) {
                    const src = MODULES_SEQUENCE[i];
                    if (barLabel) barLabel.textContent = 'A carregar: ' + src + ' (' + (i + 1) + '/' + total + ')';
                    if (barFill)  barFill.style.width  = Math.round(((i + 1) / total) * 100) + '%';

                    try {
                        await _loadScriptDynamic(src);
                        loaded++;
                    } catch (e) {
                        console.warn('[UNIFED-ACCESS] ⚠ Falha ao carregar (fail-soft): ' + src);
                    }
                }

                if (barLabel) barLabel.textContent = '✓ ' + loaded + '/' + total + ' módulos carregados';
                if (barFill)  barFill.style.width  = '100%';

                await new Promise(function(r) { setTimeout(r, 600); });

                // Fade-out e remoção do overlay
                _overlayEl.style.transition = 'opacity 0.4s ease';
                _overlayEl.style.opacity    = '0';
                await new Promise(function(r) { setTimeout(r, 420); });
                _overlayEl.remove();

                const cssEl = document.getElementById('unifed-access-control-css');
                if (cssEl) cssEl.remove();

                // Disparar eventos de sistema
                window.dispatchEvent(new CustomEvent('UNIFED_CORE_READY', {
                    detail: { loaded: loaded, timestamp: new Date().toISOString() }
                }));
                document.dispatchEvent(new CustomEvent('unifed:access:granted', {
                    detail: { timestamp: new Date().toISOString() }
                }));

                console.log('[UNIFED-ACCESS] ✅ Overlay removido. ' + loaded + ' módulos activos.');

            } else {
                // ── CREDENCIAL INVÁLIDA ──────────────────────────────────────
                _attempts++;
                _shakeInput();
                _inputEl.value = '';
                const remaining = MAX_ATTEMPTS - _attempts;

                if (_attempts >= MAX_ATTEMPTS) {
                    _locked     = true;
                    _lockoutEnd = Date.now() + LOCKOUT_MS;
                    _btnEl.disabled   = true;
                    _inputEl.disabled = true;
                    _setStatus('Credencial inválida. Bloqueado por ' + (LOCKOUT_MS / 1000) + 's.', 'err');
                    console.warn('[UNIFED-ACCESS] Bloqueio activado após ' + MAX_ATTEMPTS + ' tentativas.');
                    _startLockTimer();
                } else {
                    _setStatus(
                        'Credencial inválida. ' + remaining + ' tentativa' + (remaining !== 1 ? 's' : '') + ' restante' + (remaining !== 1 ? 's' : '') + '.',
                        'err'
                    );
                    _inputEl.disabled = false;
                    _btnEl.disabled   = false;
                    _inputEl.focus();
                }
            }

        } catch (cryptoErr) {
            console.error('[UNIFED-ACCESS] Erro SubtleCrypto:', cryptoErr);
            _setStatus('Erro interno de verificação. Recarregue a página.', 'err');
            _inputEl.disabled = false;
            _btnEl.disabled   = false;
        }
    }

    // =========================================================================
    // TEMPORIZADOR DE BLOQUEIO
    // =========================================================================

    function _startLockTimer() {
        const interval = setInterval(function() {
            const remaining = Math.ceil((_lockoutEnd - Date.now()) / 1000);
            if (remaining <= 0) {
                clearInterval(interval);
                _locked = false; _attempts = 0;
                _lockTimerEl.textContent = '';
                _btnEl.disabled = false; _inputEl.disabled = false;
                _setStatus('Desbloqueado. Pode tentar novamente.', 'info');
                _inputEl.focus();
            } else {
                _lockTimerEl.textContent = 'Desbloqueio em ' + remaining + 's';
            }
        }, 1000);
    }

    // =========================================================================
    // UTILITÁRIOS DE UI
    // =========================================================================

    function _setStatus(msg, type) {
        if (!_statusEl) return;
        _statusEl.textContent = msg;
        _statusEl.className   = type;
    }

    function _shakeInput() {
        if (!_inputEl) return;
        _inputEl.classList.remove('error');
        void _inputEl.offsetWidth; // Reflow para reiniciar animação
        _inputEl.classList.add('error');
        setTimeout(function() { if (_inputEl) _inputEl.classList.remove('error'); }, 400);
    }

    // =========================================================================
    // PONTO DE ENTRADA
    // =========================================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _injectOverlay);
    } else {
        _injectOverlay();
    }

    // =========================================================================
    // INTERFACE PÚBLICA DE DIAGNÓSTICO
    // =========================================================================

    window._UNIFED_ACCESS_CONTROL = {
        version  : 'v2.0.0-HALT-EXEC',
        model    : 'Uso Exclusivo e Perpétuo — Halt Execution Protocol — Sem SaaS',
        granted  : function() { return window._UNIFED_ACCESS_GRANTED; },
        attempts : function() { return _attempts; },
        isLocked : function() { return _locked; },
        _debugInfo: function() {
            console.log('[UNIFED-ACCESS] Estado:', {
                granted  : window._UNIFED_ACCESS_GRANTED,
                attempts : _attempts,
                locked   : _locked,
                modules  : MODULES_SEQUENCE
            });
        }
    };

    console.log('[UNIFED-ACCESS] ✅ unifed_access_control.js v2.0.0-HALT-EXEC carregado.');
    console.log('[UNIFED-ACCESS] Zero-State activo. Aguardando autenticação SHA-256.');

})();
