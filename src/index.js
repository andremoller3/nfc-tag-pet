// ===== Utilidades =====

function generateId(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function generateToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Limpa o telefone e garante o formato E.164 sem "+" (o que o wa.me espera).
// Assume Brasil (55) se vier só com DDD + número (10 ou 11 dígitos).
function sanitizePhone(raw) {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    digits = "55" + digits;
  }
  return digits;
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Grava uma tag no KV e mantém a metadata (status/nome) sincronizada,
// pra permitir listar tags no admin sem precisar ler o valor de cada uma.
async function putTag(env, id, data) {
  await env.PETS.put(`tag:${id}`, JSON.stringify(data), {
    metadata: { ativado: !!data.ativado, nome: data.nome || "" },
  });
}

function checkAdminKey(request, env) {
  const chave = request.headers.get("x-admin-key") || "";
  return !!env.ADMIN_KEY && chave === env.ADMIN_KEY;
}

const baseStyle = `
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, system-ui, sans-serif;
      background: #fef6ee;
      margin: 0;
      padding: 24px 16px;
      color: #2b2320;
    }
    .card {
      max-width: 420px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    h1 { font-size: 1.3rem; margin-top: 0; }
    h2 { font-size: 1.05rem; margin: 28px 0 4px; }
    label { display: block; margin: 14px 0 6px; font-weight: 600; font-size: 0.9rem; }
    input[type=text], input[type=tel], input[type=password], input[type=number] {
      width: 100%; padding: 10px 12px; border: 1px solid #ddd;
      border-radius: 10px; font-size: 1rem;
    }
    input[type=file] { margin-top: 4px; }
    button {
      margin-top: 20px; width: 100%; padding: 12px; border: none;
      border-radius: 10px; background: #ff7a3d; color: #fff;
      font-size: 1rem; font-weight: 600; cursor: pointer;
    }
    button.secundario { background: #eee; color: #333; }
    button.perigo { background: #c0392b; }
    button.pequeno { margin-top: 0; width: auto; padding: 6px 10px; font-size: 0.8rem; }
    button:disabled { opacity: 0.6; }
    .foto-preview {
      width: 100%; max-width: 260px; border-radius: 14px; display: block;
      margin: 12px auto; object-fit: cover; aspect-ratio: 1/1;
    }
    .msg { text-align: center; margin-top: 16px; font-size: 0.95rem; }
    a { color: #ff7a3d; }
    .url-box {
      background: #f4f4f4; padding: 10px 12px; border-radius: 10px;
      word-break: break-all; font-size: 0.85rem; margin-top: 10px;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 0.82rem; }
    th, td { border: 1px solid #eee; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f7f7f7; }
    .tag-ativo { color: #1a7f37; font-weight: 600; }
    .tag-pendente { color: #b8860b; font-weight: 600; }
    .linha-acoes { display: flex; gap: 6px; }
    .painel-edicao {
      display: none; background: #fafafa; border: 1px solid #eee;
      border-radius: 10px; padding: 12px; margin-top: 6px;
    }
  </style>
`;

// ===== Páginas públicas (fluxo do pet) =====

function cadastroDiretoPage(id) {
  return html(`<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cadastrar este pet</title>${baseStyle}</head>
<body>
  <div class="card">
    <h1>🐾 Esta identificação ainda não tem dono</h1>
    <p class="msg" style="margin-top:0">Preencha os dados abaixo para vincular esta tag ao seu pet. Depois disso, todo mundo que escanear vai direto pro seu WhatsApp.</p>
    <form id="form">
      <label>Nome do pet</label>
      <input type="text" id="nome" required maxlength="40">

      <label>WhatsApp do dono (com DDD)</label>
      <input type="tel" id="telefone" required placeholder="(12) 91234-5678">

      <label>Foto do pet</label>
      <input type="file" id="foto" accept="image/*">
      <img id="preview" class="foto-preview" style="display:none">

      <button type="submit" id="btn">Cadastrar meu pet</button>
    </form>
    <div id="resultado"></div>
  </div>

<script>
let fotoDataUrl = "";
document.getElementById('foto').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  const reader = new FileReader();
  reader.onload = (ev) => { img.src = ev.target.result; };
  img.onload = () => {
    const size = 500;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    fotoDataUrl = canvas.toDataURL('image/jpeg', 0.75);
    const preview = document.getElementById('preview');
    preview.src = fotoDataUrl;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn');
  btn.disabled = true;
  btn.textContent = 'Cadastrando...';
  const nome = document.getElementById('nome').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const resp = await fetch('/api/cadastro/${id}', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome, telefone, foto: fotoDataUrl })
  });
  const data = await resp.json();
  btn.disabled = false;
  btn.textContent = 'Cadastrar meu pet';
  if (!resp.ok) {
    document.getElementById('resultado').innerHTML =
      '<p class="msg" style="color:#c00">' + (data.erro || 'Erro ao cadastrar') + '</p>';
    return;
  }
  document.getElementById('form').style.display = 'none';
  document.getElementById('resultado').innerHTML = \`
    <p class="msg">✅ Pronto! A partir de agora, quem escanear esta tag cai direto na página do \${data.nome}.</p>
    <p class="msg">Guarde este link de edição (só você deve ter acesso) para trocar dados depois:</p>
    <div class="url-box"><a href="\${data.editUrl}">\${data.editUrl}</a></div>
  \`;
});
</script>
</body></html>`);
}

function editFormPage(tag, id, token) {
  const fotoTag = tag.foto ? `<img class="foto-preview" src="${tag.foto}">` : "";
  return html(`<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Editar Pet</title>${baseStyle}</head>
<body>
  <div class="card">
    <h1>✏️ Editar ${escapeHtml(tag.nome)}</h1>
    ${fotoTag}
    <form id="form">
      <label>Nome do pet</label>
      <input type="text" id="nome" required maxlength="40" value="${escapeHtml(tag.nome)}">
      <label>WhatsApp do dono (com DDD)</label>
      <input type="tel" id="telefone" required value="${escapeHtml(tag.telefoneOriginal || "")}">
      <label>Trocar foto (opcional)</label>
      <input type="file" id="foto" accept="image/*">
      <img id="preview" class="foto-preview" style="display:none">
      <button type="submit" id="btn">Salvar alterações</button>
    </form>
    <div id="resultado"></div>
  </div>
<script>
let fotoDataUrl = "";
document.getElementById('foto').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  const reader = new FileReader();
  reader.onload = (ev) => { img.src = ev.target.result; };
  img.onload = () => {
    const size = 500;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    fotoDataUrl = canvas.toDataURL('image/jpeg', 0.75);
    const preview = document.getElementById('preview');
    preview.src = fotoDataUrl;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});
document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn');
  btn.disabled = true;
  btn.textContent = 'Salvando...';
  const nome = document.getElementById('nome').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const resp = await fetch('/api/editar/${id}?token=${encodeURIComponent(token)}', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nome, telefone, foto: fotoDataUrl })
  });
  const data = await resp.json();
  btn.disabled = false;
  btn.textContent = 'Salvar alterações';
  if (!resp.ok) {
    document.getElementById('resultado').innerHTML =
      '<p class="msg" style="color:#c00">' + (data.erro || 'Erro ao salvar') + '</p>';
    return;
  }
  document.getElementById('resultado').innerHTML =
    '<p class="msg" style="color:#1a7f37">✅ Alterações salvas com sucesso!</p>';
});
</script>
</body></html>`);
}

function petPublicPage(tag) {
  const fotoTag = tag.foto ? `<img class="foto-preview" src="${tag.foto}">` : "";
  return html(`<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Encontrei o ${escapeHtml(tag.nome)}!</title>${baseStyle}</head>
<body>
  <div class="card" style="text-align:center">
    ${fotoTag}
    <h1>Encontrei o ${escapeHtml(tag.nome)}!</h1>
    <p class="msg" id="status">Obtendo sua localização para enviar ao dono...</p>
    <a id="btn" style="display:none" href="#"><button>Avisar no WhatsApp</button></a>
  </div>
<script>
const telefone = "${tag.telefone}";
const nome = ${JSON.stringify(tag.nome)};
function irParaWhats(localizacaoTexto = "") {
  let msg = "Ola! Encontrei o " + nome + "!";
  if (localizacaoTexto) msg += " Minha localizacao: " + localizacaoTexto;
  const link = "https://wa.me/" + telefone + "?text=" + encodeURIComponent(msg);
  const btn = document.getElementById('btn');
  btn.href = link;
  btn.style.display = 'block';
  document.getElementById('status').textContent = "Clique abaixo para falar com o dono:";
  setTimeout(() => { window.location.href = link; }, 1200);
}
if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      irParaWhats("https://maps.google.com/?q=" + lat + "," + lon);
    },
    () => { irParaWhats(); },
    { timeout: 5000 }
  );
} else {
  irParaWhats();
}
</script>
</body></html>`);
}

// ===== Painel Admin =====

function adminPage() {
  return html(`<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin — Pet NFC</title>${baseStyle}</head>
<body>
  <div class="card" style="max-width: 680px">
    <h1>Painel Admin — Pet NFC</h1>

    <label>Chave de acesso</label>
    <input type="password" id="chave" placeholder="Digite a chave configurada no Worker">

    <h2>1. Gerar novo lote de tags</h2>
    <label>Quantidade de tags (1 a 500)</label>
    <input type="number" id="qtd" value="20" min="1" max="500">
    <button id="btnGerar">Gerar lote</button>
    <button id="btnCsv" class="secundario" style="display:none">Baixar CSV para impressão</button>
    <div id="resultadoGerar"></div>

    <h2>2. Buscar / gerenciar tags</h2>
    <label>Filtrar por início do ID (opcional)</label>
    <input type="text" id="busca" placeholder="ex: a1, 3f... deixe vazio pra ver todas">
    <button id="btnBuscar">Buscar</button>
    <div id="resultadoBusca"></div>
    <button id="btnMais" class="secundario" style="display:none; margin-top: 10px">Carregar mais</button>
  </div>

<script>
let ultimoLote = [];
let cursorAtual = null;

function chaveHeader() {
  return {
    'content-type': 'application/json',
    'x-admin-key': document.getElementById('chave').value.trim()
  };
}

document.getElementById('btnGerar').addEventListener('click', async () => {
  const btn = document.getElementById('btnGerar');
  btn.disabled = true; btn.textContent = 'Gerando...';
  document.getElementById('resultadoGerar').innerHTML = '';
  document.getElementById('btnCsv').style.display = 'none';

  const quantidade = parseInt(document.getElementById('qtd').value, 10) || 1;
  const resp = await fetch('/api/admin/gerar-lote', {
    method: 'POST',
    headers: chaveHeader(),
    body: JSON.stringify({ quantidade })
  });
  const data = await resp.json();
  btn.disabled = false; btn.textContent = 'Gerar lote';
  if (!resp.ok) {
    document.getElementById('resultadoGerar').innerHTML = '<p class="msg" style="color:#c00">' + (data.erro || 'Erro') + '</p>';
    return;
  }
  ultimoLote = data.tags;
  document.getElementById('btnCsv').style.display = 'block';
  const suportaNfc = 'NDEFReader' in window;
  const avisoNfc = suportaNfc
    ? ''
    : '<p class="msg" style="color:#b8860b">Gravação NFC direto pelo navegador só funciona no Chrome para Android. Copie o link e grave manualmente com o app NFC Tools.</p>';
  const linhas = data.tags.map((t, i) => \`
    <tr>
      <td>\${t.id}</td>
      <td style="word-break:break-all">\${t.url}</td>
      <td class="linha-acoes">
        \${suportaNfc
          ? '<button class="pequeno" id="btnNfc' + i + '" onclick="gravarNfc(\\'' + t.url + '\\', ' + i + ')">Gravar NFC</button>'
          : ''}
        <button class="pequeno secundario" id="btnCopiar\${i}" onclick="copiarLink('\${t.url}', \${i})">Copiar link</button>
      </td>
    </tr>\`).join('');
  document.getElementById('resultadoGerar').innerHTML = \`
    <p class="msg">✅ \${data.tags.length} tags geradas.</p>
    \${avisoNfc}
    <table><tr><th>ID</th><th>URL</th><th>Ações</th></tr>\${linhas}</table>
  \`;
});

function copiarLink(url, indice) {
  const btn = document.getElementById('btnCopiar' + indice);
  navigator.clipboard.writeText(url).then(() => {
    const textoOriginal = btn.textContent;
    btn.textContent = 'Copiado!';
    setTimeout(() => { btn.textContent = textoOriginal; }, 1500);
  }).catch(() => {
    alert('Não foi possível copiar automaticamente. Selecione o link na tabela e copie manualmente.');
  });
}

async function gravarNfc(url, indice) {
  const btn = document.getElementById('btnNfc' + indice);
  if (!('NDEFReader' in window)) {
    alert('Seu navegador não suporta Web NFC (funciona no Chrome para Android). Use o app NFC Tools.');
    return;
  }
  try {
    const ndef = new NDEFReader();
    btn.disabled = true;
    btn.textContent = 'Aproxime a tag...';
    await ndef.write({ records: [{ recordType: 'url', data: url }] });
    btn.textContent = '✅ Gravado!';
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Gravar NFC';
    alert('Erro ao gravar (a tag pode estar protegida contra escrita, fora de alcance, ou você negou a permissão): ' + err.message);
  }
}

document.getElementById('btnCsv').addEventListener('click', () => {
  const cabecalho = 'id,url\\n';
  const linhas = ultimoLote.map(t => t.id + ',' + t.url).join('\\n');
  const blob = new Blob([cabecalho + linhas], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lote-tags.csv';
  a.click();
});

function linhaTabela(t) {
  const statusHtml = t.ativado
    ? '<span class="tag-ativo">Ativado</span>'
    : '<span class="tag-pendente">Pendente</span>';
  return \`
    <tr>
      <td>\${t.id}</td>
      <td>\${statusHtml}</td>
      <td>\${t.nome || '-'}</td>
      <td class="linha-acoes">
        <button class="pequeno secundario" onclick="abrirEdicao('\${t.id}')">Editar</button>
        <button class="pequeno perigo" onclick="resetarTag('\${t.id}')">Resetar</button>
      </td>
    </tr>
    <tr id="painel-\${t.id}">
      <td colspan="4">
        <div class="painel-edicao" id="edicao-\${t.id}"></div>
      </td>
    </tr>
  \`;
}

async function buscarTags(continuar) {
  const filtro = document.getElementById('busca').value.trim();
  const body = { prefixoId: filtro };
  if (continuar && cursorAtual) body.cursor = cursorAtual;

  const resp = await fetch('/api/admin/listar', { method: 'POST', headers: chaveHeader(), body: JSON.stringify(body) });
  const data = await resp.json();
  if (!resp.ok) {
    document.getElementById('resultadoBusca').innerHTML = '<p class="msg" style="color:#c00">' + (data.erro || 'Erro') + '</p>';
    return;
  }

  cursorAtual = data.cursor || null;
  document.getElementById('btnMais').style.display = cursorAtual ? 'block' : 'none';

  const linhas = data.tags.map(linhaTabela).join('');
  const tabela = \`<table><tr><th>ID</th><th>Status</th><th>Pet</th><th>Ações</th></tr>\${linhas}</table>\`;

  if (continuar) {
    document.getElementById('resultadoBusca').innerHTML += tabela;
  } else {
    document.getElementById('resultadoBusca').innerHTML = data.tags.length
      ? tabela
      : '<p class="msg">Nenhuma tag encontrada.</p>';
  }
}

document.getElementById('btnBuscar').addEventListener('click', () => { cursorAtual = null; buscarTags(false); });
document.getElementById('btnMais').addEventListener('click', () => buscarTags(true));

function abrirEdicao(id) {
  const painel = document.getElementById('edicao-' + id);
  const jaAberto = painel.style.display === 'block';
  document.querySelectorAll('.painel-edicao').forEach(p => p.style.display = 'none');
  if (jaAberto) return;
  painel.style.display = 'block';
  painel.innerHTML = \`
    <label>Nome do pet</label>
    <input type="text" id="nome-\${id}">
    <label>WhatsApp do dono</label>
    <input type="tel" id="telefone-\${id}">
    <button class="pequeno" onclick="salvarEdicao('\${id}')">Salvar</button>
  \`;
}

async function salvarEdicao(id) {
  const nome = document.getElementById('nome-' + id).value.trim();
  const telefone = document.getElementById('telefone-' + id).value.trim();
  const resp = await fetch('/api/admin/tag-editar', {
    method: 'POST', headers: chaveHeader(), body: JSON.stringify({ id, nome, telefone })
  });
  const data = await resp.json();
  if (!resp.ok) { alert(data.erro || 'Erro ao salvar'); return; }
  cursorAtual = null;
  buscarTags(false);
}

async function resetarTag(id) {
  if (!confirm('Tem certeza? Isso desvincula o pet cadastrado nessa tag (ID ' + id + ') e ela volta a ficar disponível pra um novo cadastro.')) return;
  const resp = await fetch('/api/admin/tag-resetar', {
    method: 'POST', headers: chaveHeader(), body: JSON.stringify({ id })
  });
  const data = await resp.json();
  if (!resp.ok) { alert(data.erro || 'Erro ao resetar'); return; }
  cursorAtual = null;
  buscarTags(false);
}
</script>
</body></html>`);
}

// ===== Handlers públicos =====

async function handleCadastroDireto(id, request, env) {
  const raw = await env.PETS.get(`tag:${id}`);
  if (!raw) return json({ erro: "ID de tag não reconhecido." }, 404);
  const tag = JSON.parse(raw);
  if (tag.ativado) return json({ erro: "Esta tag já está vinculada a um pet." }, 409);

  const body = await request.json();
  const nome = (body.nome || "").trim();
  const telefoneOriginal = (body.telefone || "").trim();
  const telefone = sanitizePhone(telefoneOriginal);
  const foto = body.foto || "";
  if (!nome || !telefone) return json({ erro: "Nome e telefone são obrigatórios." }, 400);

  const token = generateToken();
  await putTag(env, id, { ativado: true, nome, telefone, telefoneOriginal, foto, token });

  const origin = new URL(request.url).origin;
  return json({ nome, url: `${origin}/p/${id}`, editUrl: `${origin}/editar/${id}?token=${token}` });
}

async function handlePetPage(id, env) {
  const raw = await env.PETS.get(`tag:${id}`);
  if (!raw) return html("<h1>Identificação não encontrada 🐾</h1>", 404);
  const tag = JSON.parse(raw);
  if (!tag.ativado) return cadastroDiretoPage(id);
  return petPublicPage(tag);
}

async function handleEditForm(id, env, url) {
  const token = url.searchParams.get("token");
  const raw = await env.PETS.get(`tag:${id}`);
  if (!raw) return html("<h1>Identificação não encontrada 🐾</h1>", 404);
  const tag = JSON.parse(raw);
  if (!tag.ativado || tag.token !== token) return html("<h1>Link de edição inválido</h1>", 403);
  return editFormPage(tag, id, token);
}

async function handleEditSubmit(id, request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const raw = await env.PETS.get(`tag:${id}`);
  if (!raw) return json({ erro: "Identificação não encontrada." }, 404);
  const tag = JSON.parse(raw);
  if (!tag.ativado || tag.token !== token) return json({ erro: "Token inválido." }, 403);

  const body = await request.json();
  const nome = (body.nome || tag.nome).trim();
  const telefoneOriginal = (body.telefone || tag.telefoneOriginal).trim();
  const telefone = sanitizePhone(telefoneOriginal);
  const foto = body.foto || tag.foto;

  await putTag(env, id, { ...tag, nome, telefone, telefoneOriginal, foto });
  return json({ ok: true });
}

// ===== Handlers admin =====

async function handleGerarLote(request, env) {
  if (!checkAdminKey(request, env)) return json({ erro: "Chave admin inválida." }, 401);

  const body = await request.json().catch(() => ({}));
  let quantidade = parseInt(body.quantidade, 10) || 0;
  if (quantidade < 1) quantidade = 1;
  if (quantidade > 500) quantidade = 500;

  const origin = new URL(request.url).origin;
  const tags = [];

  for (let i = 0; i < quantidade; i++) {
    let id;
    do { id = generateId(); } while (await env.PETS.get(`tag:${id}`));
    await putTag(env, id, {
      ativado: false, nome: "", telefone: "", telefoneOriginal: "", foto: "", token: "",
    });
    tags.push({ id, url: `${origin}/p/${id}` });
  }

  return json({ tags });
}

async function handleListarTags(request, env) {
  if (!checkAdminKey(request, env)) return json({ erro: "Chave admin inválida." }, 401);

  const body = await request.json().catch(() => ({}));
  const prefixoId = (body.prefixoId || "").trim().toLowerCase();
  const cursor = body.cursor || undefined;

  const resultado = await env.PETS.list({
    prefix: `tag:${prefixoId}`,
    cursor,
    limit: 50,
  });

  const tags = [];
  for (const chave of resultado.keys) {
    const id = chave.name.slice(4); // remove "tag:"
    if (chave.metadata) {
      tags.push({ id, ativado: !!chave.metadata.ativado, nome: chave.metadata.nome || "" });
    } else {
      // fallback pra tags gravadas antes de existir metadata
      const raw = await env.PETS.get(chave.name);
      if (raw) {
        const tag = JSON.parse(raw);
        tags.push({ id, ativado: !!tag.ativado, nome: tag.nome || "" });
      }
    }
  }

  return json({ tags, cursor: resultado.list_complete ? null : resultado.cursor });
}

async function handleAdminEditarTag(request, env) {
  if (!checkAdminKey(request, env)) return json({ erro: "Chave admin inválida." }, 401);

  const body = await request.json().catch(() => ({}));
  const id = (body.id || "").trim().toLowerCase();
  const raw = await env.PETS.get(`tag:${id}`);
  if (!raw) return json({ erro: "Tag não encontrada." }, 404);

  const tag = JSON.parse(raw);
  const nome = (body.nome || tag.nome || "").trim();
  const telefoneOriginal = (body.telefone || tag.telefoneOriginal || "").trim();
  const telefone = telefoneOriginal ? sanitizePhone(telefoneOriginal) : tag.telefone;
  const foto = body.foto || tag.foto || "";
  const token = tag.token || generateToken();

  await putTag(env, id, {
    ativado: true, nome, telefone, telefoneOriginal, foto, token,
  });

  return json({ ok: true });
}

async function handleAdminResetarTag(request, env) {
  if (!checkAdminKey(request, env)) return json({ erro: "Chave admin inválida." }, 401);

  const body = await request.json().catch(() => ({}));
  const id = (body.id || "").trim().toLowerCase();
  const raw = await env.PETS.get(`tag:${id}`);
  if (!raw) return json({ erro: "Tag não encontrada." }, 404);

  await putTag(env, id, {
    ativado: false, nome: "", telefone: "", telefoneOriginal: "", foto: "", token: "",
  });

  return json({ ok: true });
}

// ===== Router =====

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const { method } = request;

    try {
      if (pathname === "/") return Response.redirect(url.origin + "/admin", 302);
      if (pathname.startsWith("/p/") && method === "GET") {
        return handlePetPage(pathname.slice(3).toLowerCase(), env);
      }
      if (pathname.startsWith("/api/cadastro/") && method === "POST") {
        return handleCadastroDireto(pathname.slice(14), request, env);
      }
      if (pathname.startsWith("/editar/") && method === "GET") {
        return handleEditForm(pathname.slice(8), env, url);
      }
      if (pathname.startsWith("/api/editar/") && method === "POST") {
        return handleEditSubmit(pathname.slice(12), request, env);
      }
      if (pathname === "/admin" && method === "GET") return adminPage();
      if (pathname === "/api/admin/gerar-lote" && method === "POST") return handleGerarLote(request, env);
      if (pathname === "/api/admin/listar" && method === "POST") return handleListarTags(request, env);
      if (pathname === "/api/admin/tag-editar" && method === "POST") return handleAdminEditarTag(request, env);
      if (pathname === "/api/admin/tag-resetar" && method === "POST") return handleAdminResetarTag(request, env);

      return html("<h1>404 - Não encontrado</h1>", 404);
    } catch (err) {
      return json({ erro: "Erro interno: " + err.message }, 500);
    }
  },
};
