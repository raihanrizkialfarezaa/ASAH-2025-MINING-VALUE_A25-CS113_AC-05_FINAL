# Mining Operations AI Decision Support System (DSS)

## Deskripsi Proyek

**Mining Operations AI DSS** adalah platform analitik dan pendukung keputusan berbasis kecerdasan buatan yang dirancang khusus untuk mengoptimalkan rantai pasok operasional pertambangan. Sistem ini mengintegrasikan data _real-time_ dari berbagai titik operasi—mulai dari penggalian (mining), pengangkutan (hauling), hingga pengapalan (shipping)—untuk memberikan wawasan prediktif dan rekomendasi strategis.

Fitur utama meliputi:

- **Prediksi Cerdas**: Menggunakan Machine Learning untuk memprediksi konsumsi bahan bakar, risiko keterlambatan, dan tonase muatan.
- **Optimasi Logistik**: Algoritma untuk alokasi truk dan tongkang yang efisien guna meminimalkan waktu tunggu (queue) dan demurrage.
- **AI Assistant (Chatbot)**: Asisten virtual berbasis LLM (Large Language Model) yang dapat menjawab pertanyaan operasional dan memberikan ringkasan eksekutif.
- **Dashboard Interaktif**: Visualisasi data operasional secara _real-time_ dengan peta interaktif dan grafik performa.

---

## Arsitektur Sistem

Proyek ini terdiri dari tiga layanan utama yang saling terhubung:

1.  **Backend API (Node.js/Express)**: Menangani manajemen data, autentikasi pengguna, dan logika bisnis inti. Menggunakan PostgreSQL sebagai basis data utama.
2.  **AI Service (Python/FastAPI)**: Layanan khusus untuk pemrosesan Machine Learning, simulasi, dan inferensi LLM (menggunakan Ollama atau Google Gemini).
3.  **Frontend (React)**: Antarmuka pengguna yang responsif dan modern untuk memantau operasi dan berinteraksi dengan sistem.

---

## Petunjuk Setup Environment

Sebelum memulai, pastikan perangkat Anda telah memenuhi persyaratan berikut.

### Prasyarat

- **Docker & Docker Compose** (Sangat disarankan untuk kemudahan instalasi).
- **Node.js** (v18 atau lebih baru) - _Jika menjalankan tanpa Docker_.
- **Python** (v3.10 atau lebih baru) - _Jika menjalankan tanpa Docker_.
- **Ollama**: Diperlukan untuk menjalankan model LLM lokal. Unduh di [ollama.com](https://ollama.com).

### Langkah 1: Persiapan Model AI Lokal

Sistem ini menggunakan model `qwen2.5-coder:3b` via Ollama untuk fitur chatbot dan analisis teks.

1.  Instal Ollama.
2.  Buka terminal dan jalankan perintah berikut untuk mengunduh model:
    ```bash
    ollama pull qwen2.5-coder:3b
    ```
3.  Pastikan layanan Ollama berjalan di latar belakang.

### Langkah 2: Konfigurasi Environment Variable

Salin file `.env.example` (jika ada) atau buat file `.env` di setiap folder layanan (`backend-express`, `mining-ops-ai`, `mining-ops-frontend`) sesuai kebutuhan.

**Contoh konfigurasi dasar untuk `backend-express/.env`:**

```env
PORT=5000
DATABASE_URL="postgresql://mining_user:mining_password_secure@localhost:5432/mining_dss?schema=public"
JWT_SECRET="rahasia_super_aman"
AI_SERVICE_URL="http://localhost:8000"
```

---

## Cara Menjalankan Aplikasi

Anda dapat menjalankan aplikasi ini dengan dua cara: menggunakan Docker (Rekomendasi) atau secara manual per layanan.

### Opsi A: Menggunakan Docker (Rekomendasi)

Ini adalah cara termudah karena semua dependensi dan jaringan akan diatur secara otomatis.

1.  Buka terminal di folder root proyek.
2.  Jalankan perintah:
    ```bash
    docker-compose up --build
    ```
3.  Tunggu hingga semua container aktif.
    - **Frontend** dapat diakses di: `http://localhost:3001`
    - **Backend API** berjalan di: `http://localhost:5000`
    - **AI Service** berjalan di: `http://localhost:8000`

### Opsi B: Menjalankan Secara Manual (Development)

Jika Anda ingin mengembangkan atau men-debug layanan tertentu, Anda bisa menjalankannya satu per satu.

#### 1. Database (PostgreSQL)

Pastikan Anda memiliki PostgreSQL yang berjalan dan buat database bernama `mining_dss`. Atau gunakan Docker hanya untuk DB:

```bash
docker-compose up -d postgres
```

#### 2. Backend Service

```bash
cd backend-express
npm install
npx prisma migrate dev  # Migrasi database
npm run dev             # Menjalankan server development
```

#### 3. AI Service

```bash
cd mining-ops-ai
python -m venv venv           # Buat virtual environment
.\venv\Scripts\activate       # Activate venv (Windows)
# source venv/bin/activate    # Activate venv (Mac/Linux)
pip install -r requirements.txt
uvicorn api:app --reload --port 8000
```

#### 4. Frontend Service

```bash
cd mining-ops-frontend
npm install
npm start
```

---

## Informasi Model Machine Learning

Proyek ini menggunakan beberapa model Machine Learning yang telah dilatih sebelumnya (pre-trained) untuk prediksi operasional.

### Lokasi Model

Semua model tersimpan di direktori:
`mining-ops-ai/models/`

Model-model tersebut meliputi:

- `model_delay_probability.joblib`: Memprediksi kemungkinan keterlambatan pengiriman.
- `model_fuel.joblib`: Estimasi konsumsi bahan bakar alat berat.
- `model_load_weight.joblib`: Prediksi berat muatan optimal.
- `model_risiko.joblib`: Analisis risiko operasional.

### Cara Memuat Model

Model dimuat secara otomatis oleh sistem saat **AI Service** dinyalakan. Anda **tidak perlu mengunduh** file tambahan apa pun karena file model (`.joblib`) sudah disertakan dalam repositori ini (committed).

### Melatih Ulang Model (Opsional)

Jika Anda memiliki data baru dan ingin memperbarui model:

1.  Pastikan data baru ada di folder `mining-ops-ai/data/`.
2.  Jalankan skrip pelatihan:
    ```bash
    cd mining-ops-ai
    python train_models.py
    ```
3.  Model baru akan otomatis menimpa file lama di folder `models/`.

---

## Dokumentasi Tambahan

- **API Documentation**: Tersedia di `http://localhost:8000/docs` (Swagger UI) saat AI Service berjalan.
- **Database Schema**: Lihat `backend-express/prisma/schema.prisma` untuk struktur database lengkap.

---

_Dibuat dengan oleh Tim Pengembang Mining Operations AI._
