// POST /api/predict
//   มือถือ: JSON {"image": "<base64 JPEG>"}
//   ESP32 : body เป็นไฟล์ (Content-Type: application/octet-stream หรือ image/jpeg)
//           ภาพดิบจาก OV7670 ให้เติม ?fmt=rgb565&w=160&h=120 (ถ้าสีเพี้ยน ลอง fmt=rgb565le หรือ &bgr=1)
const { predict } = require('./_model');

async function readBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body && typeof req.body === 'object' && req.body.image) {
    return Buffer.from(String(req.body.image).replace(/^data:image\/\w+;base64,/, ''), 'base64');
  }
  if (typeof req.body === 'string' && req.body.length) return Buffer.from(req.body, 'binary');
  const chunks = []; for await (const c of req) chunks.push(c);       // กรณีไม่มีใครอ่าน body ให้
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'ใช้ POST ส่งรูปมา' });
  const t0 = Date.now();
  try {
    const buf = await readBody(req);
    if (!buf.length) return res.status(400).json({ error: 'ไม่พบรูปใน body' });
    const q = req.query || {};
    const out = await predict(buf, { fmt: q.fmt, w: Number(q.w), h: Number(q.h), bgr: q.bgr === '1' });
    out.totalMs = Date.now() - t0;           // รวมเวลาโหลดโมเดลถ้าเป็นการตื่นครั้งแรก (cold start)
    console.log(JSON.stringify({ team: q.team || '', device: q.device || '', label: out.label, conf: out.confidence, ms: out.ms, totalMs: out.totalMs }));
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
