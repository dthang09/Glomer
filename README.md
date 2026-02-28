# Glomer — Palace Museum 🏛

Trang web bảo tàng cung điện 3D. Mọi người đều có thể xem, tải ảnh lên và tải ảnh về.

---

## 🚀 Mở trang web (Demo ngay)

Chỉ cần mở file `index.html` trong trình duyệt Chrome hoặc Edge.

**Chế độ Demo** (không cần Firebase): Dữ liệu lưu trên máy tính của bạn (`localStorage`).  
**Chế độ Chia sẻ** (nhiều người dùng): Cần cấu hình Firebase (xem bên dưới).

---

## 🔥 Cấu hình Firebase (nhiều người dùng, real-time)

### Bước 1: Tạo dự án Firebase (miễn phí)
1. Vào [https://console.firebase.google.com](https://console.firebase.google.com)
2. Nhấn **"Add project"** → đặt tên → tạo dự án

### Bước 2: Thêm Web App
1. Vào dự án → nhấn biểu tượng `</>` (Web)
2. Đặt tên app → nhấn **Register app**
3. Sao chép phần `firebaseConfig` (có các trường `apiKey`, `projectId`, v.v.)

### Bước 3: Bật Firestore Database
1. Sidebar → **Firestore Database** → **Create database**
2. Chọn **Start in test mode** → chọn vùng → **Enable**

### Bước 4: Bật Storage
1. Sidebar → **Storage** → **Get started**
2. Chọn **Start in test mode** → **Done**

### Bước 5: Điền config vào `js/config.js`
Mở file `js/config.js` và thay thế:
```js
export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",       // ← dán API key của bạn
  authDomain:        "ten-du-an.firebaseapp.com",
  projectId:         "ten-du-an",
  storageBucket:     "ten-du-an.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc..."
};
```

### Bước 6: Mở lại `index.html` → Done! 🎉

---

## 🎮 Cách sử dụng

| Hành động | Phím / Thao tác |
|---|---|
| Di chuyển trong cung điện | `W A S D` |
| Nhìn xung quanh | Di chuột |
| Tương tác với hiện vật | Click vào khung/tủ |
| Tải ảnh lên | Click "Tải ảnh lên" trong hộp xem |
| Lật xem mô tả | Click "📝 Mô tả →" |
| Lưu mô tả | Click "💾 Lưu mô tả" |
| Tải ảnh về máy | Click "⬇ Tải về" |
| Dừng chuột / Thoát hộp | `ESC` |
| Di chuyển giữa các phòng | Nút nav bên dưới hoặc đi qua cửa |

---

## 🗺 Sơ đồ các phòng

```
        [Phòng Điêu Khắc]
               ↑
[Phòng Tranh] ← [Đại Sảnh] → [Phòng Hiện Vật]
               ↓
         [Phòng Lưu Trữ]
```

Mỗi phòng có **40 vị trí** trưng bày = 200 vị trí tổng cộng.

---

## 📁 Cấu trúc thư mục

```
Glomer/
├── index.html
├── README.md
├── css/style.css
└── js/
    ├── main.js         # Three.js chính
    ├── palace.js       # Ngoại thất cung điện
    ├── museum.js       # 5 căn phòng
    ├── exhibits.js     # 200 vị trí hiện vật
    ├── flipcard.js     # Thẻ ảnh 3D flip
    ├── ui.js           # HUD helpers
    ├── firebase-db.js  # Firebase CRUD
    └── config.js       # ← Điền Firebase config vào đây
```
