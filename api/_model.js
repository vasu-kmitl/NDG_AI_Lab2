// โหลดโมเดล Teachable Machine และทายรูป (ใช้ร่วมกันทุก API)
// ไฟล์ที่ขึ้นต้นด้วย _ ไม่ถูกเปิดเป็น API ของ Vercel
const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-backend-wasm');
const jpeg = require('jpeg-js');

let MODEL_URL = (process.env.MODEL_URL || '').trim();
if (MODEL_URL && !MODEL_URL.endsWith('/')) MODEL_URL += '/';

// เก็บโมเดลไว้ในหน่วยความจำ ครั้งต่อไปที่ฟังก์ชันยังไม่ดับ จะไม่ต้องโหลดใหม่ (warm start)
let cache = null;

async function getModel() {
  if (cache) return cache;
  if (!MODEL_URL) throw new Error('ยังไม่ได้ตั้งค่า MODEL_URL ใน Vercel (Settings → Environment Variables)');
  try { await tf.setBackend('wasm'); } catch (e) { await tf.setBackend('cpu'); }
  await tf.ready();
  const t0 = Date.now();
  const model = await tf.loadLayersModel(MODEL_URL + 'model.json');
  let labels = [];
  try { labels = (await (await fetch(MODEL_URL + 'metadata.json')).json()).labels || []; } catch (e) {}
  const n = model.outputs[0].shape[1];
  if (labels.length !== n) labels = Array.from({ length: n }, (_, i) => labels[i] || `class_${i}`);
  const size = model.inputs[0].shape[1] || 224;
  const channels = model.inputs[0].shape[3] || 3;     // 3 = สี, 1 = ขาวดำ (Embedded model)
  cache = { model, labels, size, channels, loadMs: Date.now() - t0 };
  return cache;
}

// แปลงรูปเป็นพิกเซล RGB: รับ JPEG หรือภาพดิบ RGB565 จาก OV7670
// fmt: rgb565 (ไบต์สูงก่อน) หรือ rgb565le (ไบต์ต่ำก่อน) · bgr=1 สลับสีแดง/น้ำเงิน ถ้าใบไม้ออกมาสีฟ้า
function decode(buf, fmt, w, h, bgr) {
  if (fmt === 'rgb565' || fmt === 'rgb565le') {
    const le = fmt === 'rgb565le';
    if (!w || !h || buf.length < w * h * 2) throw new Error('ภาพ RGB565 ต้องบอก w และ h ให้ตรงกับขนาดข้อมูล');
    const rgb = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      const v = le ? (buf[2 * i + 1] << 8) | buf[2 * i] : (buf[2 * i] << 8) | buf[2 * i + 1];
      const r = ((v >> 11) & 0x1f) * 255 / 31, g = ((v >> 5) & 0x3f) * 255 / 63, b = (v & 0x1f) * 255 / 31;
      rgb[3 * i] = bgr ? b : r; rgb[3 * i + 1] = g; rgb[3 * i + 2] = bgr ? r : b;
    }
    return { width: w, height: h, rgb };
  }
  const img = jpeg.decode(buf, { useTArray: true, formatAsRGBA: false, maxMemoryUsageInMB: 256 });
  return { width: img.width, height: img.height, rgb: img.data };
}

// เตรียมรูปเหมือน Teachable Machine: ตัดกลางเป็นสี่เหลี่ยม → ย่อ → ค่า −1…1
async function predict(buf, opts = {}) {
  const { model, labels, size, channels } = await getModel();
  const t0 = Date.now();
  const { width, height, rgb } = decode(buf, opts.fmt, opts.w, opts.h, opts.bgr);
  const scores = tf.tidy(() => {
    let x = tf.tensor3d(rgb, [height, width, 3]);
    const s = Math.min(width, height);
    x = x.slice([Math.floor((height - s) / 2), Math.floor((width - s) / 2), 0], [s, s, 3]);
    x = tf.image.resizeBilinear(x, [size, size]);
    if (channels === 1) x = x.mean(2, true);
    x = x.toFloat().div(127).sub(1).expandDims(0);
    return model.predict(x).dataSync();
  });
  const ranked = labels.map((l, i) => ({ label: l, index: i, p: Math.round(scores[i] * 1000) / 1000 })).sort((a, b) => b.p - a.p);
  return { label: ranked[0].label, index: ranked[0].index, confidence: ranked[0].p, scores: ranked, ms: Date.now() - t0, size: `${width}x${height}` };
}

module.exports = { getModel, predict };
