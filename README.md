# 🐾 NFC TAG PET — Central de Produção e QR Codes SVG

Sistema completo para geração de QR Codes vetoriais em **SVG de alta precisão** para fatiadores 3D (**Bambu Studio**, PrusaSlicer, OrcaSlicer) e controle de estoque de coleiras pet com NFC.

O projeto pode ser usado de duas formas:
1. **Pela Interface Web** (Hospedada na **Vercel** ou local no navegador — não requer Node.js para os operadores).
2. **Via Linha de Comando (CLI)** (Script Node.js direto no terminal).

---

## 🚀 1. Usando a Interface Web (Vercel)

A interface web foi projetada para produção em lote rápida, permitindo:
- **Arrastar e soltar** o arquivo `lote-tags.csv` (ou colar o texto).
- **Pré-visualização em tempo real** dos QR Codes em SVG gerados.
- **Zoom e inspeção vetorial** com detalhes de cada ID e URL.
- **Botão "📦 Baixar Pacote de Produção (.zip)"**: compacta e entrega instantaneamente a pasta `qrs/<id>.svg` e o `manifest.csv`.
- **Download individual de SVG**: baixe qualquer `<id>.svg` com um clique.
- **Gestão interativa de status**: alterne entre `pendente`, `impresso`, `embalado`, `enviado` e `descartado`.
- **100% no navegador (Client-Side)**: rápido, seguro e funciona até mesmo offline.

---

## 💻 2. Usando via Terminal (CLI)

Se preferir processar os arquivos diretamente pelo terminal:

```bash
# 1. Instalar dependências
npm install

# 2. Gerar a produção
node gerar-producao.js lote-tags.csv
# ou via script npm:
npm run gerar lote-tags.csv
```

---

## 📂 Formato do CSV de Entrada

O arquivo `lote-tags.csv` é obtido através do botão **"Baixar CSV para impressão"** no painel `/admin` do Worker.

Estrutura esperada:
```csv
id,url
PET-001,https://nfc.pet/t/PET-001
PET-002,https://nfc.pet/t/PET-002
PET-003,https://nfc.pet/t/PET-003
```

---

## 📦 O que é gerado na Produção

Dentro da pasta (ou arquivo ZIP) `producao/<data-de-hoje>/`:

- **`qrs/<id>.svg`** — um QR vetorial puro por tag, nomeado exatamente pelo próprio ID. Importe cada arquivo no Bambu Studio (ou no seu fatiador) casando o nome do arquivo com a peça — você nunca precisa adivinhar qual QR pertence a qual coleira.
- **`manifest.csv`** — planilha com as colunas `id,url,arquivo_qr,status`. Vá marcando o ciclo de vida da peça:
  $$\text{pendente} \longrightarrow \text{impresso} \longrightarrow \text{embalado} \longrightarrow \text{enviado}$$
  É a fonte única da verdade para seu controle de estoque e rastreabilidade.

---

## ⚠️ Regra de Ouro

> **Se uma peça sair com defeito na impressão 3D, NÃO reimprima com o mesmo ID.**  
> Marque como `descartado` no manifest e gere um lote novo para repor. Isso impede duplicação de códigos físicos e garante total confiabilidade aos tutores dos pets.

---

## 🖨️ Dicas para o Bambu Studio

1. **Importação**: No fatiador, clique com o botão direito na peça base > **Adicionar Peça > SVG**.
2. **Relevo**: Configure a altura do QR Code entre **0.40mm e 0.60mm** (2 a 3 camadas de 0.20mm).
3. **Contraste**: Use base clara (ex: branco) e relevo escuro (ex: preto) para garantir leitura ótica instantânea pela câmera do celular.

---

## 🌐 Publicar na Vercel e Git

### Subir para o GitHub:
```bash
git init
git add .
git commit -m "feat: Central de produção e gerador de QR SVG"
git remote add origin https://github.com/SEU-USUARIO/nfc-tag-pet.git
git branch -M main
git push -u origin main
```

### Deploy na Vercel:
1. Acesse [vercel.com](https://vercel.com) e clique em **Add New > Project**.
2. Selecione o repositório do GitHub.
3. As configurações já estão prontas no arquivo `vercel.json`.
4. Clique em **Deploy**.
