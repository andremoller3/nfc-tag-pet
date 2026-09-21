const QRCode = require('../node_modules/qrcode/lib/core/qrcode');

// Gera SVG 100% vetorial fechado compatível com Bambu Studio, OrcaSlicer e PrusaSlicer:
// - Sem retângulo de fundo (evita extrusão de bloco sólido no fatiador 3D)
// - Polígonos 2D fechados (M x,y h w v 1 h -w z) com preenchimento (fill) em vez de traços 1D (stroke)
function qrToBambuSvg(qrData, margin = 1) {
  const size = qrData.modules.size;
  const totalSize = size + margin * 2;
  let d = '';

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

function toString(text, opts) {
  const options = Object.assign({ margin: 1, errorCorrectionLevel: 'M' }, opts);
  const data = QRCode.create(text, options);
  return qrToBambuSvg(data, options.margin !== undefined ? options.margin : 1);
}

const api = {
  create: QRCode.create,
  toString: toString,
  qrToBambuSvg: qrToBambuSvg
};

if (typeof window !== 'undefined') {
  window.QRCode = api;
  window.QRCodeSvg = api;
}
if (typeof globalThis !== 'undefined') {
  globalThis.QRCode = api;
  globalThis.QRCodeSvg = api;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}

