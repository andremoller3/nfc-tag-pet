const QRCode = require('../node_modules/qrcode/lib/core/qrcode');
const SvgRenderer = require('../node_modules/qrcode/lib/renderer/svg-tag');

function toString(text, opts) {
  const options = Object.assign({ margin: 1, errorCorrectionLevel: 'M' }, opts);
  const data = QRCode.create(text, options);
  return SvgRenderer.render(data, options);
}

const api = {
  create: QRCode.create,
  toString: toString
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
