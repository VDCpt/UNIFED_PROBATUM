/**
 * UNIFED - PROBATUM · CASO REAL ANONIMIZADO v13.12.0-PURE (COMPLETO)
 * ============================================================================
 * Missão: Injeção Forense e Reconstituição da Verdade Material
 * Conformidade: DORA (UE) 2022/2554 · Art. 125.º CPP · ISO/IEC 27037:2012
 * ============================================================================
 * RETIFICAÇÕES v13.12.0-PURE (2026-04-07):
 * - Garantia de que os contadores começam a zero.
 * - Injeção das boxes auxiliares antes da atualização dos valores.
 * - Renderização forçada dos gráficos após carregamento dos dados.
 * - Nota de reconciliação DAC7 agora exibe valores corretos.
 * ============================================================================
 */
(function() {
	'use strict';
	window.logAudit = window.logAudit || function(msg, level = 'info') {
		const prefix = '[UNIFED] ';
		if(level === 'error') console.error(prefix + msg);
		else if(level === 'warn') console.warn(prefix + msg);
		else if(level === 'success') console.info(prefix + msg);
		else console.log(prefix + msg);
	};
	const logAudit = window.logAudit;
	// 1. DATASET MESTRE (OBJETO IMUTÁVEL) — VALORES REAIS ORIGINAIS + MACRO + COUNTS
	const _PDF_CASE = Object.freeze({
		sessionId: "UNIFED-MNGFN3C0-X57MO",
		masterHash: "a3f8c9e2d5b6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1",
		client: {
			name: "Real Demo - Unipessoal, Lda",
			nif: "999999990",
			platform: "Plataforma A"
		},
		counts: {
			ctrl: 12,
			saft: 4,
			fat: 8,
			ext: 2,
			dac7: 1
		},
		totals: {
			ganhos: 10157.73,
			ganhosLiquidos: 7709.84,
			saftBruto: 8227.97,
			saftIliquido: 7761.67,
			saftIva: 466.30,
			despesas: 2447.89,
			faturaPlataforma: 262.94,
			dac7TotalPeriodo: 7755.16,
			iva6Omitido: 131.10,
			iva23Omitido: 502.54,
			asfixiaFinanceira: 493.68,
			totalNaoSujeitos: 451.15,
			gorjetas: 46.00,
			portagens: 0.15,
			campanhas: 405.00,
			cancelamentos: 58.10
		},
		atf: {
			zScore: 2.45,
			confianca: "99.2%",
			periodo: "Q4 2024",
			anomalias: 4,
			version: "v13.12.0-PURE",
			score: 40,
			trend: "DESCENDENTE",
			outliers: 0
		},
		macro_analysis: {
			sector_drivers: 38000,
			operational_years: 7,
			avg_monthly_discrepancy: 546.24,
			estimated_systemic_gap: 1743598080.00,
			confidence_level: "High (based on verified algorithmic pattern)",
			legal_implication: "Potential systemic tax erosion under Art. 119.º RGIT (Iteration)",
			methodology: "Extrapolação Estatística de Baixa Variância · ISO/IEC 27037:2012",
			status: "INDICATIVO_MACRO",
			disclaimer: "Os valores de impacto sistémico constituem contexto macroeconómico e não prova direta de ilícito alheio, nos termos do Art. 128.º do CPP."
		}
	});
	// 2. ESCUDO SILENCIOSO PARA CORS (TSA / FREETSA FALLBACK)
	(function _installCORSSilentShield() {
		const targetUrl = 'freetsa.org';
		const originalFetch = window.fetch;
		if(typeof originalFetch === 'function') {
			window.fetch = function(input, init) {
				const url = typeof input === 'string' ? input : (input && input.url);
				if(url && url.indexOf(targetUrl) !== -1) {
					return originalFetch.apply(this, arguments).catch(function(err) {
						console.warn('[UNIFED] ⚙ Modo Standalone Ativo: Selagem TSA externa indisponível. Integridade assegurada por Assinatura Local SHA-256 (Nível 1).');
						throw err;
					});
				}
				return originalFetch.apply(this, arguments);
			};
		}
		window.addEventListener('unhandledrejection', function(event) {
			if(event.reason && event.reason.message && event.reason.message.indexOf('freetsa') !== -1) {
				console.warn('[UNIFED] ⚙ Modo Standalone Ativo: Selagem TSA externa indisponível (promise).');
				event.preventDefault();
			}
			if(event.reason && event.reason.message && event.reason.message.indexOf('api.unifed.com') !== -1) {
				console.warn('[UNIFED] ⚙ Modo Standalone Ativo: Proxy IA indisponível (DNS). Fallback estático ativo.');
				event.preventDefault();
			}
		});
		window.addEventListener('error', function(event) {
			if(event.message && event.message.indexOf('freetsa') !== -1) {
				console.warn('[UNIFED] ⚙ Modo Standalone Ativo: Selagem TSA externa indisponível (erro global).');
				event.preventDefault();
				return true;
			}
			if(event.message && event.message.indexOf('api.unifed.com') !== -1) {
				console.warn('[UNIFED] ⚙ Modo Standalone Ativo: Proxy IA indisponível (DNS). Fallback estático ativo.');
				event.preventDefault();
				return true;
			}
		});
		console.log('[UNIFED] Escudo CORS silencioso instalado para FreeTSA e api.unifed.com.');
	})();
	// 3. UTILITÁRIOS DE FORMATAÇÃO E ACESSO AO DOM
	const _fmt = (v) => new Intl.NumberFormat('pt-PT', {
		style: 'currency',
		currency: 'EUR'
	}).format(v);
	const _set = (id, val) => {
		const el = document.getElementById(id);
		if(el) {
			el.textContent = val;
			return true;
		}
		return false;
	};
	// Namespace Global
	window.UNIFED_INTERNAL = window.UNIFED_INTERNAL || {};
	window.UNIFED_INTERNAL.data = _PDF_CASE;
	window.UNIFED_INTERNAL.fmt = _fmt;
	window.UNIFED_INTERNAL.set = _set;
	console.log('[UNIFED] Camada 1: OK.');
})();
(function() {
	'use strict';
	if(!window.UNIFED_INTERNAL) return;
	const {
		data,
		fmt,
		set
	} = window.UNIFED_INTERNAL;
	// Cálculos auxiliares baseados nos dados reais
	const t = data.totals;
	const discrepanciaC2 = t.despesas - t.faturaPlataforma;
	const percentC2 = (t.despesas > 0) ? (discrepanciaC2 / t.despesas) * 100 : 0;
	const discrepanciaC1 = t.saftBruto - t.dac7TotalPeriodo;
	const percentC1 = (t.saftBruto > 0) ? (discrepanciaC1 / t.saftBruto) * 100 : 0;
	const ircEstimado = discrepanciaC2 * 0.21;
	const asfixiaFinanceira = t.saftBruto * 0.06;
	window.UNIFED_INTERNAL.syncMetrics = function() {
		if(!document.getElementById('pureDashboard')) {
			console.info('[UNIFED] syncMetrics abortado: painel pureDashboard ainda não injetado no DOM.');
			return;
		}
		console.log('[UNIFED] Iniciando Sincronização Forense...');
		const totalNaoSujeitosCalc = (t.campanhas || 0) + (t.gorjetas || 0) + (t.portagens || 0);
		const mapping = {
			'pure-ganhos': fmt(t.ganhos),
			'pure-despesas': fmt(t.despesas),
			'pure-liquido': fmt(t.ganhosLiquidos),
			'pure-saft': fmt(t.saftBruto),
			'pure-dac7': fmt(t.dac7TotalPeriodo),
			'pure-fatura': fmt(t.faturaPlataforma),
			'pure-disc-c2': fmt(discrepanciaC2),
			'pure-disc-c2-pct': percentC2.toFixed(2) + '%',
			'pure-disc-saft-dac7': fmt(discrepanciaC1),
			'pure-disc-saft-pct': percentC1.toFixed(2) + '%',
			'pure-iva-6': fmt(t.iva6Omitido),
			'pure-iva-23': fmt(t.iva23Omitido),
			'pure-irc': fmt(ircEstimado),
			'pure-disc-c2-grid': fmt(discrepanciaC2),
			'pure-iva-devido': fmt(asfixiaFinanceira),
			'pure-nao-sujeitos': fmt(totalNaoSujeitosCalc),
			'pure-atf-sp': data.atf.score + '/100',
			'pure-atf-trend': data.atf.trend,
			'pure-atf-outliers': data.atf.outliers + ' outliers > 2σ',
			'pure-atf-meses': '2.º Semestre 2024 — 4 meses com dados (Set–Dez)',
			'pure-nc-campanhas': fmt(t.campanhas),
			'pure-nc-gorjetas': fmt(t.gorjetas),
			'pure-nc-portagens': fmt(t.portagens),
			'pure-nc-total': fmt(totalNaoSujeitosCalc),
			'pure-verdict': 'RISCO ELEVADO · CONTRA-ORDENAÇÃO',
			'pure-verdict-pct': percentC2.toFixed(2) + '%',
			'pure-hash-prefix-verdict': data.masterHash.substring(0, 16) + '...',
			'pure-session-id': data.sessionId,
			'pure-hash-prefix': data.masterHash.substring(0, 12) + '...',
			'pure-subject-name': data.client.name,
			'pure-subject-nif': data.client.nif,
			'pure-subject-platform': data.client.platform,
			'pure-ganhos-extrato': fmt(t.ganhos),
			'pure-despesas-extrato': fmt(t.despesas),
			'pure-ganhos-liquidos-extrato': fmt(t.ganhosLiquidos),
			'pure-saft-bruto-val': fmt(t.saftBruto),
			'pure-dac7-val': fmt(t.dac7TotalPeriodo),
			'pure-atf-zscore': data.atf.zScore.toString(),
			'pure-atf-confianca': data.atf.confianca,
			'pure-atf-score-val': data.atf.score + '/100',
			'pure-iva-devido-val': fmt(asfixiaFinanceira),
			'pure-impacto-macro': fmt(data.macro_analysis.estimated_systemic_gap),
			'pure-ctrl-qty': data.counts.ctrl.toString(),
			'pure-saft-qty': data.counts.saft.toString(),
			'pure-fat-qty': data.counts.fat.toString(),
			'pure-ext-qty': data.counts.ext.toString(),
			'pure-dac7-qty': data.counts.dac7.toString(),
			'pure-ganhos-tri': fmt(t.ganhos),
			'pure-despesas-tri': fmt(t.despesas),
			'pure-liquido-tri': fmt(t.ganhosLiquidos),
			'pure-fatura-tri': fmt(t.faturaPlataforma),
		};
		const missing = [];
		Object.entries(mapping).forEach(([id, value]) => {
			const el = document.getElementById(id);
			if(el) {
				el.textContent = value;
			} else {
				missing.push(id);
			}
		});
		// Forçar renderização dos gráficos se Chart.js estiver disponível
		if(typeof Chart !== 'undefined') {
			if(typeof window.renderChart === 'function') window.renderChart();
			if(typeof window.renderDiscrepancyChart === 'function') window.renderDiscrepancyChart();
		} else {
			console.warn('[UNIFED] Chart.js não disponível – gráficos não renderizados.');
		}
		if(missing.length > 0) {
			console.warn(`[UNIFED] IDs em falta no DOM: Array(${missing.length})`, missing);
		} else {
			console.info('[UNIFED] Sincronização concluída com 100% de integridade.');
		}
		const sg2Legal = document.getElementById('pure-sg2-legal');
		if(sg2Legal) sg2Legal.textContent = 'Art. 36.º n.º 11 CIVA · Art. 119.º RGIT';
		const sg1Legal = document.getElementById('pure-sg1-legal');
		if(sg1Legal) sg1Legal.textContent = 'Diretiva DAC7 (UE) 2021/514 · DL n.º 41/2023';
		const verdictBasis = document.getElementById('pure-verdict-basis');
		if(verdictBasis) verdictBasis.textContent = 'Art. 119.º RGIT · Art. 125.º CPP';
		const pureIva23Sub = document.querySelector('#pure-iva23-sub');
		if(pureIva23Sub) pureIva23Sub.textContent = 'Art. 2.º n.º 1 al. i) CIVA';
		const pureIrcSub = document.querySelector('#pure-irc-sub');
		if(pureIrcSub) pureIrcSub.textContent = 'Art. 17.º CIRC';
		const pureAtfNote = document.getElementById('pure-atf-note-text');
		if(pureAtfNote) {
			pureAtfNote.textContent = 'Score de Persistência calculado pelo motor computeTemporalAnalysis() sobre 4 meses de histórico (Set/Out/Nov/Dez 2024). SP calculado sobre o lote global (dados verificados UNIFED-MMLADX8Q-CV69L). As discrepâncias absolutas (C2: €2.184,95 — 89,26% · C1: €472,81 — 5,75%) mantêm relevância jurídica independente.';
		}
		const omissaoPctEl = document.getElementById('omissaoDespesasPctValue');
		if(omissaoPctEl) {
			const pctComissao = (t.despesas / t.ganhos) * 100;
			omissaoPctEl.textContent = pctComissao.toFixed(2) + '%';
		}
		const sg2BtorEl = document.getElementById('pure-sg2-btor-val');
		if(sg2BtorEl) sg2BtorEl.textContent = fmt(t.despesas);
		const sg2BtfEl = document.getElementById('pure-sg2-btf-val');
		if(sg2BtfEl) sg2BtfEl.textContent = fmt(t.faturaPlataforma);
		const sg1SaftEl = document.getElementById('pure-sg1-saft-val');
		if(sg1SaftEl) sg1SaftEl.textContent = fmt(t.saftBruto);
		const sg1Dac7El = document.getElementById('pure-sg1-dac7-val');
		if(sg1Dac7El) sg1Dac7El.textContent = fmt(t.dac7TotalPeriodo);
		const asfixiaEl = document.getElementById('pure-iva-devido');
		if(asfixiaEl) asfixiaEl.textContent = fmt(asfixiaFinanceira);
	};
	console.log('[UNIFED] Camada 2: OK.');
})();
(function() {
	'use strict';
	if(!window.UNIFED_INTERNAL) return;
	const {
		data,
		fmt
	} = window.UNIFED_INTERNAL;
	window.UNIFED_INTERNAL.renderMatrix = function() {
		const target = document.getElementById('pureDashboard');
		if(!target || document.getElementById('triangulationMatrixContainer')) return;
		const t = data.totals;
		const deltaSaft = t.ganhos - t.saftBruto;
		const deltaDac7 = t.ganhos - t.dac7TotalPeriodo;
		const deltaFatura = t.despesas - t.faturaPlataforma;
		const matrixHtml = `
        <div id="triangulationMatrixContainer" class="pure-triangulation-box" style="margin:30px 0; border:1px solid #00E5FF; background:rgba(15,23,42,0.95); padding:20px; border-radius:12px;">
            <h3 style="color:#00E5FF; margin-top:0; font-size:1rem;">🔍 MATRIZ DE TRIANGULAÇÃO FORENSE (ART. 119.º RGIT)</h3>
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                <thead>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.2);">
                        <th style="text-align:left; padding:10px;">FONTE DE PROVA</th>
                        <th style="text-align:right; padding:10px;">VALOR</th>
                        <th style="text-align:right; padding:10px; color:#EF4444;">DISCREPÂNCIA</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding:10px;">📄 SAF-T PT (Faturação)</td><td style="padding:10px; text-align:right;">${fmt(t.saftBruto)}</td><td style="padding:10px; text-align:right;">-${fmt(deltaSaft)}</td></tr>
                    <tr style="background:rgba(239,68,68,0.08);"><td style="padding:10px;">🌐 DAC7 (Plataforma A)</td><td style="padding:10px; text-align:right;">${fmt(t.dac7TotalPeriodo)}</td><td style="padding:10px; text-align:right;">-${fmt(deltaDac7)}</td></tr>
                    <tr><td style="padding:10px;">📑 Faturas BTF (Comissões)</td><td style="padding:10px; text-align:right;">${fmt(t.faturaPlataforma)}</td><td style="padding:10px; text-align:right;">-${fmt(deltaFatura)}</td></tr>
                    <tr style="border-top:2px solid #00E5FF;"><td style="padding:10px; font-weight:bold;">💰 LEDGER (Ganhos Reais)</td><td style="padding:10px; text-align:right; font-weight:bold;">${fmt(t.ganhos)}</td><td style="padding:10px; text-align:right;">---</td></tr>
                </tbody>
            </table>
            <div style="margin-top: 15px; font-size: 0.7rem; color: #94a3b8; border-top: 1px solid rgba(0,229,255,0.2); padding-top: 10px;">
                <strong>Nota Metodológica:</strong> A divergência entre o valor faturado (SAF-T/DAC7) e o valor real creditado (Ledger) evidencia uma omissão de base tributável de ${fmt(deltaFatura)} (${((deltaFatura/t.despesas)*100).toFixed(2)}%) nas comissões retidas pela plataforma, configurando contra-ordenação tributária nos termos do Art. 119.º RGIT.
            </div>
        </div>`;
		target.insertAdjacentHTML('beforeend', matrixHtml);
	};
	console.log('[UNIFED] Camada 3: OK.');
})();
(function() {
	'use strict';
	if(!window.UNIFED_INTERNAL) return;
	const {
		data,
		fmt,
		set,
		syncMetrics,
		renderMatrix
	} = window.UNIFED_INTERNAL;

	function _injectAuxiliaryBoxesCSS() {
		const styleId = 'unifed-aux-boxes-fix';
		if(document.getElementById(styleId)) return;
		const css = `
            .auxiliary-helper-section {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            .aux-boxes-grid {
                display: grid !important;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important;
                gap: 0.75rem !important;
                width: 100% !important;
            }
            .small-info-box {
                width: 100% !important;
                margin: 0 !important;
                box-sizing: border-box !important;
            }
            .evidence-counter, .evidence-summary {
                display: none !important;
            }
            @media (max-width: 640px) {
                .aux-boxes-grid {
                    grid-template-columns: repeat(2, 1fr) !important;
                }
            }
            @media (max-width: 480px) {
                .aux-boxes-grid {
                    grid-template-columns: 1fr !important;
                }
            }
            .chart-section {
                display: block !important;
                height: auto !important;
                min-height: 350px !important;
                overflow: visible !important;
            }
            canvas#mainChart, canvas#discrepancyChart {
                width: 100% !important;
                height: 300px !important;
            }
        `;
		const style = document.createElement('style');
		style.id = styleId;
		style.textContent = css;
		document.head.appendChild(style);
		console.log('[UNIFED] CSS injetado.');
	}

	function _injectMacroCard() {
		const target = document.getElementById('pureDashboard');
		if(!target) return;
		if(document.getElementById('pureMacroCard')) return;
		const macro = data.macro_analysis;
		if(!macro) return;
		const monthlyLoss = (macro.sector_drivers || 38000) * (macro.avg_monthly_discrepancy || 546.24);
		const cardHtml = `
        <div class="pure-card pure-card-macro" id="pureMacroCard">
            <h3 class="pure-card-title">
                <span class="pure-icon">🌍</span>
                <span id="pure-macro-title" data-pt="IV. ANÁLISE DE RISCO SISTÉMICO (MIS)" data-en="IV. SYSTEMIC RISK ANALYSIS (MIS)">IV. ANÁLISE DE RISCO SISTÉMICO (MIS)</span>
            </h3>
            <div class="pure-macro-grid" style="display:flex; flex-wrap:wrap; gap:1rem; justify-content:space-between;">
                <div class="pure-macro-item" style="flex:1; min-width:160px; background:rgba(255,255,255,0.03); padding:12px; border-radius:6px;">
                    <div class="pure-macro-label" style="font-size:0.65rem; color:#94a3b8; text-transform:uppercase;" data-pt="Universo de Operadores" data-en="Operators Universe">Universo de Operadores</div>
                    <div id="pure-macro-universe" class="pure-macro-value" style="font-size:1.4rem; font-weight:700; color:#00E5FF;">${macro.sector_drivers.toLocaleString('pt-PT')}</div>
                    <div class="pure-macro-sub" style="font-size:0.6rem; color:#64748b;">Sector TVDE Portugal</div>
                </div>
                <div class="pure-macro-item" style="flex:1; min-width:160px; background:rgba(255,255,255,0.03); padding:12px; border-radius:6px;">
                    <div class="pure-macro-label" style="font-size:0.65rem; color:#94a3b8; text-transform:uppercase;" data-pt="Horizonte Temporal" data-en="Time Horizon">Horizonte Temporal</div>
                    <div id="pure-macro-horizon" class="pure-macro-value" style="font-size:1.4rem; font-weight:700; color:#00E5FF;">${macro.operational_years} Anos</div>
                    <div class="pure-macro-sub" style="font-size:0.6rem; color:#64748b;">2019–2026</div>
                </div>
                <div class="pure-macro-item" style="flex:1; min-width:160px; background:rgba(255,255,255,0.03); padding:12px; border-radius:6px;">
                    <div class="pure-macro-label" style="font-size:0.65rem; color:#94a3b8; text-transform:uppercase;" data-pt="Erosão Mensal Estimada" data-en="Estimated Monthly Erosion">Erosão Mensal Estimada</div>
                    <div id="pure-macro-monthly-loss" class="pure-macro-value" style="font-size:1.4rem; font-weight:700; color:#F59E0B;">${_fmt(monthlyLoss)}</div>
                    <div class="pure-macro-sub" style="font-size:0.6rem; color:#64748b;">Art. 119.º RGIT</div>
                </div>
                <div class="pure-macro-item pure-macro-highlight" style="flex:1.5; min-width:200px; background:rgba(239,68,68,0.08); border-left:3px solid #EF4444; padding:12px; border-radius:6px;">
                    <div class="pure-macro-label" style="font-size:0.65rem; color:#94a3b8; text-transform:uppercase;" data-pt="Erosão Fiscal Estimada (7 Anos)" data-en="Estimated Tax Erosion (7 Years)">Erosão Fiscal Estimada (7 Anos)</div>
                    <div id="pure-macro-total-loss" class="pure-macro-value" style="font-size:1.6rem; font-weight:900; color:#EF4444;">${_fmt(macro.estimated_systemic_gap)}</div>
                    <div class="pure-macro-sub" style="font-size:0.6rem; color:#EF4444;">Art. 119.º RGIT (Iteração)</div>
                </div>
            </div>
            <div class="pure-macro-disclaimer" style="margin-top:1rem; padding:0.75rem; background:rgba(0,0,0,0.3); border-left:3px solid #FACC15; font-size:0.7rem; color:#94a3b8;">
                <i class="fas fa-gavel"></i> 
                <span data-pt="Os valores de impacto sistémico constituem contexto macroeconómico e não prova directa de ilícito alheio, nos termos do Art. 128.º do CPP." data-en="Systemic impact values constitute macroeconomic context and not direct proof of third-party wrongdoing, under Art. 128 CPP.">Os valores de impacto sistémico constituem contexto macroeconómico e não prova directa de ilícito alheio, nos termos do Art. 128.º do CPP.</span>
            </div>
        </div>`;
		target.insertAdjacentHTML('beforeend', cardHtml);
	}

	function _updateAuxiliaryUI() {
		if(!document.getElementById('pureDashboard')) return;
		const _f = (typeof _fmt === 'function') ? _fmt : (v) => {
			if(v === undefined || v === null || isNaN(v)) return "€ 0,00";
			return new Intl.NumberFormat('pt-PT', {
				style: 'currency',
				currency: 'EUR',
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(v);
		};
		const auxMapping = [{
			id: 'pure-ganhos',
			val: data.totals.ganhos
		}, {
			id: 'pure-despesas',
			val: data.totals.despesas
		}, {
			id: 'pure-liquido',
			val: data.totals.ganhosLiquidos
		}, {
			id: 'pure-saft',
			val: data.totals.saftBruto
		}, {
			id: 'pure-dac7',
			val: data.totals.dac7TotalPeriodo
		}, {
			id: 'pure-fatura',
			val: data.totals.faturaPlataforma
		}, {
			id: 'pure-disc-c2',
			val: data.totals.despesas - data.totals.faturaPlataforma
		}, {
			id: 'pure-disc-saft-dac7',
			val: data.totals.saftBruto - data.totals.dac7TotalPeriodo
		}, {
			id: 'pure-iva-6',
			val: data.totals.iva6Omitido
		}, {
			id: 'pure-iva-23',
			val: data.totals.iva23Omitido
		}, {
			id: 'pure-irc',
			val: (data.totals.despesas - data.totals.faturaPlataforma) * 0.21
		}, {
			id: 'pure-disc-c2-grid',
			val: data.totals.despesas - data.totals.faturaPlataforma
		}, {
			id: 'pure-iva-devido',
			val: data.totals.asfixiaFinanceira
		}, {
			id: 'pure-nao-sujeitos',
			val: data.totals.totalNaoSujeitos
		}, {
			id: 'pure-atf-sp',
			val: data.atf.score + '/100'
		}, {
			id: 'pure-atf-trend',
			val: data.atf.trend
		}, {
			id: 'pure-atf-outliers',
			val: data.atf.outliers + ' outliers > 2σ'
		}, {
			id: 'pure-atf-meses',
			val: '2.º Semestre 2024 — 4 meses com dados (Set–Dez)'
		}, {
			id: 'pure-nc-campanhas',
			val: data.totals.campanhas
		}, {
			id: 'pure-nc-gorjetas',
			val: data.totals.gorjetas
		}, {
			id: 'pure-nc-portagens',
			val: data.totals.portagens
		}, {
			id: 'pure-nc-total',
			val: data.totals.totalNaoSujeitos
		}, {
			id: 'pure-verdict',
			val: 'RISCO ELEVADO · CONTRA-ORDENAÇÃO'
		}, {
			id: 'pure-verdict-pct',
			val: ((data.totals.despesas - data.totals.faturaPlataforma) / data.totals.despesas * 100).toFixed(2) + '%'
		}, {
			id: 'pure-hash-prefix-verdict',
			val: data.masterHash.substring(0, 16) + '...'
		}, {
			id: 'pure-session-id',
			val: data.sessionId
		}, {
			id: 'pure-hash-prefix',
			val: data.masterHash.substring(0, 12) + '...'
		}, {
			id: 'pure-subject-name',
			val: data.client.name
		}, {
			id: 'pure-subject-nif',
			val: data.client.nif
		}, {
			id: 'pure-subject-platform',
			val: data.client.platform
		}, {
			id: 'pure-ganhos-extrato',
			val: data.totals.ganhos
		}, {
			id: 'pure-despesas-extrato',
			val: data.totals.despesas
		}, {
			id: 'pure-ganhos-liquidos-extrato',
			val: data.totals.ganhosLiquidos
		}, {
			id: 'pure-saft-bruto-val',
			val: data.totals.saftBruto
		}, {
			id: 'pure-dac7-val',
			val: data.totals.dac7TotalPeriodo
		}, {
			id: 'pure-atf-zscore',
			val: data.atf.zScore
		}, {
			id: 'pure-atf-confianca',
			val: data.atf.confianca
		}, {
			id: 'pure-atf-score-val',
			val: data.atf.score + '/100'
		}, {
			id: 'pure-iva-devido-val',
			val: data.totals.asfixiaFinanceira
		}, {
			id: 'pure-impacto-macro',
			val: data.macro_analysis.estimated_systemic_gap
		}, {
			id: 'pure-ctrl-qty',
			val: data.counts.ctrl
		}, {
			id: 'pure-saft-qty',
			val: data.counts.saft
		}, {
			id: 'pure-fat-qty',
			val: data.counts.fat
		}, {
			id: 'pure-ext-qty',
			val: data.counts.ext
		}, {
			id: 'pure-dac7-qty',
			val: data.counts.dac7
		}, {
			id: 'auxBoxCampanhasValue',
			val: data.totals.campanhas
		}, {
			id: 'auxBoxPortagensValue',
			val: data.totals.portagens
		}, {
			id: 'auxBoxGorjetasValue',
			val: data.totals.gorjetas
		}, {
			id: 'auxBoxTotalNSValue',
			val: data.totals.totalNaoSujeitos
		}, {
			id: 'auxBoxCancelValue',
			val: data.totals.cancelamentos
		}, {
			id: 'auxDac7NoteValue',
			val: data.totals.totalNaoSujeitos
		}, {
			id: 'auxDac7NoteValueQ',
			val: data.totals.totalNaoSujeitos
		}];
		let updatedCount = 0;
		auxMapping.forEach(item => {
			const el = document.getElementById(item.id);
			if(el) {
				if(typeof item.val === 'number') {
					el.textContent = _f(item.val);
				} else {
					el.textContent = item.val;
				}
				updatedCount++;
			}
		});
		const sg2Legal = document.getElementById('pure-sg2-legal');
		if(sg2Legal) sg2Legal.textContent = 'Art. 36.º n.º 11 CIVA · Art. 119.º RGIT';
		const sg1Legal = document.getElementById('pure-sg1-legal');
		if(sg1Legal) sg1Legal.textContent = 'Diretiva DAC7 (UE) 2021/514 · DL n.º 41/2023';
		const verdictBasis = document.getElementById('pure-verdict-basis');
		if(verdictBasis) verdictBasis.textContent = 'Art. 119.º RGIT · Art. 125.º CPP';
		const pureIva23Sub = document.querySelector('#pure-iva23-sub');
		if(pureIva23Sub) pureIva23Sub.textContent = 'Art. 2.º n.º 1 al. i) CIVA';
		const pureIrcSub = document.querySelector('#pure-irc-sub');
		if(pureIrcSub) pureIrcSub.textContent = 'Art. 17.º CIRC';
		const pureAtfNote = document.getElementById('pure-atf-note-text');
		if(pureAtfNote) {
			pureAtfNote.textContent = 'Score de Persistência calculado pelo motor computeTemporalAnalysis() sobre 4 meses de histórico (Set/Out/Nov/Dez 2024). SP calculado sobre o lote global (dados verificados UNIFED-MMLADX8Q-CV69L). As discrepâncias absolutas (C2: €2.184,95 — 89,26% · C1: €472,81 — 5,75%) mantêm relevância jurídica independente.';
		}
		const dac7Note = document.getElementById('auxDac7ReconciliationNote');
		if(dac7Note && data.totals.totalNaoSujeitos > 0) {
			dac7Note.style.display = 'block';
		}
		const questionText = document.getElementById('pure-zc-question-text');
		if(questionText) {
			questionText.textContent = 'Pode a plataforma confirmar se os €451,15 em Gorjetas e Campanhas (isentos de comissão nos termos da Lei TVDE) foram incluídos na base de cálculo do reporte DAC7 enviado pela plataforma à Autoridade Tributária? Se sim, qual o fundamento legal?';
		}
		console.log(`[UNIFED] UI auxiliar atualizada: ${updatedCount} campos sincronizados.`);
	}
	window.UNIFED_INTERNAL.injectAuxiliaryBoxesCSS = _injectAuxiliaryBoxesCSS;
	window.UNIFED_INTERNAL.injectMacroCard = _injectMacroCard;
	window.UNIFED_INTERNAL.updateAuxiliaryUI = _updateAuxiliaryUI;
	console.log('[UNIFED] Camada 4: OK.');
})();
(function() {
	'use strict';
	if(!window.UNIFED_INTERNAL) return;
	const {
		data,
		fmt
	} = window.UNIFED_INTERNAL;

	function _forcePlatformReadOnly() {
		const platformSelect = document.getElementById('selPlatformFixed');
		if(platformSelect) {
			for(let i = 0; i < platformSelect.options.length; i++) {
				if(platformSelect.options[i].value === 'outra') {
					platformSelect.selectedIndex = i;
					break;
				}
			}
			platformSelect.disabled = true;
			platformSelect.style.opacity = '0.7';
			platformSelect.style.cursor = 'not-allowed';
		}
		if(window.UNIFEDSystem) window.UNIFEDSystem.selectedPlatform = 'outra';
		console.log('[UNIFED] Plataforma forçada para "Plataforma A" em modo read‑only.');
	}

	function _removeZeroDac7Kpis() {
		const zeroKpis = ['dac7Q1Value', 'dac7Q2Value', 'dac7Q3Value'];
		zeroKpis.forEach(id => {
			const el = document.getElementById(id);
			if(el) {
				const card = el.closest('.kpi-card');
				if(card) card.remove();
				else el.remove();
			}
		});
	}
	async function _simulateEvidenceUpload() {
		try {
			if(typeof window.UNIFEDSystem === 'undefined') {
				console.warn('[UNIFED] UNIFEDSystem não disponível para simular upload.');
				throw new Error('UNIFEDSystem not found');
			}
			const sys = window.UNIFEDSystem;
			const t = data.totals;
			if(!sys.documents) sys.documents = {};
			if(!sys.documents.control) sys.documents.control = {
				files: [],
				totals: {
					records: 0
				}
			};
			if(!sys.documents.saft) sys.documents.saft = {
				files: [],
				totals: {
					bruto: 0,
					iliquido: 0,
					iva: 0,
					records: 0
				}
			};
			if(!sys.documents.statements) sys.documents.statements = {
				files: [],
				totals: {
					ganhos: 0,
					despesas: 0,
					ganhosLiquidos: 0,
					records: 0
				}
			};
			if(!sys.documents.invoices) sys.documents.invoices = {
				files: [],
				totals: {
					invoiceValue: 0,
					records: 0
				}
			};
			if(!sys.documents.dac7) sys.documents.dac7 = {
				files: [],
				totals: {
					q1: 0,
					q2: 0,
					q3: 0,
					q4: 0,
					totalPeriodo: 0,
					records: 0
				}
			};
			if(!sys.analysis) sys.analysis = {
				evidenceIntegrity: []
			};
			if(!sys.analysis.evidenceIntegrity) sys.analysis.evidenceIntegrity = [];
			// Limpar dados existentes
			sys.documents.control.files = [];
			sys.documents.saft.files = [];
			sys.documents.statements.files = [];
			sys.documents.invoices.files = [];
			sys.documents.dac7.files = [];
			sys.analysis.evidenceIntegrity = [];
			const controlFiles = [{
				name: 'controlo_autenticidade_1.csv',
				type: 'control',
				size: 256
			}, {
				name: 'controlo_autenticidade_2.csv',
				type: 'control',
				size: 256
			}, {
				name: 'controlo_autenticidade_3.csv',
				type: 'control',
				size: 256
			}, {
				name: 'controlo_autenticidade_4.csv',
				type: 'control',
				size: 256
			}];
			for(const file of controlFiles) {
				sys.documents.control.files.push({
					name: file.name,
					size: file.size
				});
				const hash = await window.generateForensicHash(file.name + 'control_demo');
				sys.analysis.evidenceIntegrity.push({
					filename: file.name,
					type: 'control',
					hash: hash,
					timestamp: new Date().toISOString(),
					size: file.size
				});
			}
			sys.documents.control.totals.records = controlFiles.length;
			const saftFiles = [{
				name: '131509_202409.csv',
				type: 'saft',
				size: 1024
			}, {
				name: '131509_202410.csv',
				type: 'saft',
				size: 1024
			}, {
				name: '131509_202411.csv',
				type: 'saft',
				size: 1024
			}, {
				name: '131509_202412.csv',
				type: 'saft',
				size: 1024
			}];
			for(const file of saftFiles) {
				sys.documents.saft.files.push({
					name: file.name,
					size: file.size
				});
				const hash = await window.generateForensicHash(file.name + 'saft_demo');
				sys.analysis.evidenceIntegrity.push({
					filename: file.name,
					type: 'saft',
					hash: hash,
					timestamp: new Date().toISOString(),
					size: file.size
				});
			}
			sys.documents.saft.totals.bruto = t.saftBruto;
			sys.documents.saft.totals.iliquido = t.saftIliquido;
			sys.documents.saft.totals.iva = t.saftIva;
			sys.documents.saft.totals.records = saftFiles.length;
			const statementFiles = [{
				name: 'extrato_setembro_2024.pdf',
				type: 'statement',
				size: 2048
			}, {
				name: 'extrato_outubro_2024.pdf',
				type: 'statement',
				size: 2048
			}, {
				name: 'extrato_novembro_2024.pdf',
				type: 'statement',
				size: 2048
			}, {
				name: 'extrato_dezembro_2024.pdf',
				type: 'statement',
				size: 2048
			}];
			for(const file of statementFiles) {
				sys.documents.statements.files.push({
					name: file.name,
					size: file.size
				});
				const hash = await window.generateForensicHash(file.name + 'statement_demo');
				sys.analysis.evidenceIntegrity.push({
					filename: file.name,
					type: 'statement',
					hash: hash,
					timestamp: new Date().toISOString(),
					size: file.size
				});
			}
			sys.documents.statements.totals.ganhos = t.ganhos;
			sys.documents.statements.totals.despesas = t.despesas;
			sys.documents.statements.totals.ganhosLiquidos = t.ganhosLiquidos;
			sys.documents.statements.totals.records = statementFiles.length;
			const invoiceFiles = [{
				name: 'PT1124_202412.pdf',
				type: 'invoice',
				size: 512
			}, {
				name: 'PT1125_202412.pdf',
				type: 'invoice',
				size: 512
			}];
			for(const file of invoiceFiles) {
				sys.documents.invoices.files.push({
					name: file.name,
					size: file.size
				});
				const hash = await window.generateForensicHash(file.name + 'invoice_demo');
				sys.analysis.evidenceIntegrity.push({
					filename: file.name,
					type: 'invoice',
					hash: hash,
					timestamp: new Date().toISOString(),
					size: file.size
				});
			}
			sys.documents.invoices.totals.invoiceValue = t.faturaPlataforma;
			sys.documents.invoices.totals.records = invoiceFiles.length;
			const dac7Files = [{
				name: 'dac7_2024_semestre2.pdf',
				type: 'dac7',
				size: 1024
			}];
			for(const file of dac7Files) {
				sys.documents.dac7.files.push({
					name: file.name,
					size: file.size
				});
				const hash = await window.generateForensicHash(file.name + 'dac7_demo');
				sys.analysis.evidenceIntegrity.push({
					filename: file.name,
					type: 'dac7',
					hash: hash,
					timestamp: new Date().toISOString(),
					size: file.size
				});
			}
			sys.documents.dac7.totals.q4 = t.dac7TotalPeriodo;
			sys.documents.dac7.totals.q3 = 0;
			sys.documents.dac7.totals.q1 = 0;
			sys.documents.dac7.totals.q2 = 0;
			sys.documents.dac7.totals.totalPeriodo = t.dac7TotalPeriodo;
			sys.documents.dac7.totals.records = dac7Files.length;
			if(!sys.auxiliaryData) sys.auxiliaryData = {};
			sys.auxiliaryData.campanhas = t.campanhas || 0;
			sys.auxiliaryData.portagens = t.portagens || 0;
			sys.auxiliaryData.gorjetas = t.gorjetas || 0;
			sys.auxiliaryData.cancelamentos = t.cancelamentos || 0;
			sys.auxiliaryData.totalNaoSujeitos = (t.campanhas || 0) + (t.portagens || 0) + (t.gorjetas || 0);
			sys.auxiliaryData.processedFrom = [];
			sys.auxiliaryData.extractedAt = new Date().toISOString();
			if(!sys.monthlyData) sys.monthlyData = {};
			const monthlyGanhos = [2450.00, 2560.00, 2480.00, 2667.73];
			const monthlyDespesas = [590.00, 615.00, 600.00, 642.89];
			const monthlyGanhosLiq = [1860.00, 1945.00, 1880.00, 2024.84];
			const months = ['202409', '202410', '202411', '202412'];
			months.forEach((month, idx) => {
				sys.monthlyData[month] = {
					ganhos: monthlyGanhos[idx],
					despesas: monthlyDespesas[idx],
					ganhosLiq: monthlyGanhosLiq[idx]
				};
			});
			sys.dataMonths = new Set(months);
			if(!sys.analysis.totals) sys.analysis.totals = {};
			sys.analysis.totals.saftBruto = t.saftBruto;
			sys.analysis.totals.saftIliquido = t.saftIliquido;
			sys.analysis.totals.saftIva = t.saftIva;
			sys.analysis.totals.ganhos = t.ganhos;
			sys.analysis.totals.despesas = t.despesas;
			sys.analysis.totals.ganhosLiquidos = t.ganhosLiquidos;
			sys.analysis.totals.faturaPlataforma = t.faturaPlataforma;
			sys.analysis.totals.dac7Q1 = 0;
			sys.analysis.totals.dac7Q2 = 0;
			sys.analysis.totals.dac7Q3 = 0;
			sys.analysis.totals.dac7Q4 = t.dac7TotalPeriodo;
			sys.analysis.totals.dac7TotalPeriodo = t.dac7TotalPeriodo;
			const discrepanciaSaftVsDac7 = t.saftBruto - t.dac7TotalPeriodo;
			const percentagemSaftVsDac7 = t.saftBruto > 0 ? (discrepanciaSaftVsDac7 / t.saftBruto) * 100 : 0;
			const discrepanciaCritica = t.despesas - t.faturaPlataforma;
			const percentagemOmissao = t.despesas > 0 ? (discrepanciaCritica / t.despesas) * 100 : 0;
			const ivaFalta = discrepanciaCritica * 0.23;
			const ivaFalta6 = discrepanciaCritica * 0.06;
			const agravamentoBrutoIRC = discrepanciaCritica;
			const ircEstimado = discrepanciaCritica * 0.21;
			const asfixiaFinanceira = t.saftBruto * 0.06;
			if(!sys.analysis.crossings) sys.analysis.crossings = {};
			sys.analysis.crossings.discrepanciaSaftVsDac7 = discrepanciaSaftVsDac7;
			sys.analysis.crossings.percentagemSaftVsDac7 = percentagemSaftVsDac7;
			sys.analysis.crossings.discrepanciaCritica = discrepanciaCritica;
			sys.analysis.crossings.percentagemOmissao = percentagemOmissao;
			sys.analysis.crossings.ivaFalta = ivaFalta;
			sys.analysis.crossings.ivaFalta6 = ivaFalta6;
			sys.analysis.crossings.agravamentoBrutoIRC = agravamentoBrutoIRC;
			sys.analysis.crossings.ircEstimado = ircEstimado;
			sys.analysis.crossings.asfixiaFinanceira = asfixiaFinanceira;
			sys.analysis.crossings.btor = t.despesas;
			sys.analysis.crossings.btf = t.faturaPlataforma;
			sys.analysis.crossings.c1_delta = discrepanciaSaftVsDac7;
			sys.analysis.crossings.c1_pct = percentagemSaftVsDac7;
			sys.analysis.crossings.c2_delta = discrepanciaCritica;
			sys.analysis.crossings.c2_pct = percentagemOmissao;
			if(!sys.client && data.client) {
				sys.client = {
					name: data.client.name,
					nif: data.client.nif,
					platform: data.client.platform
				};
				const clientStatus = document.getElementById('clientStatusFixed');
				if(clientStatus) {
					clientStatus.style.display = 'flex';
					const nameSpan = document.getElementById('clientNameDisplayFixed');
					const nifSpan = document.getElementById('clientNifDisplayFixed');
					if(nameSpan) nameSpan.textContent = data.client.name;
					if(nifSpan) nifSpan.textContent = data.client.nif;
				}
				const nameInput = document.getElementById('clientNameFixed');
				const nifInput = document.getElementById('clientNIFFixed');
				if(nameInput) nameInput.value = data.client.name;
				if(nifInput) nifInput.value = data.client.nif;
			}
			const periodSelect = document.getElementById('periodoAnalise');
			if(periodSelect) {
				periodSelect.value = '2s';
				if(typeof window.UNIFEDSystem !== 'undefined') window.UNIFEDSystem.selectedPeriodo = '2s';
				const changeEvent = new Event('change', {
					bubbles: true
				});
				periodSelect.dispatchEvent(changeEvent);
			}
			const trimestralContainer = document.getElementById('trimestralSelectorContainer');
			if(trimestralContainer) trimestralContainer.style.display = 'none';
			const evidenceHashes = sys.analysis.evidenceIntegrity.map(ev => ev.hash).filter(h => h && h.length === 64).sort();
			const binaryConcat = evidenceHashes.join('') + JSON.stringify({
				client: sys.client,
				totals: t
			}) + sys.sessionId;
			const masterHashFull = await window.generateForensicHash(binaryConcat);
			sys.masterHash = masterHashFull;
			window.activeForensicSession = {
				sessionId: sys.sessionId,
				masterHash: masterHashFull
			};
			console.log('[UNIFED] Evidências simuladas carregadas. Total: 15 ficheiros.');
			return true;
		} catch (err) {
			console.error('[UNIFED] Erro na simulação de evidências:', err);
			throw err;
		}
	}

	function _updateEvidenceCountersAndShow() {
		const sys = window.UNIFEDSystem;
		if(!sys || !sys.documents) return;
		const controlCount = sys.documents.control?.files?.length || 0;
		const saftCount = sys.documents.saft?.files?.length || 0;
		const invoiceCount = sys.documents.invoices?.files?.length || 0;
		const statementCount = sys.documents.statements?.files?.length || 0;
		const dac7Count = sys.documents.dac7?.files?.length || 0;
		const total = controlCount + saftCount + invoiceCount + statementCount + dac7Count;
		const setText = (id, val) => {
			const el = document.getElementById(id);
			if(el) el.textContent = val;
		};
		setText('controlCountCompact', controlCount);
		setText('saftCountCompact', saftCount);
		setText('invoiceCountCompact', invoiceCount);
		setText('statementCountCompact', statementCount);
		setText('dac7CountCompact', dac7Count);
		setText('summaryControl', controlCount);
		setText('summarySaft', saftCount);
		setText('summaryInvoices', invoiceCount);
		setText('summaryStatements', statementCount);
		setText('summaryDac7', dac7Count);
		setText('summaryTotal', total);
		const evidenceCountTotal = document.getElementById('evidenceCountTotal');
		if(evidenceCountTotal) evidenceCountTotal.textContent = total;
		const evidenceSection = document.getElementById('pureEvidenceSection');
		if(evidenceSection) evidenceSection.style.display = 'block';
		const counters = ['controlCountCompact', 'saftCountCompact', 'invoiceCountCompact', 'statementCountCompact', 'dac7CountCompact'];
		counters.forEach(id => {
			const el = document.getElementById(id);
			if(el) el.style.display = 'inline-block';
		});
		console.log('[UNIFED] Contadores de evidências atualizados e secção revelada.');
	}
	window.UNIFED_INTERNAL.forcePlatformReadOnly = _forcePlatformReadOnly;
	window.UNIFED_INTERNAL.removeZeroDac7Kpis = _removeZeroDac7Kpis;
	window.UNIFED_INTERNAL.simulateEvidenceUpload = _simulateEvidenceUpload;
	window.UNIFED_INTERNAL.updateEvidenceCountersAndShow = _updateEvidenceCountersAndShow;
	console.log('[UNIFED] Camada 5: OK.');
})();
(function() {
	'use strict';
	if(!window.UNIFED_INTERNAL) return;
	const {
		data,
		fmt,
		set,
		syncMetrics,
		renderMatrix
	} = window.UNIFED_INTERNAL;
	const {
		injectAuxiliaryBoxesCSS,
		injectMacroCard,
		updateAuxiliaryUI,
		forcePlatformReadOnly,
		removeZeroDac7Kpis,
		simulateEvidenceUpload,
		updateEvidenceCountersAndShow
	} = window.UNIFED_INTERNAL;

	function showClientIdentificationBlock() {
		let block = document.getElementById('clientIdentificationBlock');
		if(!block) {
			const sidebarHeader = document.querySelector('.sidebar-header-fixed');
			if(sidebarHeader) {
				sidebarHeader.id = 'clientIdentificationBlock';
				block = sidebarHeader;
				console.log('[UNIFED] ID clientIdentificationBlock atribuído dinamicamente ao .sidebar-header-fixed');
			} else {
				console.warn('[UNIFED] Elemento .sidebar-header-fixed não encontrado. O bloco de identificação não será exibido.');
				return;
			}
		}
		const subjectHeader = document.getElementById('pure-subject-header');
		if(subjectHeader) {
			subjectHeader.style.display = 'block';
			console.log('[UNIFED] Bloco de identificação do sujeito passivo revelado.');
		}
	}

	function waitForPureDashboard() {
		return new Promise((resolve) => {
			if(document.getElementById('pureDashboard')) {
				resolve();
				return;
			}
			const observer = new MutationObserver((mutations, obs) => {
				if(document.getElementById('pureDashboard')) {
					obs.disconnect();
					resolve();
				}
			});
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			setTimeout(() => {
				observer.disconnect();
				resolve();
			}, 5000);
		});
	}

	function initializeCoreDashboard() {
		waitForPureDashboard().then(() => {
			setTimeout(() => {
				if(typeof window.injectAuxiliaryHelperBoxes === 'function') {
					window.injectAuxiliaryHelperBoxes();
				}
				if(typeof syncMetrics === 'function') syncMetrics();
				if(typeof renderMatrix === 'function') renderMatrix();
				if(typeof injectMacroCard === 'function') injectMacroCard();
				if(typeof injectAuxiliaryBoxesCSS === 'function') injectAuxiliaryBoxesCSS();
				if(typeof forcePlatformReadOnly === 'function') forcePlatformReadOnly();
				if(typeof removeZeroDac7Kpis === 'function') removeZeroDac7Kpis();
				if(document.getElementById('pureDashboard')) {
					if(typeof updateAuxiliaryUI === 'function') updateAuxiliaryUI();
					document.querySelectorAll('.chart-section').forEach(section => {
						section.style.display = 'block';
						section.style.height = '400px';
					});
				} else {
					if(typeof Chart === 'undefined') {
						const chartSections = document.querySelectorAll('.chart-section');
						chartSections.forEach(section => {
							section.style.display = 'none';
						});
						console.warn('[UNIFED] Chart.js não disponível – secções de gráfico ocultadas.');
					}
					console.info('[UNIFED] Aguardando renderização do painel para sincronização auxiliar.');
				}
				console.log('[UNIFED] Core dashboard inicializado com sucesso após injeção do painel.');
			}, 100);
		}).catch(err => console.warn('[UNIFED] Erro ao aguardar #pureDashboard', err));
	}
	async function initializeFullWithEvidence() {
		console.log('[UNIFED] A carregar evidências do caso real...');
		await waitForPureDashboard();
		try {
			await simulateEvidenceUpload();
			updateEvidenceCountersAndShow();
			// Garantir que as boxes auxiliares estão injetadas
			if(typeof window.injectAuxiliaryHelperBoxes === 'function') {
				window.injectAuxiliaryHelperBoxes();
			}
			if(typeof updateAuxiliaryUI === 'function') updateAuxiliaryUI();
			if(window.UNIFEDSystem && window.UNIFEDSystem.masterHash) {
				const hashEl = document.getElementById('masterHashValue');
				if(hashEl) hashEl.textContent = window.UNIFEDSystem.masterHash;
				if(typeof generateQRCode === 'function') generateQRCode();
			}
			showClientIdentificationBlock();
			// Forçar renderização dos gráficos
			if(typeof window.renderChart === 'function') window.renderChart();
			if(typeof window.renderDiscrepancyChart === 'function') window.renderDiscrepancyChart();
			console.log('[UNIFED] ✅ Evidências carregadas e secção revelada.');
		} catch (err) {
			console.error('[UNIFED] Falha ao carregar evidências:', err);
		}
	}

	function setupRealCaseButton() {
		let targetButton = document.getElementById('demoModeBtn');
		if(!targetButton) {
			const buttons = document.querySelectorAll('button, .btn, [role="button"]');
			for(let btn of buttons) {
				if(btn.textContent.trim() === 'CASO REAL ANONIMIZADO') {
					targetButton = btn;
					break;
				}
			}
		}
		if(!targetButton) {
			console.warn('[UNIFED] Botão "CASO REAL ANONIMIZADO" não encontrado. Listener genérico activado.');
			document.body.addEventListener('click', async function(e) {
				const el = e.target.closest('button, .btn, [role="button"]');
				if(el && el.textContent.includes('CASO REAL ANONIMIZADO')) {
					e.preventDefault();
					if(typeof window._activatePurePanel === 'function') {
						window._activatePurePanel();
					}
					await waitForPureDashboard();
					await new Promise(r => setTimeout(r, 100));
					window.UNIFED_INTERNAL.syncMetrics();
					initializeFullWithEvidence();
				}
			});
			return;
		}
		const newBtn = targetButton.cloneNode(true);
		targetButton.parentNode.replaceChild(newBtn, targetButton);
		newBtn.addEventListener('click', async function(e) {
			e.preventDefault();
			if(typeof window._activatePurePanel === 'function') {
				window._activatePurePanel();
			}
			await waitForPureDashboard();
			await new Promise(r => setTimeout(r, 100));
			window.UNIFED_INTERNAL.syncMetrics();
			initializeFullWithEvidence();
		});
		console.log('[UNIFED] Listener associado ao botão "CASO REAL ANONIMIZADO".');
	}

	function generateQRCode() {
		const container = document.getElementById('qrcodeContainer');
		if(!container) return;
		container.innerHTML = '';
		const hashFull = window.UNIFEDSystem?.masterHash || 'HASH_INDISPONIVEL';
		const sessionShort = window.UNIFEDSystem?.sessionId ? window.UNIFEDSystem.sessionId.substring(0, 16) : 'N/A';
		const qrData = `UNIFED|${sessionShort}|${hashFull}`;
		if(typeof QRCode !== 'undefined') {
			new QRCode(container, {
				text: qrData,
				width: 75,
				height: 75,
				colorDark: "#000000",
				colorLight: "#ffffff",
				correctLevel: QRCode.CorrectLevel.L
			});
		}
		container.setAttribute('data-tooltip', 'Clique para verificar a cadeia de custódia completa');
	}
	window.generateQRCode = generateQRCode;

	function startApplication() {
		return new Promise((resolve) => {
			if(document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', () => resolve());
			} else {
				resolve();
			}
		}).then(() => {
			initializeCoreDashboard();
			setupRealCaseButton();
			console.log('[UNIFED] ✅ Aplicação pronta. Clique em "CASO REAL ANONIMIZADO" para carregar as evidências.');
		}).catch(err => {
			console.error('[UNIFED] Erro na inicialização:', err);
		});
	}
	startApplication();
})();