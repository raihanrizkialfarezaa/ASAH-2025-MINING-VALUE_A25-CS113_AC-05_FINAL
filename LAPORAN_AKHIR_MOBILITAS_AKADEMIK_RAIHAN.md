# LAPORAN AKHIR MOBILITAS AKADEMIK STUDI INDEPENDEN

**PENGEMBANGAN SISTEM PENDUKUNG KEPUTUSAN BERBASIS KECERDASAN BUATAN UNTUK OPTIMALISASI OPERASI PERTAMBANGAN BATUBARA**

**Mitra Kolaborator:** PT Mining Value Indonesia (Program ASAH 2025)

**Penyusun:**
- Nama Mahasiswa: Raihan Rizki Alfareza
- NIM: [NIM Mahasiswa]

---

**UNIVERSITAS NEGERI SURABAYA**  
**FAKULTAS TEKNIK**  
**PROGRAM STUDI TEKNIK INFORMATIKA**  
**TAHUN 2025**

---

## LEMBAR PENGESAHAN

| Keterangan | Detail |
|:-----------|:-------|
| Judul Kegiatan | Pengembangan Sistem Pendukung Keputusan Berbasis AI untuk Optimalisasi Operasi Pertambangan Batubara |
| Nama Mitra | PT Mining Value Indonesia (ASAH 2025 - Kode: A25-CS113_AC-05) |
| Alamat Instansi | Jakarta, Indonesia |

### Identitas Mahasiswa

| Data | Keterangan |
|:-----|:-----------|
| Nama | Raihan Rizki Alfareza |
| NIM | [NIM Mahasiswa] |
| Prodi/Jurusan | Teknik Informatika |
| Fakultas | Teknik |
| No. Tlp | [Nomor Telepon] |
| Alamat Email | [Email Mahasiswa] |
| Periode Riset | Desember 2025 (4 Minggu) |

### Persetujuan

**Mengetahui,**

| Dosen Pembimbing Lapangan | Mahasiswa |
|:--------------------------|:----------|
| [NAMA DPL] | Raihan Rizki Alfareza |
| NIP. [NIP DPL] | NIM. [NIM Mahasiswa] |

**Menyetujui,**

**Koordinator Program Studi**

[NAMA KOORDINATOR]  
NIP. [NIP KOORDINATOR]

---

## DAFTAR ISI

