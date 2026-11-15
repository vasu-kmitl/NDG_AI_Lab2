// GET /api/health → เช็กว่าโหลดโมเดลได้ไหม และมีคลาสอะไรบ้าง
const { getModel } = require('./_model');
const tf = require('@tensorflow/tfjs');
module.exports = async (req, res) => {
  try {
    const m = await getModel();
    res.status(200).json({ ok: true, labels: m.labels, inputSize: m.size, channels: m.channels, backend: tf.getBackend(), loadMs: m.loadMs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
