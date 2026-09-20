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
    await QRCode.toFile(arquivo, reg.url, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
    });
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
