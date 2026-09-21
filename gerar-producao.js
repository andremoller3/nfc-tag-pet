// gerar-producao.js
//
// Uso:
//   npm install qrcode
//   node gerar-producao.js lote-tags.csv
//
// Entrada: o CSV baixado em /admin (colunas: id,url)
//
// Saída (dentro de ./producao/<data-do-lote>/):
//   qrs/<id>.svg   -> um QR vetorial por tag, nomeado pelo ID (SVG importa
//                     limpo no Bambu Studio / fatiador, sem perder nitidez
//                     em nenhum tamanho, e sem risco de trocar peça)
//   manifest.csv   -> planilha de controle: id, url, arquivo, status
//                     (pendente/impresso/embalado/enviado/descartado)

const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

// Gera SVG vetorial fechado compatível com Bambu Studio, OrcaSlicer e PrusaSlicer:
// - Sem retângulo de fundo (evita extrusão de bloco sólido no fatiador 3D)
// - Polígonos 2D fechados (fill) em vez de traços 1D (stroke)
function qrToBambuSvg(qrData, margin = 1) {
  const size = qrData.modules.size;
  const totalSize = size + margin * 2;
  let d = "";

  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      if (qrData.modules.get(row, col)) {
        const startCol = col;
        while (col < size && qrData.modules.get(row, col)) {
          col++;
        }
        const length = col - startCol;
        d += `M${startCol + margin},${row + margin}h${length}v1h-${length}z`;
      } else {
        col++;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges"><path fill="#000000" d="${d}"/></svg>`;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Uso: node gerar-producao.js lote-tags.csv");
    process.exit(1);
  }

  const conteudo = fs.readFileSync(csvPath, "utf8").trim();
  const linhas = conteudo.split("\n");
  const cabecalho = linhas[0].split(",");
  const idxId = cabecalho.indexOf("id");
  const idxUrl = cabecalho.indexOf("url");

  if (idxId === -1 || idxUrl === -1) {
    console.error("CSV inesperado. Esperava colunas: id,url");
    process.exit(1);
  }

  const registros = linhas.slice(1).map((linha) => {
    const partes = linha.split(",");
    return { id: partes[idxId].trim(), url: partes[idxUrl].trim() };
  });

  registros.sort((a, b) => a.id.localeCompare(b.id));

  const carimboData = new Date().toISOString().slice(0, 10);
  const baseDir = path.join(process.cwd(), "producao", carimboData);
  const qrsDir = path.join(baseDir, "qrs");
  fs.mkdirSync(qrsDir, { recursive: true });

  console.log(`Gerando ${registros.length} QR codes em ${qrsDir} ...`);

  for (const reg of registros) {
    const arquivo = path.join(qrsDir, `${reg.id}.svg`);
    const qrData = QRCode.create(reg.url, {
      margin: 1,
      errorCorrectionLevel: "M",
    });
    const svg = qrToBambuSvg(qrData, 1);
    fs.writeFileSync(arquivo, svg, "utf8");
    reg.arquivoQr = `qrs/${reg.id}.svg`;
    reg.status = "pendente";
  }

  const cabecalhoManifest = "id,url,arquivo_qr,status\n";
  const linhasManifest = registros
    .map((r) => `${r.id},${r.url},${r.arquivoQr},${r.status}`)
    .join("\n");
  fs.writeFileSync(
    path.join(baseDir, "manifest.csv"),
    cabecalhoManifest + linhasManifest
  );

  console.log(`\nPronto! Arquivos gerados em: ${baseDir}`);
  console.log("- qrs/<id>.svg   -> importar no fatiador, um por peça");
  console.log("- manifest.csv   -> planilha de controle de status por ID");
}

main().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
