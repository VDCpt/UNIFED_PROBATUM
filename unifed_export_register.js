/**
 * ============================================================================
 * UNIFED - PROBATUM · REGISTO DE RENDERERS NO EXPORT SERVICE
 * ============================================================================
 * Ficheiro      : unifed_export_register.js
 * Versão        : 1.1.0-RTF-UNIFED-2026-0406
 * ============================================================================
 * [EV-011] RECTIFICAÇÕES (2026-04-10):
 *   · Substituído _init() por subscrição passiva via UNIFEDEventBus.once().
 *   · Adicionada lógica de re‑tentativa (retry) nos renderers PDF e DOCX
 *     para aguardar a selagem do Master Hash quando necessário.
 * ============================================================================
 */
'use strict';
(function _unifedExportRegister() {
	var _VERSION = '1.1.0-RTF-UNIFED-2026-0406';

	function _log(msg, level) {
		var method = level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log';
		console[method]('[' + new Date().toISOString() + '] [ExportRegister ' + _VERSION + '] ' + msg);
	}
	// ── VALIDAÇÕES DE PRÉ-CONDIÇÕES ──────────────────────────────────────────
	function _assertDeps() {
		if(!window.UNIFEDExportService) {
			throw new Error('UNIFEDExportService não carregado. Verificar ordem de scripts no HTML.');
		}
		if(!window.UNIFEDEventBus) {
			throw new Error('UNIFEDEventBus não carregado. Verificar ordem de scripts no HTML.');
		}
	}
	// ── UTILITÁRIO DE RETRY (ESPERA ACTIVA) ───────────────────────────────────
	async function _waitForValidMasterHash(maxAttempts, delayMs) {
		maxAttempts = maxAttempts || 5;
		delayMs = delayMs || 500;
		for(var attempt = 1; attempt <= maxAttempts; attempt++) {
			var hash = window.UNIFEDSystem && window.UNIFEDSystem.masterHash;
			if(hash && typeof hash === 'string' && /^[0-9A-Fa-f]{64}$/.test(hash)) {
				return hash;
			}
			if(attempt < maxAttempts) {
				_log('Master Hash inválido ou não calculado (tentativa ' + attempt + '/' + maxAttempts + '). Aguardando ' + delayMs + 'ms...', 'warn');
				await new Promise(function(resolve) {
					setTimeout(resolve, delayMs);
				});
			}
		}
		throw new Error('Master Hash inválido após ' + maxAttempts + ' tentativas. Certifique-se de que as evidências foram carregadas e a análise executada.');
	}
	// ── WRAPPER DO RENDERER PDF (COM RETRY) ───────────────────────────────────
	async function _pdfRenderer(masterHash) {
		// Se o masterHash recebido do ExportService for inválido, tentar obter um válido
		if(!masterHash || !/^[0-9A-Fa-f]{64}$/.test(masterHash)) {
			_log('MasterHash recebido inválido ou nulo. Activando retry‑logic.', 'warn');
			masterHash = await _waitForValidMasterHash();
		}
		// Garantia explícita de consistência
		if(window.UNIFEDSystem && masterHash) {
			window.UNIFEDSystem.masterHash = masterHash;
			if(window.activeForensicSession) {
				window.activeForensicSession.masterHash = masterHash;
			}
		}
		// Invocar a implementação original de exportPDF (script.js)
		if(typeof window._exportPDF_original === 'function') {
			await window._exportPDF_original();
		} else {
			throw new Error('_exportPDF_original não disponível. Registo falhou.');
		}
	}
	// ── WRAPPER DO RENDERER DOCX (COM RETRY) ──────────────────────────────────
	async function _docxRenderer(masterHash) {
		if(!masterHash || !/^[0-9A-Fa-f]{64}$/.test(masterHash)) {
			_log('MasterHash recebido inválido ou nulo. Activando retry‑logic.', 'warn');
			masterHash = await _waitForValidMasterHash();
		}
		if(window.UNIFEDSystem && masterHash) {
			window.UNIFEDSystem.masterHash = masterHash;
			if(window.activeForensicSession) {
				window.activeForensicSession.masterHash = masterHash;
			}
		}
		if(typeof window._exportDOCX_original === 'function') {
			await window._exportDOCX_original();
		} else {
			throw new Error('_exportDOCX_original não disponível. Registo falhou.');
		}
	}
	// ── CAPTURA E REGISTO — PDF ──────────────────────────────────────────────
	function _captureAndRegisterPDF() {
		var svc = window.UNIFEDExportService.getInstance();
		if(typeof window.exportPDF !== 'function') {
			_log('window.exportPDF ainda não definida. A captura será adiada.', 'warn');
			return false;
		}
		if(!window._exportPDF_original) {
			var fnStr = window.exportPDF.toString();
			if(fnStr.indexOf('_exportPDF_original') !== -1 || fnStr.indexOf('ExportService') !== -1) {
				_log('window.exportPDF já é um adaptador — a usar implementação interna.', 'warn');
				return false;
			}
			window._exportPDF_original = window.exportPDF;
			_log('exportPDF original capturada e guardada em window._exportPDF_original.');
		}
		svc.register('pdf', _pdfRenderer);
		_log('Renderer "pdf" registado no ExportService (com retry‑logic).', 'log');
		return true;
	}
	// ── CAPTURA E REGISTO — DOCX ─────────────────────────────────────────────
	function _captureAndRegisterDOCX() {
		var svc = window.UNIFEDExportService.getInstance();
		if(typeof window.exportDOCX !== 'function') {
			_log('window.exportDOCX ainda não definida. A captura será adiada.', 'warn');
			return false;
		}
		if(!window._exportDOCX_original) {
			var fnStr = window.exportDOCX.toString();
			if(fnStr.indexOf('_exportDOCX_original') !== -1 || fnStr.indexOf('ExportService') !== -1) {
				_log('window.exportDOCX já é um adaptador — captura ignorada.', 'warn');
				return false;
			}
			window._exportDOCX_original = window.exportDOCX;
			_log('exportDOCX original capturada e guardada em window._exportDOCX_original.');
		}
		svc.register('docx', _docxRenderer);
		_log('Renderer "docx" registado no ExportService (com retry‑logic).', 'log');
		return true;
	}
	// ── INSTALAÇÃO DOS ADAPTADORES DE DELEGAÇÃO FINAIS ───────────────────────
	function _installFinalAdapters() {
		var svc = window.UNIFEDExportService.getInstance();
		window.exportPDF = async function _exportPDFAdapter_Final() {
			try {
				await svc.export('pdf');
			} catch (err) {
				console.error('[ExportRegister] exportPDF final falhou:', err);
			}
		};
		window.exportDOCX = async function _exportDOCXAdapter_Final(xmlInject) {
			if(xmlInject !== undefined) {
				console.warn('[ExportRegister] Argumento xmlInject em exportDOCX ignorado — usar UNIFEDSystem directamente.');
			}
			try {
				await svc.export('docx');
			} catch (err) {
				console.error('[ExportRegister] exportDOCX final falhou:', err);
			}
		};
		_log('Adaptadores finais instalados (window.exportPDF, window.exportDOCX → ExportService).');
	}
	// ── SUBSCRIÇÃO PASSIVA (EV-011) ──────────────────────────────────────────
	function _init() {
		try {
			_assertDeps();
		} catch (err) {
			_log('Dependências não satisfeitas: ' + err.message, 'error');
			return;
		}
		var bus = window.UNIFEDEventBus;
		// Se o evento já tiver sido emitido, executamos imediatamente
		if(bus.hasResolved('UNIFED_CORE_READY')) {
			_log('UNIFED_CORE_READY já ocorreu. A executar registo imediato.', 'log');
			_doRegistration();
			return;
		}
		// Caso contrário, subscrevemos passivamente (uma única vez)
		bus.once('UNIFED_CORE_READY', function() {
			_log('UNIFED_CORE_READY recebido. A executar registo.', 'log');
			_doRegistration();
		});
	}
	// ── EXECUÇÃO DO REGISTO (APÓS CORE READY) ─────────────────────────────────
	function _doRegistration() {
		// Pequeno delay para garantir que todas as funções estejam no lugar
		setTimeout(function() {
			var pdfOk = _captureAndRegisterPDF();
			var docxOk = _captureAndRegisterDOCX();
			if(pdfOk && docxOk) {
				_installFinalAdapters();
				_log('✅ Registo completo — PDF + DOCX registados no ExportService (retry‑logic activa).', 'log');
				var status = window.UNIFEDExportService.getInstance().status();
				_log('ExportService.status(): ' + JSON.stringify(status));
			} else {
				_log('Falha no registo de um ou mais renderers. Tentar novamente em 2 segundos.', 'warn');
				setTimeout(_doRegistration, 2000);
			}
		}, 100);
	}
	// ── ARRANQUE ─────────────────────────────────────────────────────────────
	if(document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', _init, {
			once: true
		});
	} else {
		_init();
	}
})();