1. [BAB I PENDAHULUAN](#bab-i-pendahuluan)
2. [BAB II TINJAUAN PUSTAKA](#bab-ii-tinjauan-pustaka)
3. [BAB III METODE STUDI INDEPENDEN](#bab-iii-metode-studi-independen)
4. [BAB IV HASIL DAN PEMBAHASAN](#bab-iv-hasil-dan-pembahasan)
5. [BAB V KORELASI PROGRAM DENGAN KONVERSI MATA KULIAH](#bab-v-korelasi-program-dengan-konversi-mata-kuliah)
6. [BAB VI RENCANA TINDAK LANJUT](#bab-vi-rencana-tindak-lanjut)
7. [BAB VII PENUTUP](#bab-vii-penutup)
8. [DAFTAR PUSTAKA](#daftar-pustaka)
9. [LAMPIRAN](#lampiran)

---

# BAB I PENDAHULUAN

## 1.1 Latar Belakang

Sesi diskusi pertama dengan mentor industri membuka mata saya tentang betapa "brutal"-nya kompleksitas operasional di lapangan. Saya membayangkan tambang bekerja seperti pabrik yang teratur, tapi kenyataannya lebih mirip orkestra yang kacau. Ratusan *dump truck* dan *excavator* bekerja 24 jam non-stop, berjibaku dengan debu dan lumpur. Ironisnya, di tengah dinamika ekstrem ini, keputusan vital yang menyangkut aset miliaran rupiah seringkali diambil hanya bermodalkan intuisi supervisor lapangan.

Ini paradoks yang menarik: alat berat mereka canggih, penuh sensor, tapi datanya "tidur". Terkubur dalam tumpukan laporan manual yang mungkin baru dibaca seminggu kemudian. Dampaknya jelas, inefisiensi di mana-mana. Antrian truk mengular di satu lubang tambang sementara lubang lain sepi. BBM terbuang percuma. Target produksi meleset tanpa ada yang tau persis di mana titik lemahnya.

Belum lagi risiko denda *demurrage* kalau kapal telat *loading*. Angkanya bisa bikin pusing kepala manajemen.

Kondisi inilah yang mendasari inisiatif kami membangun *Mining Operations AI Decision Support System*. Idenya sederhana tapi ambisius: ubah data "tidur" tadi menjadi wawasan yang "berbicara". Kami ingin supervisor punya asisten cerdas yang bisa bilang, "Geser 3 truk ke Pit B sekarang, atau kita bakal telat target."

Kami sadar tantangannya berat. Bukan cuma soal coding, tapi soal membangun sistem yang bisa memproses ribuan sinyal per menit di lingkungan yang koneksinya sering putus-nyambung. Plus, kami mencoba menerapkan *Machine Learning* untuk memprediksi masalah—sesuatu yang jarang disentuh di sistem konvensional.

## 1.2 Tujuan Studi Independen

Saya tidak ingin studi independen ini berakhir sebagai tumpukan kode yang tidak terpakai. Target saya adalah produk yang *production-ready*, sistem yang laik jalan di dunia nyata.

Empat pilar teknis yang saya kejar:
1.  **Arsitektur Microservices:** Memisahkan otak (AI), wajah (Frontend), dan saraf (Backend) biar sistemnya tangguh dan tidak gampang *down*.
2.  **Mesin Prediksi (ML):** Melatih algoritma Random Forest buat nebak tiga hal krusial: boros nggaknya solar, berat muatan aktual, sama risiko delay unit.
3.  **Chatbot RAG:** Bikin fitur tanya-jawab yang "membumi". User bisa nanya pake Bahasa Indonesia biasa, sistem jawab pake data valid dari database.
4.  **Simulasi:** Alat "ruang aman" buat manajemen. Mereka bisa tes strategi gila-gilaan di simulasi sebelum ambil risiko di lapangan.

Buat saya pribadi? Ini ajang pembuktian. Menerapkan teori kuliah di kasus nyata itu sensasinya beda jauh. Saya dipaksa berpikir taktis, efisien, dan pragmatis.

## 1.3 Manfaat Proyek

**Buat PT Mining Value Indonesia:**
Mereka dapet aset intelektual yang solid. Dengan kode dan dokumentasi lengkap yang saya serahkan, ini bisa jadi cikal bakal produk SaaS andalan mereka. Efisiensi yang ditawarkan fitur prediksi kami bisa bernilai penghematan miliaran rupiah per tahun.

**Buat Industri:**
Kalau sistem cerdas model begini jadi standar, wajah operasi tambang bakal berubah. Dari yang reaktif ("tunggu rusak baru teriak") jadi prediktif. Lebih aman, lebih cuan.

**Buat Saya:**
Empat minggu ini adalah kawah candradimuka. Portofolio ini bukti kalau saya bisa *deliver* sistem kompleks, bukan cuma wacana. Skill teknis dan mentalitas kerja profesional yang saya dapet di sini, itu investasi karir terbaik.

---

# BAB II TINJAUAN PUSTAKA

## 2.1 Sistem Pendukung Keputusan (DSS)

DSS itu bukan sekadar nampilin data. Kalau cuma nampilin data, itu namanya *Monitoring Dashboard*. Mengacu konsep Scott Morton, DSS harus punya 'otak' (Model) yang bantu user mikir.

Di proyek ini, kami dorong batasannya jadi *Intelligent DSS*. Otaknya kita ganti pake AI. Jadi dia nggak cuma lapor "Kemarin produksi turun", tapi bisa prediksi "Besok produksi bakal turun kalau kamu nggak nambah truk". Ini bedanya *Insight* dan *Foresight*.

## 2.2 Machine Learning di Pertambangan

Tren ML di tambang memang lagi naik, terutama buat *Predictive Maintenance*. Tapi kami coba masuk ke area operasional.

Kenapa pilih **Random Forest**? Jawabannya pragmatis: data tambang itu 'kotor'. Banyak bolong, banyak *outlier*. Random Forest itu algoritma yang 'badak', nggak manja, dan tahan banting sama data jelek. Dia juga punya fitur *feature importance*, jadi kita bisa jelasin ke orang tambang *kenapa* mesin memprediksi A atau B. Transparansi ini penting buat bangun kepercayaan user.

## 2.3 Teknologi Pengembangan

Kami pilih *stack* teknologi bukan karena ikut tren, tapi karena kebutuhan:
*   **Microservices & Docker:** Biar kalau satu fitur error, aplikasi nggak mati total. Isolasi masalah itu kunci stabilitas.
*   **React + Tailwind:** User di lapangan butuh aplikasi yang *snappy*, cepet, dan responsif di tablet.
*   **Node.js + Prisma:** Backend harus bisa handle ribuan *request* konkuren tanpa *lag*. Model I/O non-blocking Node.js paling pas buat ini.
*   **Python FastAPI:** Pasangan wajib buat Data Science. Cepat, ringkas, dan integrasinya enak.

---

# BAB III METODE STUDI INDEPENDEN

## 3.1 Posisi dan Peran

Di kertas, posisi saya **Lead Full Stack Developer & AI Engineer**. Di lapangan? Saya 'tukang pukul' segala masalah teknis. Mulai dari desain struktur database, nulis API, bikin tampilan, sampe ngajarin model AI belajar.

Peran gado-gado ini memaksa saya ngerti *big picture*. Saya nggak bisa egois cuma mikirin kode yang rapi, saya harus mikir gimana kode itu nyelesain masalah bisnis mitra. Mentor saya bertindak sebagai 'klien' yang kritis, memastikan tiap fitur yang saya bikin emang ada gunanya.

## 3.2 Rancangan Sistem

Sistemnya kami desain modular. Tiga komponen utama jalan di kontainer masing-masing:

**1. Backend (Node.js):**
Pusat komando. Dia yang ngatur siapa boleh masuk (auth), nyatet transaksi, dan jaga integritas data.

**2. Frontend (React.js):**
Jendela user. Fokusnya di visualisasi yang intuitif. Dia nggak nyimpen data, tugasnya cuma nampilin apa yang dikirim backend dengan cara yang enak dilihat.

**3. AI Service (Python):**
Laboratorium hitung. Di sini model ML jalan, simulasi diputar, dan pertanyaan chatbot diproses.

### Database Schema

Jantung sistem ini ada di schema database PostgreSQL-nya. Ada 29 tabel yang saling mengunci.
*   **`HaulingActivity`**: Ini tabel paling 'gemuk'. Dia rekam detail ritase truk. Detik truk datang, antri, muat, jalan, buang—semua tercatat. Plus, prediksi risiko dari AI juga disimpen di sini buat audit.
*   **`ProductionRecord`**: Rapor harian. Target vs Realisasi.
*   **`WeatherLog`**: Data cuaca realtime. Ini penentu *Go/No-Go* operasi demi keselamatan.

## 3.3 Bedah Teknis Implementation

### Backend (Express.js)
Saya pake pola **MVC** biar kode nggak berantakan. Lihat aja `hauling.controller.js`. Satu fungsi transaksi hauling itu kerjanya borongan: validasi input, cek status alat, 'nelpon' AI minta prediksi risiko, baru simpen ke DB. Semuanya harus sukses atau batal semua (*atomic transaction*), biar data nggak korup.

### Frontend (React)
User Experience adalah raja. Peta digital pake `Leaflet` itu fitur favorit. Kita bisa liat posisi alat gerak-gerak di peta. Komunikasi ke backend juga kita bikin efisien, token auth otomatis nempel di tiap request biar kode nggak repetitif.

### AI Service (Python)
Bagian favorit saya.
1.  **Training Model:** Data mentah kita cuci dulu. Fitur numerik distandarisasi, kategori di-*encode*. Baru kita suapin ke Random Forest. Model yang jadi disimpen (*pickle*) biar pas dipake nggak perlu training ulang.
    
2.  **RAG Chatbot:**
    Ini bukan chatbot 'halu'. Dia punya logika *Entity Extraction*. Kalau user tanya "Produksi truk A kemarin", dia pinter ambil ID 'Truk A' dan tanggal 'Kemarin', terus bikin query SQL sendiri. Jawaban yang keluar itu fakta data, bukan karangan AI.

3.  **Simulasi:**
    Pake `SimPy`. Kita bisa bikin dunia virtual buat ngetes skenario. "Kalau hujan deres dan 5 truk mogok, antrian jadi seberapa panjang?". Sistem bisa jawab.

## 3.4 Refleksi Tantangan

Integrasi beda bahasa (Node.js ketemu Python) itu ternyata *tricky*. Tipe data JSON sering bikin masalah. Tapi justru di situ seninya *debugging*.

Pelajaran terpenting? **Pemahaman Bisnis**. Saya jadi sadar, kode canggih nggak ada gunanya kalau nggak nyelesain masalah user. Di tambang, efisiensi 1% itu nilainya miliaran. Paham konteks ini bikin saya ngerasa kerjaan saya punya *impact* nyata.

---

# BAB IV HASIL DAN PEMBAHASAN

## 4.1 Backend API

Backend kita tangguh. Ada 50+ endpoint yang siap digempur. Fitur hauling yang kompleks tadi tereksekusi dalam hitungan milidetik. Kami sempat tes beban (*Stress Test*), backend masih senyum nahan 200 request/detik. Buat satu site tambang, ini lebih dari cukup.

## 4.2 Frontend Dashboard

Tampilannya modern.
*   **Dashboard Utama:** Angka statistik gerak *live*. Peta digital ngasih *spatial awareness* yang jelas buat supervisor.
*   **Fleet Mgmt:** Status alat ditampilin pake grid warna-warni. Unit *Breakdown* merah menyala, mustahil kelewat mata.
*   **Safety:** Info cuaca real-time. Kalau badai, layar ngasih peringatan gede. Safety first!

## 4.3 Analisis Model AI

**1. Machine Learning:**
*   **Prediksi BBM:** Meleset dikit, rata-rata cuma **1.3 liter**. Sangat bisa dipake buat audit logistik.
*   **Prediksi Muatan:** Ini bintangnya. Error cuma **1.6 ton**. Supervisor bisa deteksi truk yang muatannya 'banci' (di bawah standar) tanpa perlu jembatan timbang.
*   **Klasifikasi Delay:** Akurasi **90%**, tapi AUC **0.50**. Angka AUC rendah ini jujur karena datanya jomplang (*imbalanced*). Delay itu kejadian jarang, jadi model agak bias ke "lancar". Ini PR buat kumpulin data delay lebih banyak.

**2. Chatbot:**
Kerja sesuai harapan. Dia bisa jawab pertanyaan spesifik kayak "Bandingkan produksi shift 1 dan 2 kemarin". Jawabannya presisi karena *grounding*-nya ke database, bukan ke *knowledge* umum LLM.

## 4.4 Pengujian

Kami protektif soal kualitas. Pengujiannya sadis:
1.  **Functional:** Coba input data sampah, sistem harus nolak dengan sopan.
2.  **End-to-End:** Simulasi user dari login sampe logout. Harus mulus, nggak boleh ada *glitch*.
3.  **Deployment:** Tes nyalain semua kontainer barengan. Mereka harus bisa ngobrol satu sama lain tanpa error jaringan.

## 4.5 Evaluasi Kinerja

Sistem sudah **Production Ready**. Arsitektur Microservices terbukti bikin hidup lebih mudah—update AI nggak perlu matiin Backend. Fleksibilitas ini mahal harganya.

Kekurangannya? Service AI lumayan rakus RAM buat ngeload model. Server produksi nanti butuh spek lumayan. Tapi *trade-off* ini wajar buat performa yang didapet.

---

# BAB V KORELASI AKADEMIK

Proyek ini bukan main-main, korelasinya kuat banget sama kurikulum:

## 5.1 Implementasi Proyek (4 SKS)
Ini bukti keringat saya. 4 SKS ini representasi ratusan jam ngoding, *debugging*, dan pusing mikirin arsitektur. Output repositori GitHub dan aplikasi yang jalan adalah bukti otentik kompetensi *Software Engineering* saya.

## 5.2 Metodologi Penelitian Terapan (3 SKS)
Saya nggak ngasal pilih model AI. Ada proses ilmiahnya: studi literatur, eksperimen data, evaluasi metrik, dan analisis kritis hasilnya. Transparansi soal kelemahan model (AUC rendah) adalah bukti integritas ilmiah.

## 5.3 Manajemen Proyek Lapangan (3 SKS)
*Deadline* 4 minggu itu gila. Saya belajar manage waktu, prioritas fitur pake metode **Agile**, dan komunikasi intens sama mentor. *Skill* manajemen ini nggak diajarin di buku, cuma dapet di lapangan.

## 5.4 Perencanaan Program (2 SKS)
Menerjemahkan curhatan user ("Truk suka antri") jadi spesifikasi teknis ("Algoritma limit antrian") itu inti matkul ini. Dokumen SRS dan ERD adalah produk nyatanya.

## 5.5 Evaluasi Program (2 SKS)
Validasi dari mentor kalau fitur ini berguna, itulah evaluasi sebenernya. Bukan cuma kode jalan, tapi kodenya nyelesain masalah.

## 5.6 Inovasi Produk (2 SKS)
Mengawinkan Dashboard, Prediksi AI, dan Chatbot dalam satu atap itu inovasinya. Biasanya tools ini terpisah-pisah.

## 5.7 Komunikasi Ilmiah (2 SKS)
Laporan ini dan presentasi mingguan melatih saya jelasin hal teknis yang rumit ke bahasa manusia. Skill komunikasi ini vital buat karir IT.

## 5.8 Etika Profesional (2 SKS)
Saya pegang teguh kerahasiaan data mitra. Data laporan ini semua *dummy*. Etika kerja dan komunikasi profesional juga selalu saya jaga.

---

# BAB VI RENCANA TINDAK LANJUT

Diskusi dengan mitra sudah menghasilkan peta jalan:

**Jangka Pendek (1-3 Bulan): Pilot Test**
Tes lapangan terbatas. Validasi ergonomi aplikasi. Tombol kekecilan nggak? Layar kebaca nggak di bawah matahari terik? *Feedback* user lapangan adalah raja.

**Jangka Menengah (3-6 Bulan): Fitur Tambahan**
1.  **Full IoT:** Koneksi langsung ke GPS Tracker truk biar lokasi otomatis *real-time*, nggak perlu input manual.
2.  **Mobile App:** Bikin aplikasi Android buat supir biar input status semudah update status WA.

**Jangka Panjang (6-12 Bulan): Komersialisasi**
Mitra mau jual ini jadi SaaS. Perlu fitur *Multi-tenancy* biar satu server bisa layanin banyak perusahaan dengan aman.

Secara teknis, saya saranin migrasi kode ke **TypeScript** kalau tim developernya nambah, biar kodenya lebih *robust* dan gampang dimaintain.

---

# BAB VII PENUTUP

Studi independen ini adalah titik balik. Saya masuk sebagai mahasiswa yang taunya teori coding, keluar sebagai *engineer* yang paham solusi bisnis. Sistem *Mining Operations AI DSS* ini bukti kalau teknologi canggih itu alat yang ampuh buat efisiensi industri, bukan cuma mainan laboratorium.

Fondasi sistem ini sudah solid. Bersih, modular, dan cerdas. Ini kontribusi terbaik yang bisa saya berikan untuk PT Mining Value Indonesia.

Terima kasih tak terhingga buat Dosen Pembimbing dan Mentor Industri atas ilmunya. Semoga karya kecil ini bisa jadi awal dari inovasi besar lainnya.

---

# DAFTAR PUSTAKA

1. Chanda, E. K., & Dagdelen, K. (2017). *Optimal Truck Dispatch in Open Pit Mines*. Mining Engineering, 69(10), 25-31.
2. Elbrond, J. (1990). *Trends in Surface Mine Planning*. CIM Bulletin, 83(934), 59-62.
3. Munirathinam, M., & Yingling, J. C. (1994). *A Review of Computer-Based Truck Dispatching Strategies*. International Journal of Surface Mining, 8(1), 1-15.
4. Scott Morton, M. S. (1971). *Management Decision Systems: Computer-Based Support for Decision Making*. Harvard University Press.
5. He, J. (2020). *Microservices Architecture: Principles and Practices*. O'Reilly Media.
6. Breiman, L. (2001). *Random Forests*. Machine Learning, 45(1), 5-32.
7. Lewis, P. (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*. NeurIPS Proceedings.

---

# LAMPIRAN

## Lampiran 1: Struktur Repository Project

```text
ASAH 2025 MINING VALUE_A25-CS113_AC-05/
├── backend-express/           (Service 1: Backend API)
│   ├── src/
│   │   ├── controllers/       (16 file logika bisnis)
│   │   ├── routes/            (17 file definisi endpoint)
│   │   ├── services/          (Integrasi AI bridge)
│   │   ├── middleware/        (Auth JWT, Validation)
│   │   └── utils/             (Helper functions)
│   ├── prisma/
│   │   ├── schema.prisma      (Definisi 29 Tabel Database)
│   │   └── seed/              (Data awal untuk testing)
│   └── Dockerfile             (Konfigurasi container Node)
├── mining-ops-frontend/       (Service 2: Dashboard UI)
│   ├── src/
│   │   ├── pages/             (14 Halaman React)
│   │   ├── components/        (Widget, Maps, Charts)
│   │   ├── services/          (Axios API Client)
│   │   └── theme.js           (Konfigurasi Tailwind)
│   └── Dockerfile
├── mining-ops-ai/             (Service 3: ML & Chatbot)
│   ├── api.py                 (FastAPI Entry Point)
│   ├── chatbot.py             (Logic RAG & NLP - 3000+ lines)
│   ├── train_models.py        (Script pelatihan Random Forest)
│   ├── models/                (File .joblib tersimpan)
│   └── Dockerfile
└── docker-compose.yml         (Orkestrasi seluruh service)
```

## Lampiran 2: Credentials untuk Testing

**Akun Administrator:**
*   **Email:** `admin@mining.com`
*   **Password:** `password123`
*   **Role:** ADMIN

**Akun Supervisor:**
*   **Email:** `supervisor1@mining.com`
*   **Password:** `password123`
*   **Role:** SUPERVISOR

**Laporan Akhir Studi Independen Tahun 2025**
