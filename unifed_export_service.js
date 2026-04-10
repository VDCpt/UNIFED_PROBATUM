/**
 * ============================================================================
 * UNIFED - PROBATUM · SERVIÇO DE EXPORTAÇÃO UNIFICADO (SINGLETON)
 * ============================================================================
 * Ficheiro      : unifed_export_service.js
 * Versão        : 1.1.0-RTF-UNIFED-2026-0406
 * ============================================================================
 * [EV-012] RECTIFICAÇÕES (2026-04-10):
 *   · Removida a IIFE _installCompatAdapters (injeção global síncrona).
 *   · Adicionado método público initAdapters() para ser invocado pelo
 *     unifed_event_bus.js após a validação do Master Hash inicial.
 *   · Eliminada qualquer mutação directa de window.exportPDF/exportDOCX
 *     durante o carregamento do script.
 * ============================================================================
 */
'use strict';
window.UNIFEDExportService = (function _UNIFEDExportServiceIIFE() {
	// ── ESTADO INTERNO (não exposto) ─────────────────────────────────────────
	var _instance = null;
	var _state = {
		renderers: Object.create(null), // { pdf: fn, docx: fn, custody: fn }
		locked: false, // lock de exportação em curso
		lastHash: null, // último masterHash selado
		lastType: null, // último tipo exportado
		exportCount: 0, // contador de exportações (auditoria)
		adaptersInstalled: false // flag para evitar dupla instalação
	};
	// ── TIPOS VÁLIDOS ────────────────────────────────────────────────────────
	var _VALID_TYPES = ['pdf', 'docx', 'custody'];
	// ── UTILITÁRIO INTERNO ───────────────────────────────────────────────────
	function _log(msg, level) {
		var _method = {
			warn: 'warn',
			error: 'error',
			success: 'info'
		} [level] || 'log';
		console[_method]('[' + new Date().toISOString() + '] [ExportService] ' + msg);
	}
	// ── SELAGEM ATÓMICA ──────────────────────────────────────────────────────
	/**
	 * Executa a selagem criptográfica ANTES de qualquer serialização.
	 * Chama UNIFEDSystem.generateForensicSeal() se disponível.
	 * Valida que o hash resultante tem exactamente 64 caracteres hexadecimais.
	 *
	 * @returns {Promise<string>} masterHash validado (64 hex chars, uppercase)
	 * @throws  {Error}          se UNIFEDSystem não inicializado ou hash inválido
	 */
	async function _sealAtomically() {
		var sys = window.UNIFEDSystem;
		if(!sys) {
			throw new Error('UNIFEDSystem não inicializado. Aguardar UNIFED_CORE_READY.');
		}
		// Actualizar hash dinâmico se o motor forense estiver disponível
		if(typeof sys.generateForensicSeal === 'function') {
			try {
				await sys.generateForensicSeal();
				_log('generateForensicSeal() executado com sucesso.');
			} catch (sealErr) {
				_log('generateForensicSeal() falhou: ' + sealErr.message + '. Usando hash existente.', 'warn');
			}
		}
		var hash = sys.masterHash;
		// Validação estrita: SHA-256 = 64 caracteres hexadecimais
		if(typeof hash !== 'string' || !/^[0-9A-Fa-f]{64}$/.test(hash)) {
			throw new Error('Master Hash inválido: ' + (hash ? '"' + hash.substring(0, 16) + '..." (' + hash.length + ' chars)' : 'null/undefined') + '. Carregue evidências antes de exportar.');
		}
		_state.lastHash = hash.toUpperCase();
		_log('Selagem atómica concluída. Hash prefix: ' + _state.lastHash.substring(0, 12) + '...');
		return _state.lastHash;
	}
	// ── INSTÂNCIA SINGLETON ──────────────────────────────────────────────────
	function _createInstance() {
		/**
		 * Regista um renderer para um tipo de exportação.
		 * Deve ser chamado pelos módulos respectivos durante a inicialização.
		 * Quando todos os tipos críticos (pdf + docx) estiverem registados,
		 * emite 'UNIFED_EXPORT_READY' no EventBus.
		 *
		 * @param {'pdf'|'docx'|'custody'} type
		 * @param {Function} rendererFn   - função async que recebe (masterHash: string)
		 */
		function register(type, rendererFn) {
			if(_VALID_TYPES.indexOf(type) === -1) {
				throw new TypeError('[ExportService] Tipo inválido: "' + type + '". Aceites: ' + _VALID_TYPES.join(', '));
			}
			if(typeof rendererFn !== 'function') {
				throw new TypeError('[ExportService] rendererFn deve ser uma Function.');
			}
			_state.renderers[type] = rendererFn;
			_log('Renderer "' + type + '" registado.');
			// Emitir UNIFED_EXPORT_READY quando pdf + docx estiverem ambos registados
			if(_state.renderers['pdf'] && _state.renderers['docx']) {
				if(window.UNIFEDEventBus && !window.UNIFEDEventBus.hasResolved('UNIFED_EXPORT_READY')) {
					window.UNIFEDEventBus.emit('UNIFED_EXPORT_READY', {
						types: Object.keys(_state.renderers)
					});
					_log('UNIFED_EXPORT_READY emitido.', 'success');
				}
			}
		}
		/**
		 * Exporta um documento do tipo especificado.
		 * GARANTE:
		 *   1. Selagem atómica antes da serialização.
		 *   2. Apenas uma exportação em curso por vez (lock).
		 *   3. O renderer recebe sempre o hash validado.
		 *
		 * @param {'pdf'|'docx'|'custody'} type
		 * @returns {Promise<void>}
		 */
		async function exportDocument(type) {
			if(_VALID_TYPES.indexOf(type) === -1) {
				throw new TypeError('[ExportService] Tipo inválido: "' + type + '".');
			}
			if(_state.locked) {
				_log('Exportação "' + type + '" rejeitada: outra exportação em curso.', 'warn');
				if(typeof window.showToast === 'function') {
					window.showToast('Exportação em curso. Aguardar conclusão.', 'warn');
				}
				return;
			}
			if(!_state.renderers[type]) {
				throw new Error('[ExportService] Renderer não registado para tipo: "' + type + '".');
			}
			_state.locked = true;
			_log('Exportação "' + type + '" iniciada (lock adquirido).');
			try {
				// ── PASSO 1: Selagem atómica (DEVE ocorrer antes da serialização) ──
				var masterHash = await _sealAtomically();
				// ── PASSO 2: Invocar renderer com hash validado ───────────────────
				await _state.renderers[type](masterHash);
				_state.lastType = type;
				_state.exportCount++;
				_log('Exportação "' + type + '" concluída (total: ' + _state.exportCount + ').', 'success');
			} catch (err) {
				_log('Exportação "' + type + '" falhou: ' + err.message, 'error');
				if(typeof window.showToast === 'function') {
					window.showToast('Erro na exportação: ' + err.message, 'error');
				}
				if(typeof window.logAudit === 'function') {
					window.logAudit('❌ [ExportService] Falha em "' + type + '": ' + err.message, 'error');
				}
				throw err;
			} finally {
				_state.locked = false;
				_log('Lock "' + type + '" libertado.');
			}
		}
		/**
		 * Devolve um snapshot de diagnóstico sem expor referências internas.
		 * @returns {Object}
		 */
		function status() {
			return Object.freeze({
				registeredTypes: Object.keys(_state.renderers).slice(),
				locked: _state.locked,
				lastType: _state.lastType,
				lastHashPrefix: _state.lastHash ? _state.lastHash.substring(0, 12) + '...' : null,
				exportCount: _state.exportCount,
				adaptersInstalled: _state.adaptersInstalled
			});
		}
		/**
		 * [EV-012] Método público para instalar os adaptadores de compatibilidade.
		 * DEVE ser chamado pelo unifed_event_bus.js APÓS a validação do Master Hash
		 * inicial e APÓS o registo dos renderers (pdf, docx, custody) estar completo.
		 *
		 * Substitui as funções window.exportPDF e window.exportDOCX pelos adaptadores
		 * que delegam para ExportService.export(type).
		 */
		function initAdapters() {
			if(_state.adaptersInstalled) {
				_log('Adaptadores já instalados. Nenhuma acção tomada.', 'warn');
				return;
			}
			// Verificar se os renderers críticos já estão registados
			if(!_state.renderers['pdf'] || !_state.renderers['docx']) {
				_log('initAdapters() chamado antes do registo dos renderers pdf/docx. Aguardar UNIFED_EXPORT_READY.', 'warn');
				// Tentar novamente quando o evento de prontidão for emitido
				if(window.UNIFEDEventBus && !window.UNIFEDEventBus.hasResolved('UNIFED_EXPORT_READY')) {
					window.UNIFEDEventBus.once('UNIFED_EXPORT_READY', function() {
						_installAdapters();
					});
				} else {
					setTimeout(function() {
						initAdapters();
					}, 500);
				}
				return;
			}
			_installAdapters();
		}

		function _installAdapters() {
			if(_state.adaptersInstalled) return;
			window.exportPDF = async function _exportPDFAdapter() {
				try {
					await exportDocument('pdf');
				} catch (err) {
					console.error('[ExportService·Adapter] exportPDF falhou:', err);
				}
			};
			window.exportDOCX = async function _exportDOCXAdapter(xmlInject) {
				if(xmlInject !== undefined) {
					console.warn('[ExportService·Adapter] Argumento xmlInject ignorado — usar UNIFEDSystem.xmlInject.');
				}
				try {
					await exportDocument('docx');
				} catch (err) {
					console.error('[ExportService·Adapter] exportDOCX falhou:', err);
				}
			};
			_state.adaptersInstalled = true;
			_log('Adaptadores de compatibilidade instalados (window.exportPDF, window.exportDOCX → ExportService).', 'success');
		}
		return Object.freeze({
			register: register,
			export: exportDocument,
			status: status,
			initAdapters: initAdapters // [EV-012] novo método público
		});
	}
	// ── GETTER SINGLETON ─────────────────────────────────────────────────────
	function getInstance() {
		if(!_instance) {
			_instance = _createInstance();
			_log('Instância Singleton criada.');
		}
		return _instance;
	}
	// ── EXPOSIÇÃO PÚBLICA ────────────────────────────────────────────────────
	return Object.freeze({
		getInstance: getInstance
	});
})();
// NOTA: A IIFE _installCompatAdapters foi REMOVIDA conforme [EV-012].
// A instalação dos adaptadores deve ser feita MANUALMENTE pelo unifed_event_bus.js
// chamando UNIFEDExportService.getInstance().initAdapters() após a validação
// do Master Hash inicial e após o registo de todos os renderers.