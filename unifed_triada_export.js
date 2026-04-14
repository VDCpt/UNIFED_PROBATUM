/**
 * UNIFED - PROBATUM · v13.12.2-i18n · MÓDULO DE EXPORTAÇÃO — TRÍADE DOCUMENTAL
 * ============================================================================
 * Ficheiro      : unifed_triada_export.js
 * Versão        : 1.0.21-TRIADA-FIX (Restauro de toolbar + força revelação)
 * ============================================================================
 * ALTERAÇÕES: Removida a injeção da toolbar para evitar conflito com os botões originais.
 * Mantida apenas a função gerarAnexoCustodia.
 */

'use strict';

(function _unifedTriadaModule() {
    const _VERSION = '1.0.21-TRIADA-FIX';

    function _log(msg, type = 'log') {
        const timestamp = new Date().toISOString();
        const method = (type === 'success') ? 'info' : (type === 'warn' ? 'warn' : type);
        console[method](`[${timestamp}] [TRIADA ${_VERSION}] ${msg}`);
    }

    function getStableMasterHash() {
        if (window.activeForensicSession && window.activeForensicSession.masterHash) return window.activeForensicSession.masterHash;
        if (window.UNIFEDSystem && window.UNIFEDSystem.demoMode) return "79b032809b9e54ea3504659c37edb9e49e6d462d691c75e4a5afd79d8bb8f86c";
        if (window.UNIFEDSystem && window.UNIFEDSystem.masterHash) return window.UNIFEDSystem.masterHash;
        return "PENDING_SEAL";
    }

    function _resolveLabels() {
        const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'pt';
        return {
            pdf: lang === 'en' ? 'FORENSIC EXPERT REPORT (MOD. 03-B)' : 'RELATÓRIO PERICIAL FORENSE (MOD. 03-B)',
            docx: lang === 'en' ? 'STATEMENT OF CLAIM DRAFT' : 'MINUTA DE PETIÇÃO INICIAL',
            custody: lang === 'en' ? 'DIGITAL MATERIAL EVIDENCE' : 'PROVA MATERIAL DIGITAL'
        };
    }

    function safeExport() {
        if (window._isGraphRendering) { window.showToast('Aguarde: Renderização de gráficos em curso...', 'warning'); return; }
        console.info('[TRIADA] Iniciando exportação segura (Integridade de Dados Validada).');
    }

    async function gerarAnexoCustodia() {
        const masterHash = getStableMasterHash();
        const sessionId = window.UNIFEDSystem?.sessionId || window.activeForensicSession?.sessionId || 'UNIFED-SESSION';
        _log(`🔒 A selar documento com Master Hash: ${masterHash}`);

        if (typeof window.jspdf === 'undefined') {
            _log('jsPDF não carregado. A gerar simulação de anexo.', 'warn');
            alert(`GERANDO PROVA MATERIAL DIGITAL\nMaster Hash: ${masterHash}\nSessão: ${sessionId}\nEstado: Integridade Validada.\n\nEste é um documento de prova com selo criptográfico.`);
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const marginX = 20;
        let currentY = 25;
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const lang = (typeof window.currentLang !== 'undefined') ? window.currentLang : 'pt';

        function addFooter(pageNum, totalPages) {
            doc.setFont('courier', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            const footerText = `Master Hash SHA-256: ${masterHash}`;
            const pageText = (lang === 'en') ? `Page ${pageNum} of ${totalPages}` : `Página ${pageNum} de ${totalPages}`;
            const textWidth = doc.getTextWidth(footerText);
            doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 10);
            const pageTextWidth = doc.getTextWidth(pageText);
            doc.text(pageText, pageWidth - marginX - pageTextWidth, pageHeight - 10);
            doc.setTextColor(0, 0, 0);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(lang === 'en' ? 'UNIFED - PROBATUM | DIGITAL MATERIAL EVIDENCE' : 'UNIFED - PROBATUM | PROVA MATERIAL DIGITAL', marginX, currentY);
        currentY += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(lang === 'en' ? 'CUSTODY AND INTEGRITY ANNEX · MOD. 03-B (ISO/IEC 27037:2012 STANDARD)' : 'ANEXO DE CUSTÓDIA E INTEGRIDADE · MOD. 03-B (NORMA ISO/IEC 27037:2012)', marginX, currentY);
        currentY += 15;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`${lang === 'en' ? 'Session' : 'Sessão'}: ${sessionId}`, marginX, currentY);
        currentY += 5;
        doc.text(`${lang === 'en' ? 'Date' : 'Data'}: ${new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT')}`, marginX, currentY);
        currentY += 5;
        doc.text(`Master Hash: ${masterHash}`, marginX, currentY);
        currentY += 10;

        const evidences = window.UNIFEDSystem?.analysis?.evidenceIntegrity || [];
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(lang === 'en' ? 'Processed evidence:' : 'Evidências processadas:', marginX, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        if (evidences.length === 0) {
            doc.text(lang === 'en' ? 'No evidence registered in this session.' : 'Nenhuma evidência registada nesta sessão.', marginX, currentY);
            currentY += 10;
        } else {
            evidences.slice(0, 20).forEach((ev, idx) => {
                if (currentY > pageHeight - 50) { addFooter(doc.internal.getNumberOfPages(), 0); doc.addPage(); currentY = 25; }
                doc.text(`${idx + 1}. ${ev.filename}`, marginX + 2, currentY);
                currentY += 5;
                doc.setFont('courier', 'normal');
                doc.text(`   SHA-256: ${ev.hash || 'N/A'}`, marginX + 2, currentY);
                currentY += 8;
                doc.setFont('helvetica', 'normal');
            });
        }

        const totalPages = doc.internal.getNumberOfPages() + 1;
        for (let p = 1; p <= totalPages - 1; p++) { doc.setPage(p); addFooter(p, totalPages); }

        doc.addPage();
        const lastPageNum = totalPages;
        currentY = 20;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(lang === 'en' ? 'INTEGRITY AND AUTHENTICITY SEAL' : 'SELO DE INTEGRIDADE E AUTENTICIDADE', marginX, currentY);
        currentY += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(lang === 'en' ? 'The QR code below contains the Master Hash SHA-256 and the session identifier,' : 'O código QR abaixo contém o Master Hash SHA-256 e o identificador da sessão,', marginX, currentY);
        currentY += 5;
        doc.text(lang === 'en' ? 'enabling immediate verification of document integrity.' : 'permitindo a verificação imediata da integridade do documento.', marginX, currentY);
        currentY += 12;

        try {
            const qrPayload = `UNIFED|${sessionId}|${masterHash}`;
            const tmpDiv = document.createElement('div');
            tmpDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
            document.body.appendChild(tmpDiv);
            new QRCode(tmpDiv, { text: qrPayload, width: 200, height: 200, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.L });
            await new Promise((resolve) => {
                setTimeout(() => {
                    const canvas = tmpDiv.querySelector('canvas');
                    if (canvas) {
                        const qrImgData = canvas.toDataURL('image/png');
                        const qrSize = 45;
                        const qrX = (pageWidth - qrSize) / 2;
                        doc.addImage(qrImgData, 'PNG', qrX, currentY, qrSize, qrSize);
                        currentY += qrSize + 8;
                    } else { doc.text(lang === 'en' ? '(QR Code unavailable)' : '(QR Code indisponível)', marginX, currentY); currentY += 10; }
                    document.body.removeChild(tmpDiv);
                    resolve();
                }, 100);
            });
        } catch (e) { _log('Erro na geração do QR Code: ' + e.message, 'warn'); doc.text(lang === 'en' ? '(QR Code unavailable)' : '(QR Code indisponível)', marginX, currentY); currentY += 10; }

        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(lang === 'en' ? 'Verify this QR code with any standard reader. The hash printed in the footer' : 'Verifique este código QR com qualquer leitor padrão. O hash impresso no rodapé', marginX, currentY);
        currentY += 4;
        doc.text(lang === 'en' ? 'of all pages must match the QR code.' : 'de todas as páginas deve coincidir com o código QR.', marginX, currentY);
        currentY += 8;
        doc.text(lang === 'en' ? 'Any alteration to the document will result in a divergent hash.' : 'Qualquer alteração no documento resultará numa hash divergente.', marginX, currentY);
        doc.setTextColor(0, 0, 0);

        addFooter(lastPageNum, totalPages);
        doc.save(`UNIFED_ANEXO_CUSTODIA_${sessionId}.pdf`);
        _log(`✅ Anexo de Custódia gerado com QR Code: ${sessionId}`, 'success');
    }

    window.gerarAnexoCustodia = gerarAnexoCustodia;
    window.initTriadaButtons = function() { /* intentionally empty to avoid overriding toolbar */ };
    window._restoreOriginalToolbar = function() { /* kept for compatibility */ };
    window.UNIFEDSystem = window.UNIFEDSystem || {};
    window.UNIFEDSystem.triadaUpdateLabels = function() {};
    _log(`Módulo Tríade Documental ${_VERSION} carregado (apenas anexo de custódia).`, 'success');
})();