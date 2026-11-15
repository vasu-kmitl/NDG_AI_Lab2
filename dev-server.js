// รันบนเครื่องตัวเอง (ใช้เป็น server สำรองในห้องเรียนได้)
//   npm install  แล้ว  MODEL_URL=ลิงก์โมเดล node dev-server.js  → เปิด http://localhost:3000
// จำลองการทำงานแบบ Vercel: เสิร์ฟไฟล์ใน public/ และเรียกไฟล์ใน api/
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 3000;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  res.status = c => { res.statusCode = c; return res; };
  res.json = o => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); };
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z0-9_-]/gi, '');
    const file = path.join(__dirname, 'api', name + '.js');
    if (!name || name.startsWith('_') || !fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks), ct = req.headers['content-type'] || '';
    req.body = ct.includes('application/json') && raw.length ? JSON.parse(raw) : raw;
    req.query = Object.fromEntries(url.searchParams);
    return require(file)(req, res);
  }
  const f = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
  if (!f.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('Leaf Doctor (dev) → http://localhost:' + PORT));
