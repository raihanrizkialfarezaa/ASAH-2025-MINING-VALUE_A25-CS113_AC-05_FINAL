# 🔧 Panduan Perbaikan Cloudflare Zero Trust Tunnel

## Masalah yang Terjadi

Ketika mengakses aplikasi dari device lain melalui Cloudflare Tunnel, muncul error:

```
localhost:3000/health - Failed to load resource: net::ERR_CONNECTION_REFUSED
localhost:8000/health - Failed to load resource: net::ERR_CONNECTION_REFUSED
localhost:3000/api/v1/auth/login - Failed to load resource: net::ERR_CONNECTION_REFUSED
WebSocket connection to 'wss://mining-supply-chain-a25-cs113.viviashop.com:3001/ws' failed
```

**Penyebab:** Browser di device lain mencoba koneksi ke `localhost` yang tidak ada di device tersebut.

---

## ✅ Solusi Lengkap

### 1. Konfigurasi Environment Variables

Sudah diperbaiki di `.env`:

```env
REACT_APP_API_URL=https://backend-express.viviashop.com/api/v1
REACT_APP_AI_SERVICE_URL=https://fastapi-service.viviashop.com
REACT_APP_WS_URL=wss://mining-supply-chain-a25-cs113.viviashop.com
```

### 2. Build Production (PENTING!)

Development mode (`npm start`) akan tetap mencoba koneksi ke localhost. Anda HARUS menggunakan **production build**:

```powershell
# Masuk ke folder frontend
cd "b:\ASAH FEBE AI\ASAH 2025 MINING VALUE_A25-CS113_AC-05\mining-ops-frontend"

# Build production
npm run build

# Serve production build dengan serve
npx serve -s build -l 3001
```

### 3. Install serve (jika belum ada)

```powershell
npm install -g serve
```

### 4. Update Cloudflare Tunnel Mapping

Pastikan mapping Cloudflare tunnel sudah benar:

| Public Hostname                               | Service                                       |
| --------------------------------------------- | --------------------------------------------- |
| `mining-supply-chain-a25-cs113.viviashop.com` | `http://localhost:3001` (Frontend Production) |
| `backend-express.viviashop.com`               | `http://localhost:3000` (Backend Express)     |
| `fastapi-service.viviashop.com`               | `http://localhost:8000` (FastAPI AI)          |

### 5. Hapus Port dari WebSocket URL

Cloudflare tunnel tidak support WebSocket dengan port eksplisit. WebSocket harus melalui domain utama tanpa port:

**Salah:** `wss://mining-supply-chain-a25-cs113.viviashop.com:3001/ws`
**Benar:** `wss://mining-supply-chain-a25-cs113.viviashop.com/ws`

---

## 🚀 Cara Menjalankan (Updated)

### A. Development Mode (Localhost Only)

```powershell
# Terminal 1 - Backend Express
cd backend-express
npm start

# Terminal 2 - FastAPI
cd mining-ops-ai
.\venv\Scripts\activate
uvicorn api:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3 - Frontend Dev
cd mining-ops-frontend
npm start
```

Akses: `http://localhost:3001` (hanya dari komputer lokal)

---

### B. Production Mode (Cloudflare Tunnel)

```powershell
# Terminal 1 - Backend Express
cd backend-express
npm start

# Terminal 2 - FastAPI
cd mining-ops-ai
.\venv\Scripts\activate
uvicorn api:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3 - Frontend Production Build
cd mining-ops-frontend
npm run build
npx serve -s build -l 3001
```

Akses:

- `https://mining-supply-chain-a25-cs113.viviashop.com` (dari mana saja)
- `https://backend-express.viviashop.com` (API endpoint)
- `https://fastapi-service.viviashop.com` (AI service)

---

## 🔍 Verifikasi

### Cek dari Browser di Device Lain

1. Buka browser di device lain
2. Akses: `https://mining-supply-chain-a25-cs113.viviashop.com`
3. Buka Developer Tools (F12) → Console
4. Seharusnya TIDAK ada error `localhost` lagi

### Cek Network Tab

Di Developer Tools → Network:

- Request ke `/api/v1/auth/login` harus ke `https://backend-express.viviashop.com`
- Request ke AI service harus ke `https://fastapi-service.viviashop.com`
- TIDAK boleh ada request ke `localhost:3000` atau `localhost:8000`

---

## 📝 Catatan Penting

1. **Development vs Production**

   - Development mode (`npm start`) = untuk development lokal saja
   - Production mode (`npm run build`) = untuk diakses dari internet

2. **Environment Variables**

   - `.env` sudah dikonfigurasi untuk production (Cloudflare domains)
   - Jika ingin development, gunakan `.env.local` dengan localhost URLs

3. **CORS Configuration**

   - Backend harus allow origins dari domain Cloudflare
   - Cek `backend-express/.env` → `CORS_ORIGIN` harus include `https://mining-supply-chain-a25-cs113.viviashop.com`

4. **WebSocket**
   - WebSocket melalui Cloudflare tunnel harus menggunakan domain tanpa port
   - Cloudflare secara otomatis route WebSocket ke service yang tepat

---

## 🐛 Troubleshooting

### Masih ada error localhost?

1. **Hard refresh browser:**

   - Chrome: Ctrl + Shift + R
   - Firefox: Ctrl + Shift + R
   - Safari: Cmd + Shift + R

2. **Clear cache:**

   - Buka DevTools → Application → Clear storage → Clear site data

3. **Pastikan menggunakan production build:**

   ```powershell
   # Cek folder build ada
   ls build/

   # Rebuild jika perlu
   npm run build
   ```

### WebSocket masih gagal?

1. **Cek Cloudflare tunnel logs**
2. **Pastikan WebSocket enabled** di Cloudflare dashboard
3. **Hapus port dari WebSocket URL** - Cloudflare tidak support port eksplisit

### CORS error?

Update `backend-express/.env`:

```env
CORS_ORIGIN=https://mining-supply-chain-a25-cs113.viviashop.com,https://backend-express.viviashop.com
```

---

## ✨ Summary

**Sebelum:**

- ❌ Frontend dev mode mencoba konek ke localhost
- ❌ Error di device lain

**Sesudah:**

- ✅ Frontend production build dengan domain Cloudflare
- ✅ Semua request melalui Cloudflare tunnel
- ✅ Bisa diakses dari device mana saja

**Langkah Cepat:**

```powershell
cd mining-ops-frontend
npm run build
npx serve -s build -l 3001
```

Kemudian akses dari device lain: `https://mining-supply-chain-a25-cs113.viviashop.com`
