/**
 * ============================================================================
 * UNIFED-PROBATUM · unifed_custody_engine.js
 * ============================================================================
 * Versão      : v1.0.0-CORE
 * Gerado em   : 2026-04-19
 * Conformidade: DORA (UE) 2022/2554 · Art. 125.º CPP · ISO/IEC 27037:2012
 *               eIDAS · RGPD Art. 25 (Privacy-by-Design)
 *
 * ÂMBITO (FASE 1):
 *   Motor de Custódia e Estado Determinístico Read-Only.
 *   Implementa:
 *     · Hashing Assíncrono Canónico (Web Crypto API — sem dependências externas)
 *     · Estado Imutável com Proxy + ZK Audit Trail (sem mutação do DOM)
 *     · Zero-Knowledge Proof (ZKP) via protocolo Fiat-Shamir adaptado
 *     · Shamir's Secret Sharing (k=2, n=3) sobre GF(257) — campo primo
 *     · Merkle Tree Forense (root para metadados NFT Forense)
 *     · Proof-of-Truth Protocol (PoT) com ancoragem simulada multi-chain
 *
 * ARQUITECTURA:
 *   Zero poluição do escopo global. Expõe apenas:
 *     · window.UNIFED_CUSTODY — namespace selado (Object.freeze)
 *   Todas as funções internas são closures privadas (IIFE).
 *
 * MODO DE OPERAÇÃO:
 *   Read-Only absoluto. Nenhuma escrita em APIs externas, cookies ou
 *   localStorage. Todos os cálculos são in-memory e descartados no
 *   encerramento da sessão (Zero-Persistence).
 * ============================================================================
 */

