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
    // Importação
    tabDrop: document.getElementById('tabDrop'),
    tabPaste: document.getElementById('tabPaste'),
    btnLoadExample: document.getElementById('btnLoadExample'),
    dropZone: document.getElementById('dropZone'),
    pasteZone: document.getElementById('pasteZone'),
    fileInput: document.getElementById('fileInput'),
    csvTextarea: document.getElementById('csvTextarea'),
    btnProcessPaste: document.getElementById('btnProcessPaste'),
    fileFeedback: document.getElementById('fileFeedback'),
    fileNameDisplay: document.getElementById('fileNameDisplay'),
    fileCountDisplay: document.getElementById('fileCountDisplay'),
    btnResetFile: document.getElementById('btnResetFile'),

    // Produção
    productionSection: document.getElementById('productionSection'),
    batchDateLabel: document.getElementById('batchDateLabel'),
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
    btnDownloadCurrentSvg: document.getElementById('btnDownloadCurrentSvg')
  };

  // Inicialização
  function init() {
    setupEventListeners();
    dom.batchDateLabel.textContent = `Data do lote: ${state.batchDate}`;
  }

  // Configuração dos Eventos
  function setupEventListeners() {
    // Alternar abas de importação
    dom.tabDrop.addEventListener('click', () => switchImportTab('drop'));
    dom.tabPaste.addEventListener('click', () => switchImportTab('paste'));

    // Drag & Drop
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

    // Clique na dropzone para abrir seletor
    dom.dropZone.addEventListener('click', (e) => {
      if (e.target !== dom.fileInput) {
        dom.fileInput.click();
      }
    });

    dom.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    });

    // Colar texto
    dom.btnProcessPaste.addEventListener('click', () => {
      const text = dom.csvTextarea.value.trim();
      if (!text) {
        alert('Por favor, cole o conteúdo do CSV com cabeçalho id,url');
        return;
      }
      processCsvContent(text, 'texto-colado.csv');
    });

    // Exemplo de demonstração
    dom.btnLoadExample.addEventListener('click', loadExampleData);

    // Resetar / Trocar arquivo
    dom.btnResetFile.addEventListener('click', resetData);

    // Filtros e busca
    dom.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      renderTags();
    });

    dom.filterStatus.addEventListener('change', (e) => {
      state.statusFilter = e.target.value;
      renderTags();
    });

    // Modos de visualização (Grid vs Tabela)
    dom.btnViewGrid.addEventListener('click', () => setViewMode('grid'));
    dom.btnViewTable.addEventListener('click', () => setViewMode('table'));

    // Downloads
    dom.btnDownloadZip.addEventListener('click', downloadBatchZip);
    dom.btnDownloadManifest.addEventListener('click', downloadManifestCsv);

    // Modais
    dom.btnOpenGuide.addEventListener('click', () => openModal(dom.modalGuide));
    dom.btnCloseGuide.addEventListener('click', () => closeModal(dom.modalGuide));
    dom.btnOkGuide.addEventListener('click', () => closeModal(dom.modalGuide));

    dom.btnOpenDeploy.addEventListener('click', () => openModal(dom.modalDeploy));
    dom.btnCloseDeploy.addEventListener('click', () => closeModal(dom.modalDeploy));
    dom.btnOkDeploy.addEventListener('click', () => closeModal(dom.modalDeploy));

    dom.btnClosePreview.addEventListener('click', () => closeModal(dom.modalPreview));
    dom.btnClosePreviewBtn.addEventListener('click', () => closeModal(dom.modalPreview));
    dom.btnDownloadCurrentSvg.addEventListener('click', () => {
      if (state.previewRecord) {
        downloadSingleSvg(state.previewRecord);
      }
    });

    // Fechar modais ao clicar no overlay
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target);
      }
    });

    // Fechar com tecla ESC
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal(dom.modalGuide);
        closeModal(dom.modalDeploy);
        closeModal(dom.modalPreview);
      }
    });
  }

  // Alternar abas
  function switchImportTab(mode) {
    if (mode === 'drop') {
      dom.tabDrop.classList.add('active');
      dom.tabPaste.classList.remove('active');
      dom.dropZone.classList.remove('hidden');
      dom.pasteZone.classList.add('hidden');
    } else {
      dom.tabDrop.classList.remove('active');
      dom.tabPaste.classList.add('active');
      dom.dropZone.classList.add('hidden');
      dom.pasteZone.classList.remove('hidden');
    }
  }

  // Manipular arquivo recebido
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
    const sampleCsv = `id,url
PET-001,https://nfc.pet/t/PET-001
PET-002,https://nfc.pet/t/PET-002
PET-003,https://nfc.pet/t/PET-003
PET-004,https://nfc.pet/t/PET-004
PET-005,https://nfc.pet/t/PET-005`;

    processCsvContent(sampleCsv, 'exemplo-lote-tags.csv');
  }

  // Processar conteúdo do CSV
  function processCsvContent(csvString, fileName) {
    const rawLines = csvString.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (rawLines.length < 2) {
      alert('O CSV precisa ter um cabeçalho e pelo menos 1 linha de tag.');
      return;
    }

    // Detectar delimitador (, ou ;)
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

    // Ordenar alfabeticamente por ID (conforme o script gerar-producao.js)
    records.sort((a, b) => a.id.localeCompare(b.id));

    // Gerar SVGs para cada tag usando a lib QRCode
    generateSvgsForRecords(records);

    state.records = records;

    // Atualizar UI
    dom.fileNameDisplay.textContent = fileName;
    dom.fileCountDisplay.textContent = `${records.length} tags`;
    dom.fileFeedback.classList.remove('hidden');
    dom.productionSection.classList.remove('hidden');

    updateMetrics();
    renderTags();
  }

  // Geração dos SVGs no cliente (compatível com Node e Bambu Studio)
  function generateSvgsForRecords(records) {
    const qrEngine = window.QRCodeSvg || window.QRCode;

    if (!qrEngine) {
      console.error('Biblioteca QRCode não encontrada.');
      alert('Erro: Biblioteca de geração de QR Code não carregada.');
      return;
    }

    records.forEach(record => {
      try {
        // Gera SVG com correção 'M' e margem 1 (idêntico ao gerar-producao.js)
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

    // Eventos do Card
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

      // Eventos da Linha
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

      // Estrutura idêntica ao README.md:
      // producao/<data>/qrs/<id>.svg e producao/<data>/manifest.csv
      const folderName = `producao/${state.batchDate}`;
      const qrsFolder = zip.folder(`${folderName}/qrs`);

      // Adicionar SVGs
      state.records.forEach(r => {
        if (r.svgString) {
          qrsFolder.file(`${r.id}.svg`, r.svgString);
        }
      });

      // Gerar e adicionar manifest.csv
      const headerManifest = 'id,url,arquivo_qr,status\n';
      const linesManifest = state.records
        .map(r => `${r.id},${r.url},${r.arquivoQr},${r.status}`)
        .join('\n');
      zip.file(`${folderName}/manifest.csv`, headerManifest + linesManifest);

      // Gerar o blob do ZIP
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Baixar arquivo ZIP
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

  // Resetar dados para carregar outro arquivo
  function resetData() {
    state.records = [];
    dom.fileFeedback.classList.add('hidden');
    dom.productionSection.classList.add('hidden');
    dom.fileInput.value = '';
    dom.csvTextarea.value = '';
    dom.searchInput.value = '';
    dom.filterStatus.value = 'todos';
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

  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
