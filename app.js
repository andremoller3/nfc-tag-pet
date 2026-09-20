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
    btnGenRandomSingleId: document.getElementById('btnGenRandomSingleId'),

    // Modal Pets na Nuvem
    btnOpenCloudPets: document.getElementById('btnOpenCloudPets'),
    modalCloudPets: document.getElementById('modalCloudPets'),
    btnCloseCloudPets: document.getElementById('btnCloseCloudPets'),
    btnOkCloudPets: document.getElementById('btnOkCloudPets'),
    btnRefreshCloudPets: document.getElementById('btnRefreshCloudPets'),
    cloudPetsContainer: document.getElementById('cloudPetsContainer'),
    cloudPetsCountBadge: document.getElementById('cloudPetsCountBadge')
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
    restoreBatchFromStorage();
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

    // Modal Pets na Nuvem
    if (dom.btnOpenCloudPets) dom.btnOpenCloudPets.addEventListener('click', openCloudPetsModal);
    if (dom.btnCloseCloudPets) dom.btnCloseCloudPets.addEventListener('click', () => closeModal(dom.modalCloudPets));
    if (dom.btnOkCloudPets) dom.btnOkCloudPets.addEventListener('click', () => closeModal(dom.modalCloudPets));
    if (dom.btnRefreshCloudPets) dom.btnRefreshCloudPets.addEventListener('click', openCloudPetsModal);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal(dom.modalGuide);
        closeModal(dom.modalDeploy);
        closeModal(dom.modalPreview);
        closeModal(dom.modalAddTag);
        closeModal(dom.modalCloudPets);
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
    saveBatchToStorage();

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
    saveBatchToStorage();
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
    saveBatchToStorage();
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
      saveBatchToStorage();
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
        saveBatchToStorage();
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
    localStorage.removeItem('pet_production_batch');
    dom.fileFeedback.classList.add('hidden');
    dom.productionSection.classList.add('hidden');
    if (dom.fileInput) dom.fileInput.value = '';
    if (dom.csvTextarea) dom.csvTextarea.value = '';
    if (dom.searchInput) dom.searchInput.value = '';
    if (dom.filterStatus) dom.filterStatus.value = 'todos';
  }

  // Salvar lote ativo no localStorage para não perder ao atualizar a página (F5)
  function saveBatchToStorage() {
    try {
      if (!state.records || state.records.length === 0) {
        localStorage.removeItem('pet_production_batch');
        return;
      }
      const dataToSave = {
        records: state.records.map(r => ({
          id: r.id,
          url: r.url,
          arquivoQr: r.arquivoQr,
          status: r.status
        })),
        fileName: dom.fileNameDisplay ? dom.fileNameDisplay.textContent : 'Lote Ativo',
        batchDate: state.batchDate
      };
      localStorage.setItem('pet_production_batch', JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('Não foi possível salvar o lote no armazenamento local:', e);
    }
  }

  // Restaurar lote ativo do localStorage se existir
  function restoreBatchFromStorage() {
    try {
      const saved = localStorage.getItem('pet_production_batch');
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      if (!parsed.records || parsed.records.length === 0) return false;

      const records = parsed.records.map(r => ({
        id: r.id,
        url: r.url,
        arquivoQr: r.arquivoQr,
        status: r.status,
        svgString: null
      }));
      generateSvgsForRecords(records);
      state.records = records;
      if (parsed.batchDate) {
        state.batchDate = parsed.batchDate;
        if (dom.batchDateLabel) dom.batchDateLabel.textContent = `Data do lote: ${parsed.batchDate}`;
      }

      if (dom.fileNameDisplay) dom.fileNameDisplay.textContent = parsed.fileName || `Lote com ${records.length} tags`;
      if (dom.fileCountDisplay) dom.fileCountDisplay.textContent = `${records.length} tags`;
      if (dom.fileFeedback) dom.fileFeedback.classList.remove('hidden');
      if (dom.productionSection) dom.productionSection.classList.remove('hidden');

      updateMetrics();
      renderTags();
      return true;
    } catch (e) {
      console.error('Erro restaurando lote:', e);
      return false;
    }
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

  // ===== Integração com Firebase Realtime Database (Nuvem) =====
  const FIREBASE_DB_URL = 'https://nfc-tag-pet-default-rtdb.firebaseio.com';

  // Buscar dados do pet no Firebase Realtime Database
  async function fetchPetFromCloud(petId) {
    const cleanId = petId.toLowerCase().trim();
    try {
      const response = await fetch(`${FIREBASE_DB_URL}/pets/${cleanId}.json`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.ativado) {
          localStorage.setItem(`pet_tag_${cleanId}`, JSON.stringify(data));
          return data;
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar Firebase, buscando no cache local:', err);
    }
    const local = localStorage.getItem(`pet_tag_${cleanId}`);
    try { return local ? JSON.parse(local) : null; } catch (e) { return null; }
  }

  // Gravar dados do pet no Firebase Realtime Database
  async function savePetToCloud(petId, petData) {
    const cleanId = petId.toLowerCase().trim();
    try {
      const response = await fetch(`${FIREBASE_DB_URL}/pets/${cleanId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petData)
      });
      if (!response.ok) {
        throw new Error(`Erro no banco: HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Falha salvando no Firebase:', err);
      throw err;
    }
    localStorage.setItem(`pet_tag_${cleanId}`, JSON.stringify(petData));
  }

  // Modal com todos os Pets Cadastrados na Nuvem
  async function openCloudPetsModal() {
    if (!dom.modalCloudPets || !dom.cloudPetsContainer) return;
    openModal(dom.modalCloudPets);
    dom.cloudPetsContainer.innerHTML = `
      <div style="padding: 2.5rem; text-align: center; color: var(--text-dim);">
        <div class="spin" style="font-size: 2rem; margin-bottom: 0.75rem;">🐾</div>
        <p style="font-size: 0.95rem;">Consultando banco de dados na nuvem...</p>
      </div>
    `;

    try {
      const resp = await fetch(`${FIREBASE_DB_URL}/pets.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const pets = await resp.json();

      if (!pets || Object.keys(pets).length === 0) {
        if (dom.cloudPetsCountBadge) dom.cloudPetsCountBadge.textContent = '0';
        dom.cloudPetsContainer.innerHTML = `
          <div style="padding: 3rem; text-align: center; color: var(--text-dim);">
            <p style="font-size: 1.1rem; color: #fff; margin-bottom: 0.5rem;">Nenhum pet cadastrado na nuvem ainda.</p>
            <span style="font-size: 0.85rem;">Assim que os clientes escanearem as tags físicas e cadastrarem, eles aparecerão aqui em tempo real.</span>
          </div>
        `;
        return;
      }

      const list = Object.entries(pets).map(([id, p]) => ({ id, ...p }));
      if (dom.cloudPetsCountBadge) dom.cloudPetsCountBadge.textContent = `${list.length}`;

      dom.cloudPetsContainer.innerHTML = `
        <table class="tags-table-view">
          <thead>
            <tr>
              <th style="width: 50px;">Foto</th>
              <th>ID da Tag</th>
              <th>Nome do Pet</th>
              <th>Sexo</th>
              <th>WhatsApp do Tutor</th>
              <th>PIN</th>
              <th>Data do Cadastro</th>
              <th style="text-align: right;">Ação</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(p => `
              <tr>
                <td>
                  ${p.foto ? `<img src="${p.foto}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border-color);" />` : '🐾'}
                </td>
                <td><strong style="font-family: var(--font-mono); color: #fff;">${escapeHtml(p.id)}</strong></td>
                <td><span style="color: var(--accent-emerald); font-weight: 700;">${escapeHtml(p.nome || 'Sem nome')}</span></td>
                <td>${p.sexo === 'femea' ? '♀️ Fêmea' : '♂️ Macho'}</td>
                <td>
                  <a href="https://wa.me/${escapeHtml(p.telefone)}" target="_blank" rel="noopener" style="color: var(--accent-cyan); text-decoration: none; font-weight: 500;">
                    ${escapeHtml(p.telefoneOriginal || p.telefone)}
                  </a>
                </td>
                <td><code style="font-family: var(--font-mono); color: #f59e0b; font-weight: 700;">${escapeHtml(p.pin || 'Sem PIN')}</code></td>
                <td style="color: var(--text-dim); font-size: 0.82rem;">
                  ${p.cadastradoEm ? new Date(p.cadastradoEm).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td style="text-align: right;">
                  <a href="/p/${escapeHtml(p.id)}" target="_blank" class="btn btn-download-svg" style="font-size: 0.78rem; text-decoration: none;">
                    Ver Tag ↗
                  </a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      dom.cloudPetsContainer.innerHTML = `
        <div style="padding: 2.5rem; text-align: center; color: #f43f5e;">
          <p style="font-weight: 600; margin-bottom: 0.5rem;">Erro ao carregar dados da nuvem</p>
          <span style="font-size: 0.85rem; color: var(--text-dim);">${escapeHtml(err.message)}</span>
        </div>
      `;
    }
  }

  // Fluxo da Página do Pet (/p/:id)
  async function initPetPublicFlow(petId) {
    // Ativar modo limpo específico para visualização do Pet
    document.body.classList.add('pet-mode');

    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.classList.add('hidden');

    const petContainer = document.getElementById('petPublicContainer');
    if (!petContainer) return;
    petContainer.classList.remove('hidden');

    const loadingEl = document.getElementById('petLoadingState');
    const cardCadastro = document.getElementById('cardCadastroPet');
    const cardEncontrei = document.getElementById('cardEncontreiPet');
    const modalPin = document.getElementById('modalPinSecurity');
    const formPin = document.getElementById('formVerifyPin');
    const inputPin = document.getElementById('inputPinVerify');
    const pinError = document.getElementById('pinVerifyError');
    const btnCancelPin = document.getElementById('btnCancelPin');
    const btnEditar = document.getElementById('btnEditarDadosTutor');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (cardCadastro) cardCadastro.classList.add('hidden');
    if (cardEncontrei) cardEncontrei.classList.add('hidden');

    const petData = await fetchPetFromCloud(petId);

    if (loadingEl) loadingEl.classList.add('hidden');

    function abrirFormularioEdicao() {
      closeModal(modalPin);
      cardEncontrei.classList.add('hidden');
      cardCadastro.classList.remove('hidden');
      document.getElementById('petNome').value = petData.nome || '';
      document.getElementById('petTelefone').value = petData.telefoneOriginal || petData.telefone || '';
      
      const radioSexo = document.querySelector(`input[name="petSexo"][value="${petData.sexo || 'macho'}"]`);
      if (radioSexo) radioSexo.checked = true;

      const pinInput = document.getElementById('petPin');
      if (pinInput) pinInput.value = petData.pin || '';

      if (petData.foto) {
        document.getElementById('petFotoPreview').src = petData.foto;
        const promptText = document.getElementById('fotoPromptText');
        const previewWrap = document.getElementById('fotoPreviewWrapper');
        if (promptText) promptText.classList.add('hidden');
        if (previewWrap) previewWrap.classList.remove('hidden');
      }

      const submitBtn = document.getElementById('btnCadastrarPet');
      if (submitBtn) submitBtn.textContent = 'Salvar Alterações 🐾';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (petData && petData.ativado) {
      // Pet já cadastrado: mostrar tela de Encontrei o Pet no estilo da referência
      cardEncontrei.classList.remove('hidden');

      const sexo = (petData.sexo || 'macho').toLowerCase();
      const isFemea = sexo === 'femea';
      const artigo = isFemea ? 'a' : 'o';
      const nomePet = (petData.nome || 'Pet').trim();

      // Título idêntico ao modelo: "Você encontrou a ADELE! 🐶" ou "Você encontrou o THOR! 🐶"
      document.getElementById('encontreiTitulo').textContent = `Você encontrou ${artigo} ${nomePet.toUpperCase()}! 🐶`;
      document.getElementById('encontreiTagId').textContent = `ID da Tag: ${escapeHtml(petId)}`;

      // Telefone do Tutor
      const telDisplay = petData.telefoneOriginal || petData.telefone || '';
      const telLink = document.getElementById('tutorPhoneLink');
      const btnLigar = document.getElementById('btnLigarTutor');
      if (telLink) {
        telLink.textContent = telDisplay;
        telLink.href = `tel:${petData.telefone}`;
      }
      if (btnLigar) {
        btnLigar.href = `tel:${petData.telefone}`;
      }

      // Foto do Pet
      const fotoEl = document.getElementById('encontreiFoto');
      const fotoWrap = document.getElementById('encontreiFotoWrap');
      if (petData.foto) {
        fotoEl.src = petData.foto;
        if (fotoWrap) fotoWrap.classList.remove('hidden');
      } else {
        if (fotoWrap) fotoWrap.classList.add('hidden');
      }

      // Localização e Botão WhatsApp
      const locIcon = document.getElementById('locIcon');
      const locTitle = document.getElementById('locTitle');
      const locDesc = document.getElementById('locDesc');
      const btnAvisar = document.getElementById('btnAvisarWhats');
      const btnAvisarText = document.getElementById('btnAvisarWhatsText');

      function atualizarAvisoWhats(localizacaoTexto = "") {
        let msg = `Ola! Encontrei ${artigo} ${nomePet}!`;
        if (localizacaoTexto) {
          msg += ` Minha localizacao: ${localizacaoTexto}`;
          if (locIcon) locIcon.textContent = '✅';
          if (locTitle) locTitle.textContent = 'Localização pronta!';
          if (locDesc) locDesc.textContent = 'O link do Google Maps será enviado na mensagem.';
          if (btnAvisarText) btnAvisarText.textContent = 'Chamar no WhatsApp (com mapa)';
        } else {
          if (locIcon) locIcon.textContent = '💬';
          if (locTitle) locTitle.textContent = 'Pronto para avisar!';
          if (locDesc) locDesc.textContent = 'Clique no botão verde abaixo para abrir a conversa.';
          if (btnAvisarText) btnAvisarText.textContent = 'Chamar no WhatsApp';
        }
        btnAvisar.href = `https://wa.me/${petData.telefone}?text=${encodeURIComponent(msg)}`;
      }

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            atualizarAvisoWhats(`https://maps.google.com/?q=${lat},${lon}`);
          },
          () => { atualizarAvisoWhats(); },
          { timeout: 6000, enableHighAccuracy: true }
        );
      } else {
        atualizarAvisoWhats();
      }

      // Botão de editar protegido por PIN
      if (btnEditar) {
        btnEditar.onclick = () => {
          if (petData.pin) {
            openModal(modalPin);
            if (inputPin) {
              inputPin.value = '';
              inputPin.focus();
            }
            if (pinError) pinError.classList.add('hidden');
          } else {
            // Tag antiga sem PIN: abre direto para permitir configurar
            abrirFormularioEdicao();
          }
        };
      }

      if (btnCancelPin) {
        btnCancelPin.onclick = () => {
          closeModal(modalPin);
        };
      }

      if (formPin) {
        formPin.onsubmit = (e) => {
          e.preventDefault();
          const entered = inputPin ? inputPin.value.trim() : '';
          if (entered === String(petData.pin).trim()) {
            abrirFormularioEdicao();
          } else {
            if (pinError) pinError.classList.remove('hidden');
            if (inputPin) {
              inputPin.classList.add('shake');
              setTimeout(() => inputPin.classList.remove('shake'), 400);
              inputPin.select();
            }
          }
        };
      }
    } else {
      // Tag sem dono: mostrar formulário de cadastro direto
      cardCadastro.classList.remove('hidden');
    }

    // Configuração do formulário de cadastro e upload de foto (usado tanto no 1º cadastro quanto na edição)
    let fotoDataUrl = "";
    const areaUpload = document.getElementById('areaUploadFoto');
    const fotoInput = document.getElementById('petFoto');
    const promptText = document.getElementById('fotoPromptText');
    const previewWrap = document.getElementById('fotoPreviewWrapper');
    const fotoPreview = document.getElementById('petFotoPreview');

    if (areaUpload && fotoInput) {
      areaUpload.onclick = (e) => {
        if (e.target !== fotoInput) fotoInput.click();
      };
    }

    if (fotoInput) {
      fotoInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 600;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            const side = Math.min(img.width, img.height);
            const sx = (img.width - side) / 2;
            const sy = (img.height - side) / 2;
            ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
            fotoDataUrl = canvas.toDataURL('image/jpeg', 0.82);
            if (fotoPreview) fotoPreview.src = fotoDataUrl;
            if (promptText) promptText.classList.add('hidden');
            if (previewWrap) previewWrap.classList.remove('hidden');
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      };
    }

    const form = document.getElementById('formCadastroPet');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btnCadastrarPet');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando na nuvem...';

        const pinVal = document.getElementById('petPin') ? document.getElementById('petPin').value.trim() : '';
        if (!/^\d{4}$/.test(pinVal)) {
          alert('Por favor, digite um PIN de segurança de exatamente 4 números (ex: 1234).');
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          if (document.getElementById('petPin')) document.getElementById('petPin').focus();
          return;
        }

        const sexoEl = form.querySelector('input[name="petSexo"]:checked');
        const sexo = sexoEl ? sexoEl.value : 'macho';
        const nome = document.getElementById('petNome').value.trim();
        let telRaw = document.getElementById('petTelefone').value.trim();
        let digits = telRaw.replace(/\D/g, "");
        if (digits.length === 10 || digits.length === 11) digits = "55" + digits;

        const dataToSave = {
          id: petId,
          nome: nome,
          sexo: sexo,
          pin: pinVal,
          telefone: digits,
          telefoneOriginal: telRaw,
          foto: fotoDataUrl || (petData && petData.foto ? petData.foto : ""),
          ativado: true,
          cadastradoEm: petData && petData.cadastradoEm ? petData.cadastradoEm : new Date().toISOString()
        };

        try {
          await savePetToCloud(petId, dataToSave);

          form.classList.add('hidden');
          const resultado = document.getElementById('petCadastroResultado');
          resultado.classList.remove('hidden');
          const artigo = sexo === 'femea' ? 'a' : 'o';
          resultado.innerHTML = `
            <div style="margin-top: 1rem; color: #16a34a; font-weight: 600;">
              <p>✅ Tag salva na nuvem e protegida por PIN para <strong>${artigo} ${escapeHtml(nome)}</strong>!</p>
              <p style="font-size:0.85rem; color: #64748b; margin-top:0.5rem;">
                A partir de agora, apenas quem souber o PIN de 4 dígitos (<code>${escapeHtml(pinVal)}</code>) poderá alterar os dados desta coleira.
              </p>
              <div style="margin-top: 1.25rem;">
                <button id="btnVerComoFicou" class="btn-submit-clean" style="background: #22c55e; cursor: pointer;">
                  👀 Ver tela oficial de "Encontrei o Pet"
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
        } catch (err) {
          alert('Erro ao salvar no banco de dados na nuvem: ' + err.message);
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      };
    }
  }

  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