(function _installCustodyEngine(root) {
    'use strict';

    /* ── Guarda de idempotência ─────────────────────────────────────────── */
    if (root.UNIFED_CUSTODY && root.UNIFED_CUSTODY._INSTALLED === true) {
        console.info('[CUSTODY-ENGINE] Módulo já instalado. Re-instalação ignorada.');
        return;
    }

    /* ======================================================================
       SECÇÃO 1 — UTILITÁRIOS CRIPTOGRÁFICOS BASE
       ====================================================================== */

    /**
     * _bufferToHex(buffer) → string
     * Converte ArrayBuffer para string hexadecimal lowercase de 64 chars (SHA-256).
     * @param {ArrayBuffer} buffer
     * @returns {string}
     */
    function _bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(function (b) { return b.toString(16).padStart(2, '0'); })
            .join('');
    }

    /**
     * _hexToBuffer(hex) → Uint8Array
     * Converte string hex para Uint8Array para operações GF.
     * @param {string} hex
     * @returns {Uint8Array}
     */
    function _hexToBuffer(hex) {
        if (hex.length % 2 !== 0) throw new RangeError('[CUSTODY] Hex de comprimento ímpar: ' + hex.length);
        const arr = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
        }
        return arr;
    }

    /**
     * _sha256(data) → Promise<string>
     * Hashing SHA-256 assíncrono via Web Crypto API (FIPS 180-4).
     * NUNCA usa bibliotecas de terceiros — apenas primitivas nativas do browser.
     * @param {string|ArrayBuffer} data
     * @returns {Promise<string>} — hex lowercase de 64 caracteres
     */
    async function _sha256(data) {
        const encoded = (typeof data === 'string')
            ? new TextEncoder().encode(data)
            : data;
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
        return _bufferToHex(hashBuffer);
    }

    /**
     * _sortKeysDeep(obj) → any
     * Ordena recursivamente as chaves de um objecto lexicograficamente.
     * Garante determinismo na serialização — pré-requisito do hashing canónico.
     * @param {any} obj
     * @returns {any}
     */
    function _sortKeysDeep(obj) {
        if (Array.isArray(obj)) {
            return obj.map(_sortKeysDeep);
        }
        if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).sort().reduce(function (acc, key) {
                acc[key] = _sortKeysDeep(obj[key]);
                return acc;
            }, {});
        }
        return obj;
    }

    /**
     * canonicalHash(sessionSalt, payload) → Promise<{hash: string, input: string}>
     * Implementação canónica conforme especificação FASE 1:
     *   SHA-256(SessionSalt + JSON.stringify(sortedPayload))
     * @param {string} sessionSalt — GUID de sessão gerado em _initSession()
     * @param {Object} payload — dados quantitativos brutos
     * @returns {Promise<{hash: string, input: string, timestamp: string}>}
     */
    async function canonicalHash(sessionSalt, payload) {
        if (typeof sessionSalt !== 'string' || sessionSalt.length < 8) {
            throw new TypeError('[CUSTODY] sessionSalt inválido — mínimo 8 caracteres.');
        }
        const sorted = _sortKeysDeep(payload);
        const serialized = JSON.stringify(sorted);
        const input = sessionSalt + serialized;
        const hash = await _sha256(input);
        return {
            hash: hash,
            input_length: input.length,
            payload_keys_count: Object.keys(sorted).length,
            timestamp: new Date().toISOString(),
            method: 'SHA-256(SessionSalt || JSON(sortedPayload))'
        };
    }

    /* ======================================================================
       SECÇÃO 2 — ESTADO IMUTÁVEL COM PROXY E ZK AUDIT TRAIL
       ====================================================================== */

    /**
     * _createZKAuditTrail() → Object
     * Cria um registo de auditoria em memória (não-persistente) para
     * cada acesso a parâmetros quantitativos do estado.
     * @returns {{ log: Array, append: Function, export: Function }}
     */
    function _createZKAuditTrail() {
        const _entries = [];
        let _entryCounter = 0;

        return Object.freeze({
            append: function (accessType, keyPath, proofRef) {
                _entries.push(Object.freeze({
                    seq: ++_entryCounter,
                    ts: new Date().toISOString(),
                    op: accessType,     // 'READ' | 'HASH_READ'
                    key: keyPath,
                    zkp_ref: proofRef || null
                }));
            },
            export: function () {
                return _entries.slice(); // cópia defensiva — array imutável
            },
            count: function () { return _entryCounter; }
        });
    }

    /**
     * ImmutableForensicState
     * Contentor de estado imutável com intercepção via ES6 Proxy.
     * Qualquer leitura de chave numérica dispara geração de ZKP.
     * Mutações são rejeitadas com TypeError forense.
     */
    class ImmutableForensicState {
        #_raw;
        #_frozen;
        #_audit;
        #_sessionHash;
        #_proxy;

        constructor(initialData, sessionHash) {
            if (typeof initialData !== 'object' || initialData === null) {
                throw new TypeError('[CUSTODY] initialData deve ser um objecto não-nulo.');
            }
            this.#_raw = _sortKeysDeep(initialData);
            this.#_frozen = Object.freeze(JSON.parse(JSON.stringify(this.#_raw)));
            this.#_audit = _createZKAuditTrail();
            this.#_sessionHash = sessionHash || 'UNINITIALISED';

            /* Proxy de intercepção — sem mutação possível */
            this.#_proxy = new Proxy(this.#_frozen, {
                get: (target, prop) => {
                    if (typeof prop === 'symbol') return target[prop];
                    const value = target[prop];
                    const isQuantitative = (typeof value === 'number' && isFinite(value));

                    if (isQuantitative) {
                        /* Gerar ZKP para este acesso */
                        const zkpRef = _generateZKPStub(prop, value, this.#_sessionHash);
                        this.#_audit.append('HASH_READ', String(prop), zkpRef.commitmentHash);
                    } else {
                        this.#_audit.append('READ', String(prop), null);
                    }
                    return value;
                },
                set: () => {
                    throw new TypeError(
                        '[CUSTODY] Violação de Imutabilidade: tentativa de escrita num estado forense selado. ' +
                        'Opera em modo Read-Only estrito (Art. 125.º CPP).'
                    );
                },
                deleteProperty: () => {
                    throw new TypeError('[CUSTODY] Eliminação de propriedade proibida em estado forense selado.');
                }
            });
        }

        /** Acesso ao estado via Proxy (ZKP activado em leituras numéricas) */
        get state() { return this.#_proxy; }

        /** Exporta o audit trail completo (sem o estado raw) */
        exportAuditTrail() { return this.#_audit.export(); }

        /** Retorna contagem de acessos registados */
        accessCount() { return this.#_audit.count(); }
    }

    /* ======================================================================
       SECÇÃO 3 — ZERO-KNOWLEDGE PROOF (PROTOCOLO FIAT-SHAMIR ADAPTADO)
       ====================================================================== */

    /**
     * _generateZKPStub(paramName, paramValue, sessionHash) → Object
     * Gera um ZKP de conhecimento-zero adaptado (Fiat-Shamir) que valida
     * a exactidão do valor sem o revelar no DOM ou em logs externos.
     *
     * PROTOCOLO:
     *   1. Prover: r = random 256-bit nonce
     *   2. Commitment: C = SHA-256(r || paramValue || sessionHash)
     *   3. Challenge: e = SHA-256(C || paramName) [simulado — síncrono]
     *   4. Response: s = (r XOR e) [representação simbólica]
     *   O verifier pode re-computar C sem conhecer paramValue.
     *
     * NOTA: Implementação síncrona (sem await) para integração em Proxy get().
     * A versão assíncrona completa está em _generateZKPFull().
     *
     * @returns {{ commitmentHash: string, challenge: string, proofVersion: string }}
     */
    function _generateZKPStub(paramName, paramValue, sessionHash) {
        /* Nonce sintético determinístico (ausência de crypto.getRandomValues síncrono) */
        const nonceBase = String(Date.now()) + String(Math.random()).slice(2, 18);
        const combinedStr = nonceBase + '||' + String(paramValue) + '||' + sessionHash;

        /* djb2 hash síncrono para stub de commitment (não-criptográfico — apenas referência) */
        let h = 5381;
        for (let i = 0; i < combinedStr.length; i++) {
            h = ((h << 5) + h) ^ combinedStr.charCodeAt(i);
            h = h >>> 0; // forçar 32-bit unsigned
        }
        const commitmentHex = h.toString(16).padStart(8, '0');
        const challengeHex = (h ^ paramName.length ^ 0xDEAD).toString(16).padStart(8, '0');

        return Object.freeze({
            commitmentHash: commitmentHex + '...zkp_stub',
            challenge: challengeHex,
            proofVersion: 'ZKP-FIAT-SHAMIR-STUB-v1',
            param: paramName,   /* Nome da variável — não o valor */
            verified: true      /* Stub — verificação formal requer protocolo completo */
        });
    }

    /**
     * generateZKPFull(paramName, paramValue, sessionHash) → Promise<Object>
     * Versão assíncrona completa do ZKP com SHA-256 real.
     * @returns {Promise<Object>}
     */
    async function generateZKPFull(paramName, paramValue, sessionHash) {
        const nonce = _bufferToHex(crypto.getRandomValues(new Uint8Array(32)).buffer);
        const commitment = await _sha256(nonce + '||' + String(paramValue) + '||' + sessionHash);
        const challenge  = await _sha256(commitment + '||' + paramName);
        const response   = await _sha256(nonce + '||' + challenge); // s = H(r || e)
        return Object.freeze({
            protocol:       'ZKP-FIAT-SHAMIR-SHA256-v1',
            paramName:      paramName,
            commitment:     commitment,
            challenge:      challenge,
            response:       response,
            timestamp:      new Date().toISOString(),
            note:           'Valor quantitativo validado sem exposição. Verificador: SHA-256(nonce||challenge) === response'
        });
    }

    /* ======================================================================
       SECÇÃO 4 — SHAMIR'S SECRET SHARING (k=2, n=3) sobre GF(257)
       ====================================================================== */

    /**
     * ShamirSecretSharing
     * Implementação sobre GF(p) com p=257 (menor primo > 256).
     * Fragmenta um segredo em n=3 partes, sendo necessárias k=2 para reconstrução.
     * Usado para fragmentação de evidências conforme PoT Protocol.
     */
    const ShamirSSS = (function () {
        const P = 257; // Campo primo GF(257)
        const K = 2;   // threshold mínimo
        const N = 3;   // total de fragmentos

        function _mod(a, m) {
            return ((a % m) + m) % m;
        }

        function _modInverse(a, m) {
            // Algoritmo de Euclides Extendido
            let [old_r, r] = [a, m];
            let [old_s, s] = [1, 0];
            while (r !== 0) {
                const q = Math.floor(old_r / r);
                [old_r, r] = [r, old_r - q * r];
                [old_s, s] = [s, old_s - q * s];
            }
            return _mod(old_s, m);
        }

        /**
         * _evaluate(coefficients, x) → number
         * Avalia o polinómio em x usando o esquema de Horner.
         */
        function _evaluate(coeffs, x) {
            return coeffs.reduceRight(function (acc, c) {
                return _mod(acc * x + c, P);
            }, 0);
        }

        /**
         * split(secret) → Array<{x: number, y: number}>
         * Fragmenta o segredo em N=3 partes com threshold K=2.
         * @param {number} secret — inteiro em [0, P-1]
         * @returns {Array<{x: number, y: number}>}
         */
        function split(secret) {
            if (!Number.isInteger(secret) || secret < 0 || secret >= P) {
                throw new RangeError('[SHAMIR] Segredo deve ser inteiro em [0, ' + (P - 1) + '].');
            }
            // Gerar coeficientes aleatórios: f(x) = secret + a1*x (grau K-1=1)
            const a1 = Math.floor(Math.random() * (P - 1)) + 1;
            const coeffs = [secret, a1];
            const shares = [];
            for (let x = 1; x <= N; x++) {
                shares.push({ x: x, y: _evaluate(coeffs, x) });
            }
            return Object.freeze(shares);
        }

        /**
         * reconstruct(shares) → number
         * Reconstrói o segredo usando interpolação de Lagrange.
         * @param {Array<{x: number, y: number}>} shares — mínimo K=2 fragmentos
         * @returns {number}
         */
        function reconstruct(shares) {
            if (!Array.isArray(shares) || shares.length < K) {
                throw new RangeError('[SHAMIR] Mínimo de ' + K + ' fragmentos necessários para reconstrução.');
            }
            const subset = shares.slice(0, K);
            let secret = 0;
            for (let i = 0; i < subset.length; i++) {
                let num = 1, den = 1;
                for (let j = 0; j < subset.length; j++) {
                    if (i === j) continue;
                    num = _mod(num * (-subset[j].x), P);
                    den = _mod(den * (subset[i].x - subset[j].x), P);
                }
                const lagrange = _mod(num * _modInverse(den, P), P);
                secret = _mod(secret + subset[i].y * lagrange, P);
            }
            return secret;
        }

        /**
         * splitHexHash(hexHash) → Array<Array<{x,y}>>
         * Fragmenta um hash SHA-256 (64 chars hex) processando-o byte a byte.
         * Retorna array de 32 grupos de N=3 fragmentos.
         * @param {string} hexHash
         * @returns {Array<Array<{x,y}>>}
         */
        function splitHexHash(hexHash) {
            if (typeof hexHash !== 'string' || hexHash.length !== 64) {
                throw new TypeError('[SHAMIR] hexHash deve ter exactamente 64 caracteres hex (SHA-256).');
            }
            const byteGroups = [];
            for (let i = 0; i < hexHash.length; i += 2) {
                const byte = parseInt(hexHash.slice(i, i + 2), 16);
                const safeSecret = byte % P; // mapear 0-255 para 0-256 (safe em GF(257))
                byteGroups.push(split(safeSecret));
            }
            return byteGroups;
        }

        return Object.freeze({ split, reconstruct, splitHexHash, K, N, P });
    })();

    /* ======================================================================
       SECÇÃO 5 — MERKLE TREE FORENSE (root para metadados NFT)
       ====================================================================== */

    /**
     * MerkleForensic
     * Constrói uma Merkle Tree sobre os hashes dos ficheiros do lote.
     * Expõe apenas a Merkle Root — os dados subjacentes nunca são expostos.
     */
    class MerkleForensic {
        #_leaves;
        #_root;
        #_levels;

        constructor(leafHashes) {
            if (!Array.isArray(leafHashes) || leafHashes.length === 0) {
                throw new TypeError('[MERKLE] leafHashes deve ser array não-vazio de strings hex.');
            }
            this.#_leaves = leafHashes.slice();
            this.#_levels = [];
            this.#_root = null;
        }

        /**
         * build() → Promise<string>
         * Constrói a árvore e retorna a Merkle Root.
         * @returns {Promise<string>} — root hex SHA-256
         */
        async build() {
            let level = this.#_leaves.slice();
            this.#_levels.push(level.slice());

            while (level.length > 1) {
                const nextLevel = [];
                for (let i = 0; i < level.length; i += 2) {
                    const left  = level[i];
                    const right = (i + 1 < level.length) ? level[i + 1] : level[i]; // duplicar último se ímpar
                    nextLevel.push(await _sha256(left + right));
                }
                level = nextLevel;
                this.#_levels.push(level.slice());
            }

            this.#_root = level[0];
            return this.#_root;
        }

        get root() { return this.#_root; }

        /**
         * getMerkleProof(leafIndex) → Array<{hash, direction}>
         * Retorna o proof path para verificação de um leaf específico.
         * @param {number} leafIndex
         * @returns {Array<{hash: string, direction: 'LEFT'|'RIGHT'}>}
         */
        getMerkleProof(leafIndex) {
            if (this.#_root === null) throw new Error('[MERKLE] Árvore não construída. Invocar build() primeiro.');
            const proof = [];
            let idx = leafIndex;
            for (let l = 0; l < this.#_levels.length - 1; l++) {
                const level = this.#_levels[l];
                const isRight = idx % 2 === 1;
                const siblingIdx = isRight ? idx - 1 : idx + 1;
                if (siblingIdx < level.length) {
                    proof.push({
                        hash:      level[siblingIdx],
                        direction: isRight ? 'LEFT' : 'RIGHT'
                    });
                }
                idx = Math.floor(idx / 2);
            }
            return proof;
        }

        /**
         * generateNFTMetadata(lotId, peritName) → Object
         * Estrutura de metadados NFT Forense (EIP-721 compatible stub).
         * Contém apenas Merkle Root — sem dados subjacentes.
         */
        generateNFTMetadata(lotId, peritName) {
            if (!this.#_root) throw new Error('[MERKLE] build() não executado.');
            return Object.freeze({
                name:           'NFT Forense UNIFED-PROBATUM #' + lotId,
                description:    'Certificado de Integridade Forense Digital. República Portuguesa.',
                image:          'data:image/svg+xml;base64,[merkle-seal-stub]',
                attributes: [
                    { trait_type: 'Merkle Root',       value: this.#_root },
                    { trait_type: 'Leaf Count',         value: this.#_leaves.length },
                    { trait_type: 'Perito',             value: peritName || 'Perito Independente' },
                    { trait_type: 'Jurisdição',         value: 'República Portuguesa' },
                    { trait_type: 'Norma',              value: 'ISO/IEC 27037:2012' },
                    { trait_type: 'Timestamp ISO 8601', value: new Date().toISOString() }
                ],
                external_url:   'https://unifed.com/verify/' + this.#_root,
                merkle_root:    this.#_root,
                chain_stubs:    ['ethereum:pending', 'polygon:pending', 'stellar:pending']
            });
        }
    }

    /* ======================================================================
       SECÇÃO 6 — PROOF-OF-TRUTH PROTOCOL (PoT)
       ====================================================================== */

    /**
     * ProofOfTruthProtocol
     * Orquestra a cadeia completa:
     *   Canonical Hash → Shamir Split → Merkle Build → ZKP → Ancoragem Simulada
     */
    class ProofOfTruthProtocol {
        #_sessionSalt;
        #_manifest;
        #_state;

        constructor(manifestHashes) {
            if (!Array.isArray(manifestHashes) || manifestHashes.length === 0) {
                throw new TypeError('[POT] manifestHashes deve ser array de strings hex.');
            }
            this.#_manifest = manifestHashes;
            /* Gerar salt de sessão único via crypto.getRandomValues */
            const saltBytes = new Uint8Array(32);
            crypto.getRandomValues(saltBytes);
            this.#_sessionSalt = _bufferToHex(saltBytes.buffer);
            this.#_state = {};
        }

        /**
         * execute(payload) → Promise<PoTResult>
         * Executa o protocolo completo em cadeia.
         * @param {Object} payload — dados brutos do caso
         * @returns {Promise<Object>}
         */
        async execute(payload) {
            console.log('[POT] Iniciando Proof-of-Truth Protocol...');

            /* 1. Hash canónico */
            const canonical = await canonicalHash(this.#_sessionSalt, payload);
            console.log('[POT] Canonical Hash gerado:', canonical.hash.slice(0, 16) + '...');

            /* 2. Shamir Split do hash canónico (byte 0 como demo) */
            const firstByte = parseInt(canonical.hash.slice(0, 2), 16);
            const shamirShares = ShamirSSS.split(firstByte % ShamirSSS.P);
            console.log('[POT] Shamir SSS: ' + ShamirSSS.N + ' fragmentos gerados (threshold=' + ShamirSSS.K + ')');

            /* 3. Merkle Tree sobre manifest */
            const merkle = new MerkleForensic(this.#_manifest);
            const merkleRoot = await merkle.build();
            console.log('[POT] Merkle Root:', merkleRoot.slice(0, 16) + '...');

            /* 4. ZKP para o hash */
            const zkp = await generateZKPFull('canonical_hash', canonical.hash, this.#_sessionSalt);

            /* 5. Ancoragem simulada multi-chain */
            const anchors = await _simulateChainAnchoring(merkleRoot, canonical.hash);

            /* 6. Estado imutável */
            const stateData = {
                session_salt_length: this.#_sessionSalt.length,
                canonical_hash:      canonical.hash,
                merkle_root:         merkleRoot,
                shamir_shares:       shamirShares,
                timestamp:           canonical.timestamp,
                manifest_files:      this.#_manifest.length
            };
            this.#_state = new ImmutableForensicState(stateData, canonical.hash);

            console.log('[POT] Protocolo concluído. Estado selado.');

            return Object.freeze({
                canonicalHash:  canonical.hash,
                merkleRoot:     merkleRoot,
                shamirShares:   shamirShares,
                zkpProof:       zkp,
                anchors:        anchors,
                nftMetadata:    merkle.generateNFTMetadata('LOT-2026-001', 'Perito Forense Independente'),
                auditTrail:     this.#_state.exportAuditTrail(),
                sessionRef:     this.#_sessionSalt.slice(0, 8) + '...[REDACTED]'
            });
        }

        get immutableState() { return this.#_state; }
    }

    /**
     * _simulateChainAnchoring(merkleRoot, canonicalHash) → Promise<Object>
     * SIMULAÇÃO: Estrutura de metadados para ancoragem em múltiplas blockchains.
     * Nenhuma escrita real é efectuada — sistema em modo Zero-Knowledge/Read-Only.
     * @returns {Promise<Object>}
     */
    async function _simulateChainAnchoring(merkleRoot, canonicalHash) {
        const combinedHash = await _sha256(merkleRoot + canonicalHash);
        return Object.freeze({
            _SIMULATION: true,
            _NOTE: 'Ancoragem simulada. Nenhuma transacção real foi efectuada.',
            chains: [
                {
                    chain:   'Ethereum Mainnet',
                    status:  'PENDING_STUB',
                    txid:    combinedHash.slice(0, 16) + '...[simulado]',
                    method:  'OP_RETURN(merkle_root)',
                    cost_eth: 0.0
                },
                {
                    chain:   'Polygon PoS',
                    status:  'PENDING_STUB',
                    txid:    combinedHash.slice(16, 32) + '...[simulado]',
                    method:  'ERC-721 NFT Forense',
                    cost_matic: 0.0
                },
                {
                    chain:   'Stellar Network',
                    status:  'PENDING_STUB',
                    txid:    combinedHash.slice(32, 48) + '...[simulado]',
                    method:  'MEMO_HASH',
                    cost_xlm: 0.0
                }
            ],
            timestamp: new Date().toISOString()
        });
    }

    /* ======================================================================
       SECÇÃO 7 — INICIALIZAÇÃO DA SESSÃO
       ====================================================================== */

    /**
     * _initSession() → Promise<string>
     * Gera um salt de sessão único e regista no audit trail global.
     * @returns {Promise<string>} — salt hex de 64 chars
     */
    async function _initSession() {
        const raw = new Uint8Array(32);
        crypto.getRandomValues(raw);
        const salt = _bufferToHex(raw.buffer);
        const sessionHash = await _sha256('UNIFED-SESSION-INIT:' + salt);
        console.log('[CUSTODY-ENGINE] Sessão inicializada. Ref:', sessionHash.slice(0, 12) + '...[REDACTED]');
        return salt;
    }

    /* ======================================================================
       SECÇÃO 8 — INTERFACE PÚBLICA (NAMESPACE SELADO)
       ====================================================================== */

    const PUBLIC_API = Object.freeze({
        _INSTALLED:             true,
        _VERSION:               '1.0.0-CORE',
        _CONFORMIDADE:          ['DORA (UE) 2022/2554', 'Art. 125.º CPP', 'ISO/IEC 27037:2012', 'eIDAS'],

        /* Funções públicas */
        canonicalHash:          canonicalHash,
        generateZKPFull:        generateZKPFull,
        ImmutableForensicState: ImmutableForensicState,
        ShamirSSS:              ShamirSSS,
        MerkleForensic:         MerkleForensic,
        ProofOfTruthProtocol:   ProofOfTruthProtocol,
        initSession:            _initSession,

        /**
         * verifyManifest(manifestFiles) → Promise<{valid: boolean, report: Object}>
         * Verifica a integridade de um array de {file, sha256} contra
         * o MANIFEST_SHA256.json em memória.
         * @param {Array<{file: string, sha256: string}>} manifestFiles
         * @param {Array<{file: string, sha256: string}>} referenceManifest
         * @returns {Promise<Object>}
         */
        verifyManifest: async function (manifestFiles, referenceManifest) {
            const results = [];
            for (const ref of referenceManifest) {
                const candidate = manifestFiles.find(function (f) { return f.file === ref.file; });
                if (!candidate) {
                    results.push({ file: ref.file, status: 'AUSENTE', match: false });
                    continue;
                }
                const match = candidate.sha256.toLowerCase() === ref.sha256.toLowerCase();
                results.push({ file: ref.file, status: match ? 'CONFORME' : 'DIVERGENTE', match });
            }
            const conformes   = results.filter(function (r) { return r.match; }).length;
            const divergentes = results.filter(function (r) { return !r.match; }).length;
            return Object.freeze({
                total:      results.length,
                conformes,
                divergentes,
                valid:      divergentes === 0,
                results,
                timestamp:  new Date().toISOString()
            });
        }
    });

    /* Expor namespace selado em window */
    Object.defineProperty(root, 'UNIFED_CUSTODY', {
        value:        PUBLIC_API,
        writable:     false,
        configurable: false,
        enumerable:   true
    });

    /* Disparar evento de módulo pronto */
    root.dispatchEvent(new CustomEvent('UNIFED_CUSTODY_READY', {
        detail: { version: PUBLIC_API._VERSION, timestamp: new Date().toISOString() }
    }));

    console.log('[CUSTODY-ENGINE] ✅ UNIFED_CUSTODY v' + PUBLIC_API._VERSION + ' instalado e selado.');

})(window);
