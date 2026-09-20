/**
 * NFC TAG PET — CENTRAL DE PRODUÇÃO
 * Gerador de QR Codes SVG & Gestor de Manifests
 */

(function () {
  'use strict';

  // Estado da Aplicação
  const state = {
    records: [],
    viewMode: 'grid', // 'grid' ou 'table'
    searchQuery: '',
    statusFilter: 'todos',
    batchDate: new Date().toISOString().slice(0, 10),
    previewRecord: null
  };

  // Elementos do DOM
  const dom = {
    // Abas de Modo
    tabDirect: document.getElementById('tabDirect'),
    tabDrop: document.getElementById('tabDrop'),
    tabPaste: document.getElementById('tabPaste'),
    btnLoadExample: document.getElementById('btnLoadExample'),

    // Zonas
    directZone: document.getElementById('directZone'),
    dropZone: document.getElementById('dropZone'),
    pasteZone: document.getElementById('pasteZone'),

    // Formulário Direto
    directBaseUrl: document.getElementById('directBaseUrl'),
    directQty: document.getElementById('directQty'),
    btnGenerateDirect: document.getElementById('btnGenerateDirect'),
    prefixConfigRow: document.getElementById('prefixConfigRow'),
    idPrefix: document.getElementById('idPrefix'),
    startNum: document.getElementById('startNum'),

    // Formulário CSV / Paste
    fileInput: document.getElementById('fileInput'),
    csvTextarea: document.getElementById('csvTextarea'),
    btnProcessPaste: document.getElementById('btnProcessPaste'),

    // Feedback
    fileFeedback: document.getElementById('fileFeedback'),
    fileNameDisplay: document.getElementById('fileNameDisplay'),
    fileCountDisplay: document.getElementById('fileCountDisplay'),
    btnResetFile: document.getElementById('btnResetFile'),

    // Produção
    productionSection: document.getElementById('productionSection'),
    batchDateLabel: document.getElementById('batchDateLabel'),
    btnAddSingleTag: document.getElementById('btnAddSingleTag'),
    btnDownloadLoteCsv: document.getElementById('btnDownloadLoteCsv'),
    btnDownloadZip: document.getElementById('btnDownloadZip'),
    btnDownloadManifest: document.getElementById('btnDownloadManifest'),
    
    // Métricas
    metricTotal: document.getElementById('metricTotal'),
    metricPendente: document.getElementById('metricPendente'),
    metricImpresso: document.getElementById('metricImpresso'),
    metricEmbalado: document.getElementById('metricEmbalado'),
    metricEnviado: document.getElementById('metricEnviado'),
    metricDescartado: document.getElementById('metricDescartado'),

    // Toolbar
    searchInput: document.getElementById('searchInput'),
    filterStatus: document.getElementById('filterStatus'),
    btnViewGrid: document.getElementById('btnViewGrid'),
    btnViewTable: document.getElementById('btnViewTable'),
    tagsContainer: document.getElementById('tagsContainer'),

    // Modais
    btnOpenGuide: document.getElementById('btnOpenGuide'),
    modalGuide: document.getElementById('modalGuide'),
    btnCloseGuide: document.getElementById('btnCloseGuide'),
    btnOkGuide: document.getElementById('btnOkGuide'),

    btnOpenDeploy: document.getElementById('btnOpenDeploy'),
    modalDeploy: document.getElementById('modalDeploy'),
    btnCloseDeploy: document.getElementById('btnCloseDeploy'),
    btnOkDeploy: document.getElementById('btnOkDeploy'),

    modalPreview: document.getElementById('modalPreview'),
    btnClosePreview: document.getElementById('btnClosePreview'),
    btnClosePreviewBtn: document.getElementById('btnClosePreviewBtn'),
    previewTagId: document.getElementById('previewTagId'),
    previewSvgContainer: document.getElementById('previewSvgContainer'),
    previewDetailId: document.getElementById('previewDetailId'),
    previewDetailUrl: document.getElementById('previewDetailUrl'),
    btnDownloadCurrentSvg: document.getElementById('btnDownloadCurrentSvg'),

    // Modal Tag Avulsa
    modalAddTag: document.getElementById('modalAddTag'),
    btnCloseAddTag: document.getElementById('btnCloseAddTag'),
    btnCancelAddTag: document.getElementById('btnCancelAddTag'),
    btnConfirmAddTag: document.getElementById('btnConfirmAddTag'),
    singleTagId: document.getElementById('singleTagId'),
    singleTagUrl: document.getElementById('singleTagUrl'),
    btnGenRandomSingleId: document.getElementById('btnGenRandomSingleId')
  };

  // Gerador de ID aleatório de 6 caracteres (padrão oficial do Worker)
  function generateRandomId(length = 6) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = new Uint8Array(length);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
  }

  const OFFICIAL_DOMAIN = 'https://nfc-tag-pet.vercel.app';

  // Inicialização
  function init() {
    // Verificar se estamos acessando a rota pública do pet (/p/:id)
    const petMatch = window.location.pathname.match(/^\/p\/([^/?#]+)/i);
    if (petMatch && petMatch[1]) {
      initPetPublicFlow(petMatch[1].trim());
      return;
    }

    // Restaurar URL Base salva se houver (substituindo placeholders antigos)
    let savedBaseUrl = localStorage.getItem('pet_nfc_base_url');
    if (!savedBaseUrl || savedBaseUrl.includes('pet-nfc.workers.dev') || savedBaseUrl.includes('nfc.pet')) {
      savedBaseUrl = OFFICIAL_DOMAIN;
      localStorage.setItem('pet_nfc_base_url', OFFICIAL_DOMAIN);
    }

    if (dom.directBaseUrl) {
      if (window.location.origin && !window.location.origin.includes('localhost')) {
        dom.directBaseUrl.value = window.location.origin;
      } else {
        dom.directBaseUrl.value = savedBaseUrl || OFFICIAL_DOMAIN;
      }
    }

    setupEventListeners();
    dom.batchDateLabel.textContent = `Data do lote: ${state.batchDate}`;
  }

  // Configuração dos Eventos
  function setupEventListeners() {
    // Alternar abas
    if (dom.tabDirect) dom.tabDirect.addEventListener('click', () => switchTab('direct'));
    if (dom.tabDrop) dom.tabDrop.addEventListener('click', () => switchTab('drop'));
    if (dom.tabPaste) dom.tabPaste.addEventListener('click', () => switchTab('paste'));
    if (dom.btnLoadExample) dom.btnLoadExample.addEventListener('click', loadExampleData);

    // Presets de quantidade no gerador direto
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (dom.directQty) dom.directQty.value = btn.dataset.qty;
      });
    });

    if (dom.directQty) {
      dom.directQty.addEventListener('input', () => {
        document.querySelectorAll('.btn-preset').forEach(b => {
          b.classList.toggle('active', b.dataset.qty === dom.directQty.value);
        });
      });
    }

    // Alternar formato de ID (aleatório vs sequencial)
    document.querySelectorAll('input[name="idFormat"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (dom.prefixConfigRow) {
          dom.prefixConfigRow.classList.toggle('hidden', radio.value !== 'sequential');
        }
      });
    });

    // Botão de Gerar Lote Direto
    if (dom.btnGenerateDirect) {
      dom.btnGenerateDirect.addEventListener('click', generateDirectBatch);
    }

    // Drag & Drop
    if (dom.dropZone) {
      dom.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.dropZone.classList.add('dragover');
      });

      dom.dropZone.addEventListener('dragleave', () => {
        dom.dropZone.classList.remove('dragover');
      });

      dom.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.dropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileSelect(e.dataTransfer.files[0]);
        }
      });

      dom.dropZone.addEventListener('click', (e) => {
        if (e.target !== dom.fileInput) {
          dom.fileInput.click();
        }
      });
    }

    if (dom.fileInput) {
      dom.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleFileSelect(e.target.files[0]);
        }
      });
    }

    // Colar texto
    if (dom.btnProcessPaste) {
      dom.btnProcessPaste.addEventListener('click', () => {
        const text = dom.csvTextarea.value.trim();
        if (!text) {
          alert('Por favor, cole o conteúdo do CSV com cabeçalho id,url');
          return;
        }
        processCsvContent(text, 'texto-colado.csv');
      });
    }

    // Resetar / Trocar arquivo
    if (dom.btnResetFile) dom.btnResetFile.addEventListener('click', resetData);

    // Filtros e busca
    if (dom.searchInput) {
      dom.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderTags();
      });
    }

    if (dom.filterStatus) {
      dom.filterStatus.addEventListener('change', (e) => {
        state.statusFilter = e.target.value;
        renderTags();
      });
    }

    // Modos de visualização (Grid vs Tabela)
    if (dom.btnViewGrid) dom.btnViewGrid.addEventListener('click', () => setViewMode('grid'));
    if (dom.btnViewTable) dom.btnViewTable.addEventListener('click', () => setViewMode('table'));

    // Downloads e Ações
    if (dom.btnDownloadZip) dom.btnDownloadZip.addEventListener('click', downloadBatchZip);
    if (dom.btnDownloadManifest) dom.btnDownloadManifest.addEventListener('click', downloadManifestCsv);
    if (dom.btnDownloadLoteCsv) dom.btnDownloadLoteCsv.addEventListener('click', downloadLoteTagsCsv);

    // Modal de Tag Avulsa
    if (dom.btnAddSingleTag) dom.btnAddSingleTag.addEventListener('click', openAddSingleTagModal);
    if (dom.btnCloseAddTag) dom.btnCloseAddTag.addEventListener('click', () => closeModal(dom.modalAddTag));
    if (dom.btnCancelAddTag) dom.btnCancelAddTag.addEventListener('click', () => closeModal(dom.modalAddTag));
    if (dom.btnConfirmAddTag) dom.btnConfirmAddTag.addEventListener('click', confirmAddSingleTag);
    if (dom.btnGenRandomSingleId) dom.btnGenRandomSingleId.addEventListener('click', generateSingleRandomId);

    if (dom.singleTagId) {
      dom.singleTagId.addEventListener('input', (e) => {
        const id = e.target.value.trim();
        const baseUrl = getBaseUrl();
        if (dom.singleTagUrl) {
          dom.singleTagUrl.value = id ? `${baseUrl}/p/${id}` : '';
        }
      });
    }

    // Modais gerais
    if (dom.btnOpenGuide) dom.btnOpenGuide.addEventListener('click', () => openModal(dom.modalGuide));
    if (dom.btnCloseGuide) dom.btnCloseGuide.addEventListener('click', () => closeModal(dom.modalGuide));
    if (dom.btnOkGuide) dom.btnOkGuide.addEventListener('click', () => closeModal(dom.modalGuide));

    if (dom.btnOpenDeploy) dom.btnOpenDeploy.addEventListener('click', () => openModal(dom.modalDeploy));
    if (dom.btnCloseDeploy) dom.btnCloseDeploy.addEventListener('click', () => closeModal(dom.modalDeploy));
    if (dom.btnOkDeploy) dom.btnOkDeploy.addEventListener('click', () => closeModal(dom.modalDeploy));

    if (dom.btnClosePreview) dom.btnClosePreview.addEventListener('click', () => closeModal(dom.modalPreview));
    if (dom.btnClosePreviewBtn) dom.btnClosePreviewBtn.addEventListener('click', () => closeModal(dom.modalPreview));
    if (dom.btnDownloadCurrentSvg) {
      dom.btnDownloadCurrentSvg.addEventListener('click', () => {
        if (state.previewRecord) {
          downloadSingleSvg(state.previewRecord);
        }
      });
    }

    // Fechar modais ao clicar no overlay ou com ESC
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal(dom.modalGuide);
        closeModal(dom.modalDeploy);
        closeModal(dom.modalPreview);
        closeModal(dom.modalAddTag);
      }
    });
  }

  // Alternar Abas (Direto, Subir CSV, Colar Texto)
  function switchTab(mode) {
    [dom.tabDirect, dom.tabDrop, dom.tabPaste].forEach(t => t && t.classList.remove('active'));
    [dom.directZone, dom.dropZone, dom.pasteZone].forEach(z => z && z.classList.add('hidden'));

    if (mode === 'direct') {
      if (dom.tabDirect) dom.tabDirect.classList.add('active');
      if (dom.directZone) dom.directZone.classList.remove('hidden');
    } else if (mode === 'drop') {
      if (dom.tabDrop) dom.tabDrop.classList.add('active');
      if (dom.dropZone) dom.dropZone.classList.remove('hidden');
    } else if (mode === 'paste') {
      if (dom.tabPaste) dom.tabPaste.classList.add('active');
      if (dom.pasteZone) dom.pasteZone.classList.remove('hidden');
    }
  }

  // Retorna a URL base limpa
  function getBaseUrl() {
    let url = dom.directBaseUrl ? dom.directBaseUrl.value.trim() : '';
    if (!url || url.includes('pet-nfc.workers.dev') || url.includes('nfc.pet')) {
      if (window.location.origin && !window.location.origin.includes('localhost')) {
        url = window.location.origin;
      } else {
        url = OFFICIAL_DOMAIN;
      }
    }
    return url.replace(/\/+$/, '');
  }

  // Gerar Lote Direto (Sem CSV)
  function generateDirectBatch() {
    const baseUrl = getBaseUrl();
    if (dom.directBaseUrl) dom.directBaseUrl.value = baseUrl;
    localStorage.setItem('pet_nfc_base_url', baseUrl);

    const qty = Math.min(500, Math.max(1, parseInt(dom.directQty.value, 10) || 20));
    const formatRadio = document.querySelector('input[name="idFormat"]:checked');
    const format = formatRadio ? formatRadio.value : 'random';

    const records = [];
    const existingIds = new Set();

    let currentNum = parseInt(dom.startNum ? dom.startNum.value : '1', 10) || 1;
    const prefix = dom.idPrefix ? dom.idPrefix.value.trim() : 'PET-';

    for (let i = 0; i < qty; i++) {
      let id;
      if (format === 'random') {
        do {
          id = generateRandomId(6);
        } while (existingIds.has(id));
      } else {
        id = `${prefix}${String(currentNum + i).padStart(3, '0')}`;
      }
      existingIds.add(id);

      const tagUrl = `${baseUrl}/p/${id}`;
      records.push({
        id: id,
        url: tagUrl,
        arquivoQr: `qrs/${id}.svg`,
        status: 'pendente',
        svgString: null
      });
    }

    records.sort((a, b) => a.id.localeCompare(b.id));

    // Gerar SVGs
    generateSvgsForRecords(records);
    state.records = records;

    // Atualizar UI
    dom.fileNameDisplay.textContent = `Lote de ${records.length} tags gerado direto`;
    dom.fileCountDisplay.textContent = `${records.length} tags`;
    dom.fileFeedback.classList.remove('hidden');
    dom.productionSection.classList.remove('hidden');

    updateMetrics();
    renderTags();

    // Rolar suavemente para o lote de produção ativo
    dom.productionSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Abrir Modal de Tag Avulsa
  function openAddSingleTagModal() {
    const randomId = generateRandomId(6);
    const baseUrl = getBaseUrl();
    if (dom.singleTagId) dom.singleTagId.value = randomId;
    if (dom.singleTagUrl) dom.singleTagUrl.value = `${baseUrl}/p/${randomId}`;
    openModal(dom.modalAddTag);
  }

  function generateSingleRandomId() {
    const randomId = generateRandomId(6);
    const baseUrl = getBaseUrl();
    if (dom.singleTagId) dom.singleTagId.value = randomId;
    if (dom.singleTagUrl) dom.singleTagUrl.value = `${baseUrl}/p/${randomId}`;
  }

  function confirmAddSingleTag() {
    const id = dom.singleTagId.value.trim();
    const url = dom.singleTagUrl.value.trim();

    if (!id || !url) {
      alert('Por favor, preencha o ID e a URL da tag.');
      return;
    }

    if (state.records.some(r => r.id.toLowerCase() === id.toLowerCase())) {
      alert(`A tag com o ID "${id}" já existe neste lote.`);
      return;
    }

    const newRecord = {
      id: id,
      url: url,
      arquivoQr: `qrs/${id}.svg`,
      status: 'pendente',
      svgString: null
    };

    generateSvgsForRecords([newRecord]);
    state.records.push(newRecord);
    state.records.sort((a, b) => a.id.localeCompare(b.id));

    dom.fileCountDisplay.textContent = `${state.records.length} tags`;
    updateMetrics();
    renderTags();
    closeModal(dom.modalAddTag);
  }

  // Manipular arquivo CSV selecionado
  function handleFileSelect(file) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      alert('Por favor, selecione um arquivo .csv válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      processCsvContent(e.target.result, file.name);
    };
    reader.readAsText(file);
  }

  // Dados de Exemplo
  function loadExampleData() {
    const baseUrl = getBaseUrl();
    const sampleCsv = `id,url
PET-001,${baseUrl}/p/PET-001
PET-002,${baseUrl}/p/PET-002
PET-003,${baseUrl}/p/PET-003
PET-004,${baseUrl}/p/PET-004
PET-005,${baseUrl}/p/PET-005`;

    processCsvContent(sampleCsv, 'exemplo-lote-tags.csv');
  }

  // Processar conteúdo do CSV
  function processCsvContent(csvString, fileName) {
    const rawLines = csvString.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (rawLines.length < 2) {
      alert('O CSV precisa ter um cabeçalho e pelo menos 1 linha de tag.');
      return;
    }

    const headerLine = rawLines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';
    const headerCols = headerLine.split(delimiter).map(c => c.trim().toLowerCase().replace(/"/g, ''));

    const idxId = headerCols.indexOf('id');
    const idxUrl = headerCols.indexOf('url');
    const idxStatus = headerCols.indexOf('status');

    if (idxId === -1 || idxUrl === -1) {
      alert('Cabeçalho inválido. O arquivo CSV deve conter colunas "id" e "url".');
      return;
    }

    const records = [];
    for (let i = 1; i < rawLines.length; i++) {
      const parts = rawLines[i].split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''));
      const id = parts[idxId] ? parts[idxId].trim() : '';
      const url = parts[idxUrl] ? parts[idxUrl].trim() : '';
      let status = 'pendente';
      if (idxStatus !== -1 && parts[idxStatus]) {
        const parsedStatus = parts[idxStatus].trim().toLowerCase();
        if (['pendente', 'impresso', 'embalado', 'enviado', 'descartado'].includes(parsedStatus)) {
          status = parsedStatus;
        }
      }

      if (id && url) {
        records.push({
          id: id,
          url: url,
          arquivoQr: `qrs/${id}.svg`,
          status: status,
          svgString: null
        });
      }
    }

    if (records.length === 0) {
      alert('Nenhum registro válido encontrado no CSV.');
      return;
    }

    records.sort((a, b) => a.id.localeCompare(b.id));
    generateSvgsForRecords(records);
    state.records = records;

    dom.fileNameDisplay.textContent = fileName;
    dom.fileCountDisplay.textContent = `${records.length} tags`;
    dom.fileFeedback.classList.remove('hidden');
    dom.productionSection.classList.remove('hidden');

    updateMetrics();
    renderTags();
  }

  // Geração dos SVGs no cliente
  function generateSvgsForRecords(records) {
    const qrEngine = window.QRCodeSvg || window.QRCode;

    if (!qrEngine) {
      console.error('Biblioteca QRCode não encontrada.');
      alert('Erro: Biblioteca de geração de QR Code não carregada.');
      return;
    }

    records.forEach(record => {
      try {
        const svg = qrEngine.toString(record.url, {
          type: 'svg',
          margin: 1,
          errorCorrectionLevel: 'M'
        });
        record.svgString = svg;
      } catch (err) {
        console.error(`Erro gerando QR para ${record.id}:`, err);
      }
    });
  }

  // Atualizar contadores de métricas
  function updateMetrics() {
    const total = state.records.length;
    let pendentes = 0;
    let impressos = 0;
    let embalados = 0;
    let enviados = 0;
    let descartados = 0;

    state.records.forEach(r => {
      switch (r.status) {
        case 'pendente': pendentes++; break;
        case 'impresso': impressos++; break;
        case 'embalado': embalados++; break;
        case 'enviado': enviados++; break;
        case 'descartado': descartados++; break;
      }
    });

    dom.metricTotal.textContent = total;
    dom.metricPendente.textContent = pendentes;
    dom.metricImpresso.textContent = impressos;
    dom.metricEmbalado.textContent = embalados;
    dom.metricEnviado.textContent = enviados;
    dom.metricDescartado.textContent = descartados;
  }

  // Filtragem dos registros
  function getFilteredRecords() {
    return state.records.filter(r => {
      const matchSearch = !state.searchQuery ||
        r.id.toLowerCase().includes(state.searchQuery) ||
        r.url.toLowerCase().includes(state.searchQuery);

      const matchStatus = state.statusFilter === 'todos' || r.status === state.statusFilter;

      return matchSearch && matchStatus;
    });
  }

  // Renderizar a lista / grid de tags
  function renderTags() {
    const filtered = getFilteredRecords();
    dom.tagsContainer.innerHTML = '';

    if (filtered.length === 0) {
      dom.tagsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-dim);">
          <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">Nenhuma tag encontrada para o filtro atual.</p>
          <span style="font-size: 0.85rem;">Tente ajustar a busca ou o status selecionado.</span>
        </div>
      `;
      return;
    }

    if (state.viewMode === 'grid') {
      dom.tagsContainer.className = 'tags-grid-view';
      filtered.forEach(record => {
        const card = createTagCard(record);
        dom.tagsContainer.appendChild(card);
      });
    } else {
      dom.tagsContainer.className = 'tags-table-wrapper';
      const table = createTagsTable(filtered);
      dom.tagsContainer.appendChild(table);
    }
  }

  // Criar Card Individual (Modo Grid)
  function createTagCard(record) {
    const card = document.createElement('div');
    card.className = `tag-card status-${record.status}`;

    card.innerHTML = `
      <div class="tag-card-header">
        <span class="tag-id-badge">${escapeHtml(record.id)}</span>
        <button class="icon-btn btn-preview-zoom" title="Visualizar detalhes e ampliar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        </button>
      </div>

      <div class="qr-preview-box" title="Clique para ampliar o QR Code">
        ${record.svgString || '<span>Carregando QR...</span>'}
      </div>

      <div class="tag-info">
        <a href="${escapeHtml(record.url)}" target="_blank" rel="noopener" class="tag-url-link" title="${escapeHtml(record.url)}">
          ${escapeHtml(record.url)}
        </a>
      </div>

      <div class="tag-actions">
        <select class="status-pill-select ${record.status}" title="Mudar status de produção">
          <option value="pendente" ${record.status === 'pendente' ? 'selected' : ''}>Pendente</option>
          <option value="impresso" ${record.status === 'impresso' ? 'selected' : ''}>Impresso</option>
          <option value="embalado" ${record.status === 'embalado' ? 'selected' : ''}>Embalado</option>
          <option value="enviado" ${record.status === 'enviado' ? 'selected' : ''}>Enviado</option>
          <option value="descartado" ${record.status === 'descartado' ? 'selected' : ''}>Descartado</option>
        </select>

        <button class="btn-download-svg" title="Baixar ${record.id}.svg individualmente">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          .svg
        </button>
      </div>
    `;

    const select = card.querySelector('.status-pill-select');
    select.addEventListener('change', (e) => {
      const newStatus = e.target.value;
      record.status = newStatus;
      select.className = `status-pill-select ${newStatus}`;
      card.className = `tag-card status-${newStatus}`;
      updateMetrics();
    });

    const qrBox = card.querySelector('.qr-preview-box');
    qrBox.addEventListener('click', () => openPreviewModal(record));

    const btnZoom = card.querySelector('.btn-preview-zoom');
    btnZoom.addEventListener('click', () => openPreviewModal(record));

    const btnDownload = card.querySelector('.btn-download-svg');
    btnDownload.addEventListener('click', () => downloadSingleSvg(record));

    return card;
  }

  // Criar Tabela (Modo Tabela)
  function createTagsTable(filtered) {
    const table = document.createElement('table');
    table.className = 'tags-table-view';

    table.innerHTML = `
      <thead>
        <tr>
          <th style="width: 70px;">QR</th>
          <th>ID da Tag</th>
          <th>URL de Destino</th>
          <th>Arquivo para Fatiador</th>
          <th>Status</th>
          <th style="text-align: right;">Ação</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;

    const tbody = table.querySelector('tbody');

    filtered.forEach(record => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="table-mini-qr" title="Clique para ampliar">
            ${record.svgString || ''}
          </div>
        </td>
        <td>
          <strong style="font-family: var(--font-mono); color: #fff;">${escapeHtml(record.id)}</strong>
        </td>
        <td>
          <a href="${escapeHtml(record.url)}" target="_blank" rel="noopener" class="tag-url-link" style="max-width: 250px; display: inline-block;">
            ${escapeHtml(record.url)}
          </a>
        </td>
        <td>
          <code style="font-size: 0.8rem; color: var(--accent-cyan);">${escapeHtml(record.arquivoQr)}</code>
        </td>
        <td>
          <select class="status-pill-select ${record.status}">
            <option value="pendente" ${record.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="impresso" ${record.status === 'impresso' ? 'selected' : ''}>Impresso</option>
            <option value="embalado" ${record.status === 'embalado' ? 'selected' : ''}>Embalado</option>
            <option value="enviado" ${record.status === 'enviado' ? 'selected' : ''}>Enviado</option>
            <option value="descartado" ${record.status === 'descartado' ? 'selected' : ''}>Descartado</option>
          </select>
        </td>
        <td style="text-align: right;">
          <button class="btn-download-svg btn-table-dl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            SVG
          </button>
        </td>
      `;

      const select = tr.querySelector('.status-pill-select');
      select.addEventListener('change', (e) => {
        const newStatus = e.target.value;
        record.status = newStatus;
        select.className = `status-pill-select ${newStatus}`;
        updateMetrics();
      });

      const qrBox = tr.querySelector('.table-mini-qr');
      qrBox.addEventListener('click', () => openPreviewModal(record));

      const btnDl = tr.querySelector('.btn-table-dl');
      btnDl.addEventListener('click', () => downloadSingleSvg(record));

      tbody.appendChild(tr);
    });

    return table;
  }

  // Alternar Modo de Visualização
  function setViewMode(mode) {
    state.viewMode = mode;
    if (mode === 'grid') {
      dom.btnViewGrid.classList.add('active');
      dom.btnViewTable.classList.remove('active');
    } else {
      dom.btnViewGrid.classList.remove('active');
      dom.btnViewTable.classList.add('active');
    }
    renderTags();
  }

  // Abrir Modal de Preview com Zoom
  function openPreviewModal(record) {
    state.previewRecord = record;
    dom.previewTagId.textContent = record.id;
    dom.previewDetailId.textContent = record.id;
    dom.previewDetailUrl.textContent = record.url;
    dom.previewDetailUrl.href = record.url;
    dom.previewSvgContainer.innerHTML = record.svgString || '';
    openModal(dom.modalPreview);
  }

  // Download individual do SVG
  function downloadSingleSvg(record) {
    if (!record.svgString) return;

    const blob = new Blob([record.svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${record.id}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Download do lote-tags.csv
  function downloadLoteTagsCsv() {
    if (state.records.length === 0) return;

    const header = 'id,url\n';
    const lines = state.records.map(r => `${r.id},${r.url}`).join('\n');

    const csvContent = header + lines;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lote-tags-${state.batchDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Download do Manifest CSV
  function downloadManifestCsv() {
    if (state.records.length === 0) return;

    const header = 'id,url,arquivo_qr,status\n';
    const lines = state.records
      .map(r => `${r.id},${r.url},${r.arquivoQr},${r.status}`)
      .join('\n');

    const csvContent = header + lines;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manifest-${state.batchDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Download do Pacote Completo (.ZIP)
  async function downloadBatchZip() {
    if (state.records.length === 0) {
      alert('Nenhuma tag carregada para gerar o pacote.');
      return;
    }

    if (typeof JSZip === 'undefined') {
      alert('Erro: Biblioteca JSZip não disponível no navegador.');
      return;
    }

    const btn = dom.btnDownloadZip;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"/>
      </svg>
      Compactando ${state.records.length} arquivos...
    `;

    try {
      const zip = new JSZip();

      const folderName = `producao/${state.batchDate}`;
      const qrsFolder = zip.folder(`${folderName}/qrs`);

      state.records.forEach(r => {
        if (r.svgString) {
          qrsFolder.file(`${r.id}.svg`, r.svgString);
        }
      });

      const headerManifest = 'id,url,arquivo_qr,status\n';
      const linesManifest = state.records
        .map(r => `${r.id},${r.url},${r.arquivoQr},${r.status}`)
        .join('\n');
      zip.file(`${folderName}/manifest.csv`, headerManifest + linesManifest);

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `producao-tags-${state.batchDate}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);

    } catch (err) {
      console.error('Erro gerando pacote ZIP:', err);
      alert('Houve um erro ao gerar o arquivo compactado: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  // Resetar dados para carregar outro lote
  function resetData() {
    state.records = [];
    dom.fileFeedback.classList.add('hidden');
    dom.productionSection.classList.add('hidden');
    if (dom.fileInput) dom.fileInput.value = '';
    if (dom.csvTextarea) dom.csvTextarea.value = '';
    if (dom.searchInput) dom.searchInput.value = '';
    if (dom.filterStatus) dom.filterStatus.value = 'todos';
  }

  // Utilitários de Modal
  function openModal(modalEl) {
    if (modalEl) modalEl.classList.remove('hidden');
  }

  function closeModal(modalEl) {
    if (modalEl) modalEl.classList.add('hidden');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Fluxo da Página do Pet (/p/:id)
  function initPetPublicFlow(petId) {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.classList.add('hidden');

    const petContainer = document.getElementById('petPublicContainer');
    if (!petContainer) return;
    petContainer.classList.remove('hidden');

    const cardCadastro = document.getElementById('cardCadastroPet');
    const cardEncontrei = document.getElementById('cardEncontreiPet');

    // Verificar se a tag já foi cadastrada no localStorage
    const savedDataStr = localStorage.getItem(`pet_tag_${petId.toLowerCase()}`);
    let petData = null;
    if (savedDataStr) {
      try { petData = JSON.parse(savedDataStr); } catch (e) {}
    }

    if (petData && petData.ativado) {
      // Pet já cadastrado: mostrar tela de Encontrei o Pet
      cardEncontrei.classList.remove('hidden');
      document.getElementById('encontreiTitulo').textContent = `Encontrei o ${petData.nome}!`;
      document.getElementById('encontreiTagId').textContent = `ID da Tag: ${petId}`;

      const fotoEl = document.getElementById('encontreiFoto');
      if (petData.foto) {
        fotoEl.src = petData.foto;
        fotoEl.classList.remove('hidden');
      }

      const btnAvisar = document.getElementById('btnAvisarWhats');
      const statusEl = document.getElementById('encontreiStatus');

      function irParaWhats(localizacaoTexto = "") {
        let msg = `Ola! Encontrei o ${petData.nome}!`;
        if (localizacaoTexto) msg += ` Minha localizacao: ${localizacaoTexto}`;
        const link = `https://wa.me/${petData.telefone}?text=${encodeURIComponent(msg)}`;
        btnAvisar.href = link;
        btnAvisar.classList.remove('hidden');
        statusEl.textContent = "Clique abaixo para falar diretamente com o tutor no WhatsApp:";
      }

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            irParaWhats(`https://maps.google.com/?q=${lat},${lon}`);
          },
          () => { irParaWhats(); },
          { timeout: 5000 }
        );
      } else {
        irParaWhats();
      }
    } else {
      // Tag sem dono: mostrar formulário de cadastro direto
      cardCadastro.classList.remove('hidden');

      let fotoDataUrl = "";
      const fotoInput = document.getElementById('petFoto');
      const fotoPreview = document.getElementById('petFotoPreview');

      if (fotoInput) {
        fotoInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const size = 500;
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext('2d');
              const side = Math.min(img.width, img.height);
              const sx = (img.width - side) / 2;
              const sy = (img.height - side) / 2;
              ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
              fotoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
              fotoPreview.src = fotoDataUrl;
              fotoPreview.classList.remove('hidden');
            };
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        });
      }

      const form = document.getElementById('formCadastroPet');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const nome = document.getElementById('petNome').value.trim();
          let telRaw = document.getElementById('petTelefone').value.trim();
          let digits = telRaw.replace(/\D/g, "");
          if (digits.length === 10 || digits.length === 11) digits = "55" + digits;

          const dataToSave = {
            id: petId,
            nome: nome,
            telefone: digits,
            telefoneOriginal: telRaw,
            foto: fotoDataUrl,
            ativado: true
          };

          localStorage.setItem(`pet_tag_${petId.toLowerCase()}`, JSON.stringify(dataToSave));

          form.classList.add('hidden');
          const resultado = document.getElementById('petCadastroResultado');
          resultado.classList.remove('hidden');
          resultado.innerHTML = `
            <div style="margin-top: 1rem; color: #10b981; font-weight: 600;">
              <p>✅ Tag cadastrada com sucesso para o <strong>${escapeHtml(nome)}</strong>!</p>
              <p style="font-size:0.85rem; color: var(--text-muted); margin-top:0.5rem;">
                A partir de agora, quem escanear este QR Code ou aproximar o celular da tag NFC abrirá o WhatsApp do tutor.
              </p>
              <div style="margin-top: 1.25rem;">
                <button id="btnVerComoFicou" class="btn btn-outline btn-full" style="font-size: 0.88rem;">
                  👀 Ver tela pública de "Encontrei o Pet"
                </button>
              </div>
            </div>
          `;
          const btnVer = document.getElementById('btnVerComoFicou');
          if (btnVer) {
            btnVer.addEventListener('click', () => {
              window.location.reload();
            });
          }
        });
      }
    }
  }

  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
