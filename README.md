# 🌿 Leaf Doctor · แอป AI ของทีม บน Serverless (Vercel)

ถ่ายรูปด้วยมือถือ → ส่งขึ้น **serverless** → โมเดล Teachable Machine ของทีมทาย → ได้ผลกลับพร้อมคำแนะนำภาษาไทย
บอร์ด **ESP32 + กล้อง** ส่งรูปมาที่ลิงก์เดียวกันได้ (Lab 3)

## เริ่มใช้ใน 3 ขั้น (ไม่ต้องเขียนโค้ด)

**1. เตรียมลิงก์โมเดล**
Teachable Machine → **Export Model** → แท็บ **Tensorflow.js** → **Upload my model** → คัดลอกลิงก์
เช่น `https://teachablemachine.withgoogle.com/models/n9ttWGd77/`

**2. กดปุ่มนี้** (ต้องมีบัญชี GitHub · ไม่ต้องใช้บัตรเครดิต)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FThanappu%2Fleaf-doctor&env=MODEL_URL&envDescription=%E0%B8%A5%E0%B8%B4%E0%B8%87%E0%B8%81%E0%B9%8C%E0%B9%82%E0%B8%A1%E0%B9%80%E0%B8%94%E0%B8%A5%E0%B8%88%E0%B8%B2%E0%B8%81%20Teachable%20Machine&project-name=leaf-doctor&repository-name=leaf-doctor)

- Vercel จะคัดลอกโค้ดไปไว้ใน GitHub ของคุณ
- ช่อง **MODEL_URL** วางลิงก์โมเดลจากขั้นที่ 1 → **Deploy**

**3. รอ 1–2 นาที** ได้ลิงก์ `https://ชื่อ.vercel.app` → เปิดบนมือถือ → ถ่ายรูป


## ปรับให้เป็นของทีม
แก้ไฟล์ `public/config.js` ไฟล์เดียว (กดดินสอ ✏️ บนหน้า GitHub ได้เลย) → Commit → Vercel deploy ใหม่ให้เอง
- `name` ชื่อแอป · `subtitle` คำอธิบาย · `color` สีหลัก
- `advice` ข้อความแนะนำของแต่ละคลาส (ชื่อคลาสต้องตรงกับใน Teachable Machine)

เปลี่ยนโมเดล: Vercel → Project → **Settings → Environment Variables** → แก้ `MODEL_URL` → **Deployments → Redeploy**

## API (สำหรับ ESP32 และโปรแกรมอื่น)
| ทาง | ใช้ทำอะไร |
|---|---|
| `GET /api/health` | เช็กว่าโหลดโมเดลได้ และมีคลาสอะไร |
| `POST /api/predict` JSON `{"image":"<base64 JPEG>"}` | มือถือ / เว็บ |
| `POST /api/predict` body เป็นไฟล์ JPEG (`Content-Type: image/jpeg`) | ESP32-CAM, คอมพิวเตอร์ |
| `POST /api/predict?fmt=rgb565&w=160&h=120` body เป็นภาพดิบ | OV7670 ที่ส่ง JPEG ไม่ได้ (สีเพี้ยน ลอง `fmt=rgb565le` หรือเติม `&bgr=1`) |

ผลที่ได้: `{"label":"ใบเป็นโรค","index":2,"confidence":0.91,"scores":[...],"ms":120,"totalMs":135}`
`totalMs` สูงผิดปกติ = cold start (ฟังก์ชันเพิ่งตื่น ต้องโหลดโมเดลใหม่)

ทดสอบจากคอมพิวเตอร์:
```bash
curl -H "Content-Type: image/jpeg" --data-binary @leaf.jpg https://ชื่อ.vercel.app/api/predict
```

## รันในเครื่องตัวเอง (ใช้เป็น server สำรองในห้องได้)
```bash
npm install
MODEL_URL=ลิงก์โมเดล node dev-server.js     # เปิด http://localhost:3000
```

## ค่าใช้จ่าย (แผน Hobby ของ Vercel · ฟรี)
- เรียกฟังก์ชันได้ 1 ล้านครั้ง/เดือน · CPU ทำงาน 4 ชั่วโมง/เดือน
- ถ้าทายรูปละ ~0.3 วินาที ≈ 48,000 รูป/เดือน
- แผนฟรีสำหรับใช้ส่วนตัว ถ้าทำขายจริงต้องขยับเป็นแผน Pro

## เตรียมรูปเหมือน Teachable Machine
ตัดกลางรูปเป็นสี่เหลี่ยม → ย่อตามขนาดที่โมเดลต้องการ (224×224 หรือ 96×96 ขาวดำสำหรับ Embedded model) → ค่าสี `x/127 − 1`
