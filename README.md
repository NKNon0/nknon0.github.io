# ระบบจัดการคลังสินค้า — Prototype

สิ่งที่รวมมาในโปรเจกต์นี้
- หน้าตา UI ธีมมืด (`index.html`, `styles.css`)
- โปรโตไทป์ระบบผู้ใช้งาน: สมัคร / ล็อกอิน / อนุมัติโดย Admin
- บทบาท (roles): `admin (1)`, `manager (2)`, `staff (3)`
- เพิ่ม / แก้ไข / ลบ สินค้า (localStorage หรือ Firestore)
- บันทึกกิจกรรม (activity log) เก็บใน localStorage และสามารถบันทึกไปที่ Firestore ได้เมื่อเปิดใช้งาน

รันโปรเจกต์แบบง่าย (เครื่องผู้พัฒนา)
1. เปิด terminal ในโฟลเดอร์โปรเจกต์

```powershell
cd "c:\Users\n\OneDrive\Desktop\code\nknon0.github.io"
python -m http.server 8000
```

2. เปิดเบราว์เซอร์ที่: http://localhost:8000
3. บัญชีทดสอบ (local fallback): `admin@example.com` / `admin123` (ถูกสร้างอัตโนมัติ)

การตั้งค่า Firebase (optional — เพื่อยืนยันอีเมลและเก็บข้อมูลจริง)
1. สร้างโปรเจกต์ใน Firebase Console (https://console.firebase.google.com)
2. เปิดเมนู Authentication → Sign-in method → เปิด `Email/Password`
3. เปิดเมนู Firestore Database → สร้างฐานข้อมูลใน `production` หรือ `test` โหมด ตามต้องการ
4. คัดลอก config ของโปรเจกต์ (จากหน้า Project settings)
5. คัดลอก `firebase-config.example.js` เป็น `firebase-config.js` แล้ววางค่า config ตัวอย่างเช่น:

```js
window.firebaseConfig = {
	apiKey: "...",
	authDomain: "your-project.firebaseapp.com",
	projectId: "your-project-id",
	storageBucket: "your-project.appspot.com",
	messagingSenderId: "...",
	appId: "..."
}
```

6. เปิดหน้าเว็บ (ทำตามขั้นตอนรันด้านบน) — ถ้า `firebase-config.js` ถูกตั้งค่า ระบบจะใช้ Firebase สำหรับ:
	 - สมัครผู้ใช้ (จะส่งอีเมลยืนยัน)
	 - บันทึกผู้ใช้ลง Firestore collection `users` (field: name, email, role_id, approved)
	 - บันทึกสินค้าลง collection `products`
	 - บันทึก activity ลง collection `activity`

ความปลอดภัย & ข้อแนะนำสำหรับ production
- ห้ามเก็บรหัสผ่านใน plain text ใน production — ใช้ Firebase Auth หรือ backend ที่เก็บ hash (bcrypt)
- ตั้งกฎ Firestore Security Rules เพื่อให้เฉพาะ Admin สามารถอนุมัติหรือแก้ไข role
- เปิด HTTPS และตั้งค่า CORS หากเรียก API จากโดเมนอื่น

ถ้าต้องการ ผมช่วย:
- ตั้งค่า Firestore Security Rules ตัวอย่างสำหรับ role-based access
- สร้าง backend (Node/Express) พร้อมการยืนยัน JWT และการแฮชรหัสผ่าน
- ปรับ UI ให้ใกล้เคียงสไลด์ของคุณมากขึ้น (เพิ่มรูป ไอคอน สี)

*** หมายเหตุ: ***
- โค้ดปัจจุบันเป็นตัวอย่างเพื่อทดสอบ/สาธิตเท่านั้น ไม่เหมาะกับการใช้งานจริงโดยไม่เสริมความปลอดภัย

Firestore Security Rules (ตัวอย่าง)
1. ไฟล์ตัวอย่างอยู่ที่ `firestore.rules` ในโฟลเดอร์โปรเจกต์นี้
2. เพื่อใช้งาน ให้ติดตั้ง Firebase CLI แล้ว deploy ดังนี้:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
# เลือกไฟล์ rules เป็น firestore.rules
firebase deploy --only firestore:rules
```

Notes:
- กฎตัวอย่างใช้ collection `users` เพื่อเก็บ `role_id` และ `approved` — ต้องมีเอกสารผู้ใช้ที่ตรงกับ `auth.uid` เพื่อให้ฟังก์ชันตรวจสอบ role ทำงาน
- แนะนำตรวจสอบและปรับกฎใน Firebase Console ก่อนใช้งานจริง

ถ้าต้องการ ผมจะ:
- เพิ่มตัวอย่าง `firebase.json` และคำสั่ง deploy ที่ครบถ้วน
- เขียนตัวอย่าง Cloud Functions (optional) เพื่อให้ Admin อนุมัติผู้ใช้แล้วส่งอีเมลอัตโนมัติ

Cloud Functions (ตัวอย่าง)
1. โค้ดตัวอย่างอยู่ในโฟลเดอร์ `functions` — ใช้ `nodemailer` เพื่อส่งอีเมลเมื่อผู้ใช้ถูกอนุมัติ
2. ตั้งค่า SMTP และ FROM ด้วย `firebase functions:config:set` เช่น:

```bash
firebase functions:config:set smtp.host="smtp.example.com" smtp.port="587" smtp.user="you@example.com" smtp.pass="yourpass" from.email="noreply@example.com"
```

3. ติดตั้ง dependencies และ deploy functions:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions,firestore:rules
```

หมายเหตุ: คุณสามารถใช้ SendGrid หรือบริการ SMTP อื่น ๆ — อย่าใส่รหัสผ่านลงใน repo; ให้ตั้งค่าด้วย `firebase functions:config:set` หรือจาก Firebase Console


