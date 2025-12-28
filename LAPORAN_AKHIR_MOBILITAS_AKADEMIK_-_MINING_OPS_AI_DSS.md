LAPORAN AKHIR MOBILITAS AKADEMIK

Judul Kegiatan/Proyek: Mining Operations AI Decision Support System (DSS) – Integrasi Backend Operasional Tambang, Dashboard Frontend, dan AI/ML Service

Nama: [TULIS NAMA ANDA]

NIM: [TULIS NIM ANDA]

Program Studi: [TULIS PRODI]

Fakultas/Universitas: [TULIS FAKULTAS & UNIVERSITAS]

Dosen Pembimbing: [TULIS NAMA DOSBING]

Mitra/Instansi (Studi Kasus): Operasional Tambang Batubara (Pit–Hauling–Port)

Periode Mobilitas: [BULAN–BULAN, TAHUN]

Tanggal Penyusunan Laporan: 22 Desember 2025

---

LEMBAR PENGESAHAN

Laporan Akhir Mobilitas Akademik ini disusun sebagai pemenuhan keluaran kegiatan dan telah diperiksa serta disetujui untuk dipertanggungjawabkan secara akademik.

Nama Mahasiswa: [NAMA ANDA]

NIM: [NIM ANDA]

Program Studi: [PRODI]

Judul: Mining Operations AI Decision Support System (DSS)

Disahkan pada: [KOTA], [TANGGAL]

Dosen Pembimbing: [NAMA DOSBING] **\*\*\*\***\_\_\_\_**\*\*\*\***

Mahasiswa: [NAMA ANDA] **\*\*\*\***\_\_\_\_**\*\*\*\***

---

KATA PENGANTAR

Puji syukur saya panjatkan kepada Tuhan Yang Maha Esa karena atas rahmat dan karunia-Nya, saya dapat menyelesaikan Laporan Akhir Mobilitas Akademik ini. Laporan ini saya susun sebagai dokumentasi akademik dan teknis atas kegiatan pengembangan sebuah sistem pendukung keputusan (Decision Support System/DSS) untuk operasi pertambangan batubara. Sistem yang dikembangkan memadukan pengelolaan data operasional, analitik, dan layanan kecerdasan buatan sehingga proses pengambilan keputusan terkait produksi, hauling, serta risiko keterlambatan logistik dapat dilakukan secara lebih terstruktur dan berbasis data.

Selama pelaksanaan dan penyusunan laporan, saya mendapatkan arahan, masukan, serta dukungan yang sangat berarti. Oleh sebab itu, saya menyampaikan terima kasih kepada dosen pembimbing yang memberikan penguatan akademik pada perumusan masalah dan metodologi, serta membantu memastikan bahwa implementasi yang dibangun dapat dipertanggungjawabkan. Saya juga berterima kasih kepada rekan diskusi yang membantu melakukan review pengujian dan validasi alur integrasi antarlayanan.

Saya menyadari laporan ini belum sempurna. Namun, saya berupaya menuliskan secara sistematis, logis, dan rinci, serta menautkan uraian pembahasan dengan implementasi nyata pada capstone project yang saya kerjakan. Saya berharap laporan ini dapat digunakan sebagai bukti pelaksanaan kegiatan sekaligus menjadi bahan evaluasi untuk pengembangan sistem pada tahap berikutnya.

[Kota], [Tanggal]

[Nama Anda]

---

ABSTRAK

Operasi pertambangan batubara memiliki kompleksitas tinggi karena melibatkan rantai proses yang saling terkait, mulai dari aktivitas produksi di pit, pemuatan di titik loading, pengangkutan melalui rute hauling, hingga penumpukan/penyaluran di dumping point dan keterkaitan dengan jadwal kapal di pelabuhan. Pada praktiknya, keputusan operasional banyak dipengaruhi oleh variabilitas cuaca, kondisi jalan, ketersediaan alat (truck dan excavator), kompetensi operator, status maintenance, antrean di titik layanan, serta potensi demurrage akibat keterlambatan kapal. Kondisi tersebut menuntut sistem informasi yang mampu mengintegrasikan data operasional, menyediakan pemantauan (monitoring) yang mudah dipahami, serta memberi dukungan analitik dan rekomendasi strategi secara cepat.

Laporan ini memaparkan pengembangan Mining Operations AI Decision Support System (DSS), yaitu platform terintegrasi yang terdiri atas backend API berbasis Express.js dan Prisma ORM pada PostgreSQL, frontend dashboard berbasis React yang mendukung role-based access control serta kemampuan Progressive Web App (PWA), dan AI/ML service berbasis FastAPI yang memuat model prediksi (joblib) serta menyediakan rekomendasi strategi top-3 berbasis skenario (what-if). Pada sisi AI, sistem juga menyediakan chatbot operasional yang menggunakan Ollama sebagai penyedia Large Language Model (LLM) lokal, dengan mekanisme degradasi yang tetap menjaga layanan berjalan saat LLM tidak tersedia.

Hasil pengembangan menunjukkan bahwa sistem mampu mengelola data operasional (alat, operator, lokasi, hauling, maintenance, cuaca, produksi, kapal dan jadwal), menyediakan analitik dashboard, serta mengorkestrasi integrasi AI melalui proxy dan sinkronisasi data berkala. Backend menjalankan job sinkronisasi data untuk mengekspor dataset operasional ke AI service, sehingga rekomendasi dan analisis hauling dapat menggunakan data yang selalu diperbarui. Sistem ini diharapkan menjadi fondasi yang kuat untuk pengambilan keputusan operasional yang lebih terukur, transparan, dan dapat diaudit.

Kata kunci: decision support system, mining operations, Express.js, Prisma, PostgreSQL, React, FastAPI, machine learning, Ollama, LLM

---

# DAFTAR TABEL

| Nomor   | Judul Tabel                                                                     | Keterangan Halaman          |
| ------- | ------------------------------------------------------------------------------- | --------------------------- |
| Tabel 1 | Ringkasan layanan dan port pada arsitektur sistem                               | Menyesuaikan layout dokumen |
| Tabel 2 | Ringkasan entitas utama pada skema database operasional                         | Menyesuaikan layout dokumen |
| Tabel 3 | Ringkasan endpoint AI/ML service dan tujuan fungsional                          | Menyesuaikan layout dokumen |
| Tabel 4 | Korelasi kegiatan capstone dengan capaian pembelajaran dan konversi mata kuliah | Menyesuaikan layout dokumen |
| Tabel 5 | Skenario pengujian integrasi dan kriteria keberhasilan                          | Menyesuaikan layout dokumen |

---

# DAFTAR GAMBAR

| Nomor    | Judul Gambar                                                                                | Keterangan Halaman          |
| -------- | ------------------------------------------------------------------------------------------- | --------------------------- |
| Gambar 1 | Arsitektur sistem Mining Ops AI DSS (Frontend–Backend–DB–AI–LLM)                            | Menyesuaikan layout dokumen |
| Gambar 2 | Diagram alur data operasional hingga rekomendasi strategi                                   | Menyesuaikan layout dokumen |
| Gambar 3 | Contoh alur hauling activity (loading → hauling → dumping) sebagai dasar statistik produksi | Menyesuaikan layout dokumen |
| Gambar 4 | Alur sinkronisasi data (daily export dan hourly incremental sync)                           | Menyesuaikan layout dokumen |
| Gambar 5 | Skema role-based routing pada frontend dashboard                                            | Menyesuaikan layout dokumen |

---

# BAB I PENDAHULUAN

## 1.1 Latar Belakang

Industri pertambangan batubara merupakan salah satu sektor dengan karakteristik operasional yang dinamis dan sangat bergantung pada koordinasi sumber daya. Pada level lapangan, aktivitas produksi tidak dapat dipandang sebagai aktivitas tunggal di area pit, melainkan sebagai rangkaian proses yang terhubung dan saling mempengaruhi. Target produksi harian ditentukan oleh sinkronisasi excavator pada titik loading, ketersediaan truck untuk hauling, kondisi dan panjang rute, performa operator, serta kesiapan dumping point sebagai titik layanan berikutnya. Di sisi hilir, jadwal kapal dan batas waktu pemuatan (ETS/ETA) dapat memicu biaya demurrage apabila terjadi keterlambatan pasokan material. Akumulasi keterlambatan kecil, seperti antrean pada loading point, perubahan kondisi jalan karena hujan, atau downtime akibat breakdown, pada akhirnya berkontribusi langsung terhadap penurunan produktivitas, kenaikan konsumsi bahan bakar, dan peningkatan biaya operasional.

Pada konteks tersebut, kebutuhan utama bukan sekadar pencatatan data, tetapi integrasi data yang memungkinkan evaluasi performa, penelusuran sebab-akibat, serta dukungan pengambilan keputusan yang dapat menjawab pertanyaan seperti “strategi kombinasi alat seperti apa yang paling efisien untuk kondisi jalan tertentu” atau “berapa risiko keterlambatan ketika target produksi dinaikkan pada shift tertentu”. Kebutuhan ini semakin menguat ketika operasi harus beradaptasi terhadap ketidakpastian dan keterbatasan data real-time di lapangan. Karena itu, pendekatan sistem pendukung keputusan berbasis data, prediksi, dan rekomendasi menjadi relevan.

Berangkat dari kebutuhan tersebut, saya membangun Mining Operations AI Decision Support System (DSS), sebuah capstone project yang mengintegrasikan backend operasional, frontend dashboard, dan layanan AI/ML. Sistem ini dirancang untuk mengelola data inti operasi tambang dan menyediakan rekomendasi strategi top-3 berbasis parameter lapangan serta parameter finansial. Selain itu, sistem menyediakan chatbot operasional yang mempermudah akses informasi dan ringkasan berbasis data.

## 1.2 Identifikasi Masalah

Permasalahan yang diidentifikasi pada domain ini berangkat dari kondisi umum operasional yang data dan pengambilan keputusannya sering tersebar. Pertama, data alat, operator, hauling, maintenance, cuaca, produksi, dan jadwal kapal sering berada pada sumber berbeda sehingga sulit dilakukan konsolidasi. Kedua, pemilihan strategi operasi (jumlah truck, jumlah excavator, pemilihan rute, serta prioritas aktivitas) cenderung didorong oleh intuisi dan pengalaman, sementara bukti data dan analitik yang bisa diaudit belum selalu tersedia. Ketiga, perubahan cuaca dan kondisi jalan membuat parameter operasi berubah cepat, sehingga diperlukan dukungan analitik yang adaptif. Keempat, integrasi AI/ML sering gagal di tahap implementasi karena data training tidak tersinkronisasi dengan data operasional aktual. Kelima, sistem yang terintegrasi membutuhkan kontrol akses yang tegas agar aktivitas operasional dapat tertib dan aman.

## 1.3 Rumusan Masalah

Rumusan masalah penelitian terapan pada capstone ini difokuskan pada bagaimana merancang dan membangun sebuah sistem terintegrasi yang mampu mengelola data operasional tambang sekaligus menyediakan dukungan keputusan berbasis AI/ML. Secara lebih spesifik, masalah utama yang dijawab adalah bagaimana membangun backend yang aman dan terstruktur untuk manajemen data, bagaimana mendesain AI/ML service yang mampu menghasilkan rekomendasi strategi dan analisis hauling berbasis data, bagaimana mengintegrasikan chatbot operasional yang mampu menangani pertanyaan berbasis konteks, serta bagaimana menerapkan deployment yang dapat direplikasi secara konsisten.

## 1.4 Tujuan

Tujuan kegiatan ini adalah menghasilkan sistem yang dapat dipakai sebagai fondasi pengambilan keputusan operasional berbasis data. Tujuan teknisnya mencakup pembangunan API backend yang mendukung operasi CRUD dan analitik, pembangunan AI service yang memuat model prediksi dan menyediakan rekomendasi strategi top-3, serta pembangunan frontend dashboard yang menerapkan otorisasi berbasis peran. Tujuan integrasinya adalah memastikan tersedianya mekanisme sinkronisasi data backend ke dataset AI sehingga proses analitik dan rekomendasi tidak terputus dari kondisi data terbaru.

## 1.5 Manfaat

Manfaat sistem ini diposisikan bagi beberapa peran. Bagi supervisor dan dispatcher, sistem membantu mempercepat penilaian kondisi operasi dan pemilihan strategi melalui rekomendasi top-3 yang dapat dibandingkan secara transparan. Bagi operator, sistem memberikan alur kerja yang lebih jelas untuk aktivitas hauling dan pencatatan status. Bagi maintenance staff, sistem memudahkan pemantauan status alat dan catatan pemeliharaan. Bagi manajemen, sistem menyediakan ringkasan performa dan jejak audit keputusan melalui log rekomendasi dan interaksi AI.

## 1.6 Ruang Lingkup

Ruang lingkup capstone ini meliputi tiga komponen utama, yaitu backend Express API, AI/ML service berbasis FastAPI, dan frontend dashboard berbasis React. Database menggunakan PostgreSQL dengan Prisma ORM sebagai penghubung. Sistem menyediakan pengelolaan entitas operasional utama seperti truck, excavator, operator, lokasi, hauling activity, maintenance, weather, production, serta modul kapal dan jadwal. Pada sisi AI, sistem memuat model prediksi dan menyediakan rekomendasi strategi serta chatbot.

## 1.7 Batasan

Sistem AI pada implementasi ini memanfaatkan dataset hasil ekspor CSV dari database sebagai sumber data analitik, sehingga bukan berbasis event streaming real-time. Namun, batasan ini diimbangi dengan mekanisme incremental sync agar data dinamis seperti hauling activity tetap diperbarui dengan frekuensi jam-an. Selain itu, chatbot memanfaatkan integrasi Ollama sebagai LLM lokal; ketika LLM tidak tersedia, sistem tetap berjalan dengan strategi degradasi agar komponen lain tidak terhenti.

## 1.8 Sistematika Penulisan

Sistematika laporan mengikuti format laporan akademik pada mobilitas, dimulai dari Bab I Pendahuluan, dilanjutkan dengan Bab II Tinjauan Pustaka yang memaparkan landasan teori dan teknologi, Bab III Metode yang menjelaskan pendekatan perancangan dan implementasi, Bab IV Hasil dan Pembahasan yang menguraikan hasil pembangunan sistem dan evaluasinya, Bab V yang mengaitkan kegiatan dengan program studi serta konversi mata kuliah, Bab VI yang memuat rencana tindak lanjut dan rekomendasi pengembangan, Bab VII Penutup, dan diakhiri dengan Daftar Pustaka.

---

# BAB II TINJAUAN PUSTAKA

## 2.1 Konsep Sistem Pendukung Keputusan (Decision Support System)

Sistem pendukung keputusan merupakan sistem informasi berbasis komputer yang dirancang untuk mendukung proses pengambilan keputusan pada masalah semi-terstruktur maupun tidak terstruktur. DSS umumnya memadukan data, model analitik, dan antarmuka pengguna untuk membantu pengambil keputusan mengeksplorasi alternatif dan memahami konsekuensi pilihan. Pada konteks operasi tambang, DSS memiliki relevansi tinggi karena keputusan harian dipengaruhi banyak variabel yang saling terkait, seperti jumlah alat, kondisi jalan, cuaca, dan batasan jadwal kapal. Dengan demikian, DSS yang baik harus mengintegrasikan data operasional secara konsisten, menyediakan analitik yang dapat dipahami, serta mampu memberikan rekomendasi yang dapat dijelaskan secara rasional.

## 2.2 Konsep Rantai Operasi Tambang dan Parameter Kinerja

Rantai operasi tambang pada studi kasus ini dipahami sebagai alur pit–hauling–dumping–port. Pada pit dan loading point, parameter kinerja yang penting adalah tingkat utilisasi excavator, kapasitas antrian, dan cycle time loading. Pada hauling, parameter penting meliputi jarak rute, kecepatan rata-rata, kondisi jalan, serta konsumsi bahan bakar per jarak atau per jam. Pada dumping point dan port, parameter penting meliputi kapasitas penampungan, status antrean, serta keterkaitan dengan jadwal kapal. Pengukuran performa yang relevan untuk evaluasi adalah produktivitas (ton/jam), total tonase produksi, biaya bahan bakar, downtime alat, serta risiko keterlambatan yang berdampak pada biaya demurrage.

## 2.3 Integrasi Data Operasional dan Pemodelan Domain

Pemodelan domain pada sistem ini memanfaatkan entitas yang terstruktur dan saling berelasi. Konsep seperti “status alat” diimplementasikan sebagai enumerasi agar perubahan status dapat terlacak dan konsisten. Konsep “aktivitas hauling” dimodelkan sebagai entitas yang menghubungkan truck, operator, loading point, dumping point, dan rute, karena aktivitas inilah yang menghasilkan data cycle time dan tonase yang menjadi dasar statistik produksi. Pada implementasi database, pendekatan ini diwujudkan melalui Prisma schema yang menegaskan relasi antarentitas.

## 2.4 Dasar Teori Machine Learning untuk Prediksi Operasional

Machine learning digunakan pada sistem ini untuk mendukung prediksi parameter operasional yang sering sulit diperkirakan secara manual, seperti konsumsi bahan bakar, tonase aktual, atau probabilitas keterlambatan. Secara konsep, model prediksi dibangun sebagai fungsi yang memetakan fitur operasional (misalnya kapasitas alat, kondisi jalan, shift, dan variabel lain) menjadi keluaran numerik atau probabilistik. Dalam implementasi capstone ini, model dibungkus sebagai file joblib dan dimuat saat AI service berjalan. Strategi ini dipilih karena praktis untuk deployment dan mengurangi ketergantungan pelatihan ulang pada saat runtime.

## 2.5 LLM dan Chatbot Operasional

Large Language Model (LLM) merupakan model bahasa yang mampu menghasilkan respons tekstual yang koheren berdasarkan input. Pada sistem ini, LLM digunakan sebagai mesin percakapan untuk chatbot operasional, dengan pendekatan yang berorientasi pada data. Chatbot dirancang tidak hanya menjawab secara generatif, melainkan juga memanfaatkan konteks percakapan, deteksi entitas, serta kemampuan menjalankan query dan merangkum hasil. Integrasi dilakukan melalui Ollama sebagai penyedia LLM lokal. Pendekatan ini memberi keuntungan berupa kontrol lokal, fleksibilitas model, dan kemandirian dari layanan pihak ketiga, dengan konsekuensi bahwa layanan bergantung pada ketersediaan Ollama pada lingkungan deployment.

## 2.6 Teknologi Pendukung: Express.js, Prisma, PostgreSQL, React, FastAPI

Backend dibangun menggunakan Express.js karena ekosistem middleware yang kuat untuk keamanan (helmet), CORS, rate limiting, serta kemudahan struktur route-controller-service yang rapi. Prisma dipilih sebagai ORM karena mendukung schema-first dengan migrasi, validasi tipe, dan relasi yang jelas pada PostgreSQL. PostgreSQL dipakai sebagai database relasional yang kuat, stabil, dan sesuai untuk data operasional yang membutuhkan konsistensi dan transaksi.

Frontend dibangun menggunakan React karena dukungan komponen UI dan routing yang matang serta mudah diintegrasikan dengan API. Pada capstone ini, frontend juga memuat fitur PWA agar aplikasi mudah diakses di lapangan dengan pengalaman yang lebih “aplikatif”. AI/ML service dibangun menggunakan FastAPI karena kemampuannya untuk menyusun API dengan kontrak data yang jelas melalui Pydantic, performa yang baik, serta dukungan dokumentasi otomatis.

---

# BAB III METODE

## 3.1 Jenis Kegiatan dan Pendekatan

Kegiatan ini merupakan pengembangan sistem (software engineering) dengan pendekatan penelitian terapan, di mana keluaran utama adalah sistem yang dapat dijalankan dan diuji. Pendekatan yang digunakan bersifat iteratif dan incremental. Pada setiap iterasi, saya meninjau kebutuhan domain, memetakan model data, mengimplementasikan fitur, melakukan integrasi, lalu melakukan pengujian pada skenario yang merepresentasikan kebutuhan lapangan.

## 3.2 Tahapan Pekerjaan

Tahap awal dimulai dari analisis kebutuhan dan pemetaan domain pit–hauling–port. Tahap berikutnya adalah perancangan database menggunakan Prisma schema untuk memastikan entitas dan relasi representatif dan dapat berkembang. Setelah itu, backend API diimplementasikan untuk menyediakan operasi CRUD, autentikasi, otorisasi, validasi, serta endpoint analitik dashboard. Tahap berikutnya adalah pembangunan AI service, yang meliputi pemuatan model prediksi, penyusunan endpoint rekomendasi strategi, integrasi analisis hauling berbasis data aktual, serta penyusunan chatbot berbasis LLM dengan fallback.

Tahap setelah integrasi adalah pembangunan frontend dashboard yang mendukung alur operasional dan role-based routing. Tahap akhir adalah deployment melalui Docker Compose, termasuk penyediaan service pendukung seperti PostgreSQL, Ollama, dan monitoring. Pada tahap pengujian, saya memvalidasi health check, konsistensi alur autentikasi, integrasi backend–AI, serta alur rekomendasi dan chatbot.

## 3.3 Perancangan Arsitektur Sistem

Arsitektur sistem dirancang sebagai layanan terpisah agar tiap komponen dapat diskalakan dan dipelihara secara independen. Frontend berperan sebagai antarmuka pengguna dan berkomunikasi ke backend. Backend menjadi pusat logika bisnis, autentikasi, dan operasi database. AI service bertanggung jawab pada rekomendasi strategi, analisis hauling, pemuatan model, dan chatbot. Database PostgreSQL menyimpan data operasional. LLM melalui Ollama disediakan sebagai layanan terpisah yang dapat diaktifkan atau dinonaktifkan sesuai kebutuhan.

Tabel 1 berikut merangkum layanan dan port yang digunakan pada lingkungan docker-compose.

| Layanan     | Fungsi                                          | Port                                                        |
| ----------- | ----------------------------------------------- | ----------------------------------------------------------- |
| Frontend    | Dashboard operasional berbasis React            | 3000 (docker) / 3001 (dev lokal)                            |
| Backend API | API operasional Express + Prisma                | 5000 (docker) / 3000 atau 5000 (tergantung konfigurasi dev) |
| AI Service  | Rekomendasi strategi, analisis hauling, chatbot | 8000                                                        |
| PostgreSQL  | Database operasional                            | 5432                                                        |
| Ollama      | Penyedia LLM lokal                              | 11434                                                       |
| Prometheus  | Monitoring                                      | 9090                                                        |
| Grafana     | Dashboard monitoring                            | 3001                                                        |

## 3.4 Perancangan Database

Perancangan database dilakukan dengan menekankan konsistensi status, jejak audit, dan keterhubungan data. Entitas utama mencakup pengguna dan peran, lokasi (mining site, loading point, dumping point, road segment), peralatan (truck, excavator, support equipment), operator, aktivitas hauling, catatan cuaca, catatan maintenance, catatan produksi, serta modul kapal dan jadwal. Setiap entitas penting memiliki atribut createdAt dan updatedAt untuk membantu audit perubahan data.

Tabel 2 merangkum sebagian entitas inti dan perannya dalam sistem.

| Entitas                                          | Peran dalam Sistem           | Relasi Kunci                                   |
| ------------------------------------------------ | ---------------------------- | ---------------------------------------------- |
| User                                             | Identitas dan role akses     | Relasi ke Operator, log AI                     |
| Truck                                            | Alat angkut hauling          | Relasi ke HaulingActivity, MaintenanceLog      |
| Excavator                                        | Alat gali/muat               | Relasi ke LoadingPoint, HaulingActivity        |
| Operator                                         | Pengemudi/Operator alat      | Relasi ke HaulingActivity                      |
| HaulingActivity                                  | Catatan siklus hauling       | Mengikat Truck–Operator–Lokasi–Rute            |
| MiningSite/LoadingPoint/DumpingPoint/RoadSegment | Representasi lokasi dan rute | Mengikat ke aktivitas hauling dan analitik     |
| Vessel/SailingSchedule                           | Logistik kapal               | Keterkaitan dengan target quantity dan penalti |

## 3.5 Perancangan API dan Kontrak Data

Backend API menggunakan pola route-controller-service yang memisahkan tanggung jawab. Kontrak data pada backend ditingkatkan melalui validasi input dan sanitasi. Pada sisi AI service, kontrak data didefinisikan melalui Pydantic, sehingga request rekomendasi memiliki struktur yang konsisten meliputi fixed conditions, decision variables, serta optional financial params.

## 3.6 Perancangan Mekanisme Sinkronisasi Data

Sistem AI memerlukan dataset operasional yang stabil untuk analisis dan pelatihan model. Karena itu, backend menjalankan job sinkronisasi terjadwal untuk mengekspor data dari database ke file CSV. Ekspor penuh dijadwalkan setiap hari dan incremental sync dijalankan setiap jam untuk data dinamis yang berubah cepat, terutama hauling activity. Mekanisme ini memastikan bahwa AI service memuat data terbaru ketika melakukan rekomendasi.

## 3.7 Perancangan Pengujian

Pengujian dirancang pada tiga tingkatan. Tingkat pertama adalah pengujian ketersediaan layanan melalui health check untuk memastikan DB dan AI service terhubung. Tingkat kedua adalah pengujian fungsional endpoint yang mencakup autentikasi, CRUD entitas utama, dan pengambilan analitik dashboard. Tingkat ketiga adalah pengujian integrasi rekomendasi strategi dan chatbot pada skenario yang merepresentasikan kebutuhan lapangan.

---

# BAB IV HASIL DAN PEMBAHASAN

## 4.1 Gambaran Umum Hasil Implementasi

Hasil kegiatan pengembangan ini adalah sebuah sistem yang dapat dijalankan baik pada mode development maupun pada mode docker-compose. Sistem terdiri dari backend Express API yang mengelola data operasional dan autentikasi, AI/ML service FastAPI yang menyediakan rekomendasi strategi, analisis hauling, serta chatbot, dan frontend React sebagai dashboard operasional. Pada mode docker-compose, sistem juga menyertakan Ollama sebagai penyedia LLM, serta Prometheus dan Grafana sebagai komponen monitoring.

Secara konseptual, alur kerja sistem dimulai dari pengelolaan master data seperti mining site, titik loading/dumping, rute, truck, excavator, dan operator. Setelah master data tersedia, aktivitas hauling dapat dicatat sebagai catatan siklus operasional. Data hauling beserta data pendukung seperti cuaca dan maintenance menjadi input analitik produksi dan menjadi sumber data untuk AI service melalui mekanisme sinkronisasi.

## 4.2 Implementasi Backend Express API

Backend diimplementasikan dengan Express sebagai kerangka utama, dilengkapi middleware keamanan, sanitasi, logging, serta handler error. Backend menyediakan endpoint health check yang memeriksa koneksi database melalui query sederhana dan memeriksa status AI service melalui pemanggilan health endpoint. Pendekatan ini bertujuan memastikan bahwa status “sehat” tidak sekadar server hidup, tetapi juga memastikan dependensi kritis berfungsi.

Struktur kode backend menerapkan pemisahan tanggung jawab. Routes bertugas mendefinisikan jalur endpoint, controllers menangani request/response dan validasi alur, services melakukan logika bisnis dan interaksi Prisma, sedangkan middleware menangani autentikasi, RBAC, dan validasi request. Implementasi juga mencakup mekanisme graceful shutdown yang menutup server dan memutus koneksi database secara aman ketika menerima sinyal terminasi.

## 4.3 Implementasi Database dengan Prisma dan PostgreSQL

Skema database didefinisikan pada Prisma schema dan dimigrasikan ke PostgreSQL. Skema memuat enumerasi status yang cukup kaya untuk mencerminkan kondisi operasional, seperti status truck (idle, hauling, loading, dumping, maintenance, breakdown) dan status excavator (active, idle, maintenance, breakdown). Pendekatan enumerasi ini memudahkan analitik dan mengurangi variasi nilai status yang tidak konsisten.

Relasi penting pada sistem difokuskan pada HaulingActivity karena entitas ini menjadi pusat data cycle time dan performa. HaulingActivity mengikat truck dan operator serta menghubungkan ke lokasi dan rute, sehingga analitik produksi dapat diturunkan dari data aktivitas yang terstruktur. Selain itu, entitas vessel dan sailing schedule menyediakan konteks logistik hilir dan memungkinkan analisis risiko keterlambatan.

## 4.4 Implementasi AI/ML Service (FastAPI)

AI service dibangun menggunakan FastAPI dan memuat “otak” simulasi dari modul simulator. Pada saat startup, AI service memuat model prediksi joblib yang mencakup prediksi konsumsi bahan bakar, tonase, probabilitas keterlambatan, dan risiko. AI service juga memeriksa konektivitas Ollama untuk menentukan apakah fitur chatbot berbasis LLM berjalan penuh atau berjalan dalam mode degradasi.

AI service menyediakan endpoint rekomendasi strategi top-3 yang menerima parameter kondisi tetap seperti cuaca, road condition, shift, target produksi, serta rentang variabel keputusan seperti jumlah truck dan excavator yang akan diuji. Selain itu, AI service memiliki endpoint yang mengembalikan strategi disertai analisis hauling aktual, serta endpoint yang menambahkan informasi alokasi hauling yang siap dioperasionalkan. Secara fungsional, keluaran rekomendasi disiapkan agar dapat dipahami manusia, termasuk ringkasan konsekuensi biaya dan produksi, sehingga rekomendasi dapat dipertanggungjawabkan.

Tabel 3 merangkum sebagian endpoint AI service dan tujuan fungsionalnya.

| Endpoint AI                           | Fungsi                                                                | Output Utama                |
| ------------------------------------- | --------------------------------------------------------------------- | --------------------------- |
| GET /health                           | Memeriksa status AI, versi, dan status LLM provider                   | Status, versi, provider     |
| POST /get_top_3_strategies            | Menghasilkan tiga strategi terbaik berdasarkan kondisi dan variabel   | Daftar strategi terformat   |
| POST /get_strategies_with_hauling     | Menghasilkan strategi sekaligus mengaitkan dengan data hauling aktual | Strategi + hauling analysis |
| POST /get_strategies_with_allocations | Menghasilkan strategi dengan alokasi hauling yang siap dipakai        | Strategi + allocation list  |
| POST /ask_chatbot                     | Menjawab pertanyaan operasional berbasis konteks dan data             | Jawaban + ringkasan         |

## 4.5 Implementasi Chatbot Operasional

Chatbot diimplementasikan untuk menjembatani kebutuhan informasi cepat. Chatbot tidak hanya menerima pertanyaan bebas, tetapi juga melakukan deteksi entitas seperti id produksi, id truck, id excavator, id jadwal, tanggal, shift, dan angka tonase. Deteksi ini digunakan untuk memperkuat konteks percakapan agar pertanyaan lanjutan dapat dijawab dengan lebih tepat. Sistem menyimpan konteks percakapan berbasis session_id dengan TTL sehingga konteks tidak tersimpan selamanya, tetapi cukup untuk mendukung alur percakapan yang wajar.

Selain itu, chatbot menerapkan caching query dengan TTL untuk pertanyaan yang sama dalam waktu singkat, sehingga beban komputasi dapat dikurangi dan respons lebih stabil. Ketika Ollama tidak tersedia, AI service tetap dapat berjalan dan mengembalikan respons yang lebih terbatas sesuai ketersediaan komponen.

## 4.6 Implementasi Frontend Dashboard (React)

Frontend dikembangkan untuk menyediakan pengalaman pengguna yang sesuai kebutuhan lapangan. Sistem menerapkan PrivateRoute agar pengguna yang belum login tidak dapat mengakses dashboard. Setelah login, RoleRoute diterapkan pada halaman tertentu sehingga akses menyesuaikan role pengguna, misalnya manajemen user hanya untuk admin, dan modul kapal hanya untuk peran yang relevan.

Frontend juga menambahkan dukungan PWA yang memberikan prompt instalasi ketika aplikasi dibuka pada browser yang mendukung. Fitur ini meningkatkan kemudahan akses pada perangkat pengguna sehingga aplikasi terasa seperti aplikasi native.

## 4.7 Integrasi dan Sinkronisasi Data

Integrasi backend dan AI service dilakukan melalui dua jalur. Jalur pertama adalah pemanggilan endpoint AI melalui proxy di backend untuk fungsi rekomendasi dan chatbot. Proxy ini menambahkan penanganan error yang konsisten, termasuk penanganan timeout agar frontend tidak menunggu terlalu lama. Jalur kedua adalah sinkronisasi dataset melalui job backend yang mengekspor data tabel menjadi CSV ke direktori data AI. Ekspor penuh dilakukan pada jadwal harian, sedangkan incremental sync dilakukan per jam untuk hauling activity yang berubah cepat.

Dalam workspace project ini terdapat dua direktori AI, yaitu mining-ops-ai sebagai service utama yang digunakan pada docker-compose, dan mining-ops-ai-main yang digunakan sebagai target path sinkronisasi data pada job tertentu. Perbedaan ini perlu dicatat dalam pembahasan karena dapat mempengaruhi konsistensi environment; pada pengembangan berikutnya, konsolidasi target data directory dianjurkan agar tidak terjadi kebingungan konfigurasi.

## 4.8 Pembahasan: Kekuatan dan Implikasi Implementasi

Kekuatan utama implementasi terletak pada keterpaduan data operasional dengan modul AI, serta kemampuan sistem untuk tetap berjalan meskipun salah satu komponen opsional, seperti LLM, tidak tersedia. Di sisi backend, penggunaan Prisma dan enumerasi status memperkuat konsistensi data. Di sisi AI, pemisahan layanan memudahkan pemeliharaan model dan logika simulasi. Di sisi frontend, role-based routing memastikan akses yang tertib.

Implikasi dari desain ini adalah sistem dapat digunakan sebagai fondasi untuk pengembangan ke arah real-time decisioning, misalnya dengan menambahkan event streaming atau integrasi sensor. Namun, sistem juga menunjukkan bahwa sinkronisasi dataset berbasis file masih memerlukan disiplin konfigurasi agar jalur data tidak terpecah.

## 4.9 Pengujian dan Validasi Integrasi

Pengujian pada capstone ini difokuskan pada dua kebutuhan utama, yaitu memastikan sistem “berfungsi” secara fungsional dan memastikan integrasi antarlayanan “konsisten” pada kondisi yang realistis. Karena arsitektur dipisah menjadi beberapa service, maka pengujian tidak dapat hanya berhenti pada unit endpoint, melainkan harus menilai rangkaian alur dari frontend–backend–database–AI, serta kondisi kegagalan yang mungkin muncul pada lapangan, seperti AI service yang mengalami timeout atau LLM provider yang tidak aktif.

Secara metodologis, validasi dimulai dari health check yang memeriksa koneksi database dan status AI service. Setelah itu, dilakukan pengujian alur autentikasi dan otorisasi untuk memastikan token JWT diterbitkan dengan benar dan pembatasan akses berbasis role diterapkan sesuai kebijakan. Tahap berikutnya adalah pengujian CRUD untuk entitas inti (alat, lokasi, operator, hauling activity, maintenance, cuaca, produksi, dan logistik kapal) karena data inilah yang menentukan kualitas analitik dashboard dan konsistensi dataset AI.

Tabel 5 merangkum skenario pengujian integrasi yang digunakan sebagai acuan validasi.

| Skenario                          | Langkah Uji                                                | Kriteria Keberhasilan                                                |
| --------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| Health check multi-dependensi     | Memanggil endpoint health backend dan AI                   | Backend menyatakan sehat hanya jika DB dan AI terhubung              |
| Autentikasi dan role-based access | Login, akses halaman/endpoint tertentu sesuai role         | Akses ditolak ketika role tidak sesuai, dan diterima ketika sesuai   |
| CRUD master data                  | Menambah/mengubah/menghapus entitas inti                   | Data tersimpan konsisten, relasi valid, dan error tertangani         |
| Pencatatan hauling activity       | Membuat aktivitas hauling dan memperbarui status siklus    | Status berubah sesuai alur, data dapat dianalisis di dashboard       |
| Sinkronisasi dataset AI           | Menjalankan job export/incremental sync                    | File CSV terbarui dan dapat dibaca AI service tanpa error            |
| Proxy AI dari backend             | Memanggil endpoint rekomendasi melalui backend             | Respons AI diteruskan dengan format konsisten dan timeout tertangani |
| Chatbot dengan/ tanpa LLM         | Mengirim pertanyaan operasional saat Ollama aktif/nonaktif | Saat aktif jawaban lebih kaya; saat nonaktif layanan tetap stabil    |

Hasil pengujian menunjukkan bahwa fokus integrasi melalui health check dan proxy menjadi elemen krusial dalam menjaga pengalaman pengguna. Dalam sistem multi-service, pesan error yang konsisten lebih penting daripada sekadar “tidak error”, karena pengguna operasional membutuhkan kepastian apakah masalah berada pada data, jaringan, atau komponen AI.

## 4.10 Evaluasi Hasil dan Relevansi terhadap Kebutuhan Operasional

Evaluasi pada Bab IV ini diposisikan sebagai evaluasi sistem secara end-to-end, bukan evaluasi model prediksi secara statistik murni. Ukuran keberhasilan utama adalah keterpakaian (usability) dan keterjelasan rekomendasi. Pada sisi dashboard, evaluasi dilakukan dengan memastikan bahwa alur kerja operasional dapat direpresentasikan melalui master data dan hauling activity, serta analitik ringkas dapat ditampilkan dengan cepat. Pada sisi AI, evaluasi berfokus pada kemampuan sistem menghasilkan strategi top-3 yang dapat dibandingkan, serta kemampuan chatbot merangkum kondisi dan menjawab pertanyaan berbasis konteks.

Secara kualitatif, sistem memenuhi kebutuhan “single source of truth” untuk data operasional, sekaligus menyediakan lapisan analitik dan rekomendasi yang menjembatani data mentah menjadi keputusan. Keunggulan praktis yang paling relevan adalah kemampuan sistem untuk bekerja pada kondisi keterbatasan infrastruktur. Ketika LLM tidak tersedia, sistem tidak berhenti; ketika AI service lambat, backend mengelola timeout dan memberikan pesan yang lebih dapat ditindaklanjuti.

Namun demikian, evaluasi juga menyoroti area yang harus diperkuat. Sinkronisasi dataset berbasis file adalah solusi yang sederhana dan stabil, tetapi rentan terhadap perbedaan path dan konfigurasi directory. Selain itu, rekomendasi strategi akan semakin kuat apabila dikaitkan dengan baseline operasional historis, sehingga strategi yang “baik” tidak hanya baik secara simulatif tetapi juga teruji pada data realisasi.

## 4.11 Pembahasan Keamanan dan Tata Kelola Akses

Karena sistem ini menyangkut data operasional, kontrol akses menjadi aspek yang tidak dapat diabaikan. Implementasi role-based access control pada backend dan frontend memastikan bahwa setiap peran hanya dapat melakukan aktivitas yang relevan. Praktik ini berdampak langsung pada kualitas data, karena mencegah perubahan entitas kritis oleh peran yang seharusnya hanya melakukan monitoring. Selain itu, penerapan middleware keamanan pada backend membantu mengurangi risiko serangan umum pada aplikasi web, seperti penyalahgunaan input dan request berulang yang berpotensi mengganggu ketersediaan layanan.

Tata kelola akses juga berkaitan dengan jejak audit. Dengan adanya waktu pembuatan dan pembaruan pada entitas penting, sistem memiliki fondasi audit yang dapat dikembangkan lebih lanjut, misalnya dengan menambahkan log eksplisit untuk perubahan status hauling, perubahan konfigurasi, atau keputusan rekomendasi yang dipakai sebagai dasar eksekusi.

## 4.12 Pembahasan Deployment dan Operasionalisasi

Sistem telah dipersiapkan untuk dijalankan secara konsisten menggunakan docker-compose, sehingga backend, AI service, database, frontend, dan komponen opsional seperti Ollama serta monitoring dapat dinaikkan dalam satu rangkaian. Ketersediaan skrip restart dan panduan quick start pada workspace menambah kesiapan operasional, karena tim dapat melakukan pemulihan layanan tanpa harus memahami seluruh detail implementasi. Dalam konteks capstone, poin ini penting karena menunjukkan bahwa produk yang dihasilkan bukan prototipe semata, melainkan sistem yang dipikirkan untuk dapat dipakai dan dirawat.

Walaupun demikian, operasionalisasi sistem multi-service selalu membutuhkan disiplin konfigurasi. Standardisasi environment variable, penamaan port yang konsisten antara mode development dan docker, serta penyatuan jalur dataset AI akan meningkatkan kemudahan onboarding dan mengurangi risiko kesalahan konfigurasi.

---

# BAB V KORELASI PROGRAM STUDI INDEPENDEN DENGAN KONVERSI MATA KULIAH

## 5.1 Gambaran Kegiatan dalam Perspektif Capaian Pembelajaran

Kegiatan capstone ini secara langsung berkorelasi dengan capaian pembelajaran pada bidang rekayasa perangkat lunak, basis data, dan kecerdasan buatan. Dalam proses pelaksanaan, saya menerapkan analisis kebutuhan dan pemodelan domain sebagai bagian dari kompetensi perancangan sistem. Saya juga menerapkan praktik implementasi backend dan frontend yang selaras dengan prinsip software engineering, termasuk modularisasi, keamanan aplikasi, dan pengujian. Di sisi AI, saya menerapkan konsep pemuatan model, desain API berbasis kontrak, dan pengembangan chatbot berbasis LLM yang dilengkapi mekanisme fallback.

Korelasi kegiatan ini dapat dipahami melalui hubungan antara artefak yang dihasilkan dan kompetensi akademik yang dituju. Artefak berupa skema database, implementasi API, desain UI, pipeline sinkronisasi data, serta integrasi model AI merupakan bukti penerapan kompetensi yang biasanya dipelajari secara terpisah di berbagai mata kuliah.

## 5.2 Pemetaan Konversi Mata Kuliah

Bagian ini disusun untuk menyesuaikan kebijakan konversi mata kuliah pada program studi. Karena nama mata kuliah dan jumlah SKS bisa berbeda tiap institusi, tabel pemetaan di bawah menyediakan format yang dapat Anda sesuaikan. Secara substansi, pemetaan didasarkan pada pekerjaan nyata yang dilakukan selama capstone.

Tabel 4 berikut menyajikan contoh pemetaan korelasi kegiatan dengan mata kuliah yang umum pada program studi bidang komputer.

| Mata Kuliah yang Diklaim             | Bukti Pekerjaan pada Capstone                                                  | Kompetensi yang Ditunjukkan                            |
| ------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Basis Data                           | Desain Prisma schema, relasi entitas operasional, migrasi dan seeding          | Pemodelan relasional, integritas data, query dan audit |
| Pemrograman Web / Backend            | Implementasi Express API, autentikasi JWT, middleware keamanan, proxy AI       | Desain API, security, error handling, logging          |
| Pemrograman Web / Frontend           | Implementasi dashboard React, routing, PWA, integrasi service API              | UI state management, routing, UX berbasis role         |
| Rekayasa Perangkat Lunak             | Arsitektur multi-service, deployment docker-compose, dokumentasi dan pengujian | Perancangan, implementasi iteratif, maintainability    |
| Kecerdasan Buatan / Machine Learning | Pemuatan model joblib, endpoint rekomendasi, analisis hauling, evaluasi output | Model inference, feature handling, validasi hasil      |
| Komputasi Awan / DevOps (opsional)   | Orkestrasi container, environment variable, health check, monitoring           | Deployability, observability, operasionalisasi         |

## 5.3 Narasi Konversi dan Rasionalisasi

Secara naratif, konversi mata kuliah menjadi masuk akal karena kegiatan yang dilakukan tidak berhenti pada “membuat aplikasi”, tetapi mencakup siklus lengkap pengembangan sistem. Pada bagian basis data, saya tidak hanya membuat tabel, tetapi menyusun model domain yang realistis dan menerapkan status yang konsisten. Pada bagian backend, saya menerapkan autentikasi dan kontrol akses berbasis peran, yang merupakan kompetensi penting untuk sistem produksi. Pada bagian AI, saya mengintegrasikan model prediksi dan menyusun endpoint rekomendasi yang menggunakan kontrak data terstruktur. Pada bagian frontend, saya mengimplementasikan dashboard yang memudahkan pengguna mengakses fitur sesuai role. Pada bagian deployment, saya memastikan sistem dapat dijalankan ulang dengan konfigurasi yang jelas.

---

# BAB VI RENCANA TINDAK LANJUT DAN REKOMENDASI

## 6.1 Rencana Tindak Lanjut Jangka Pendek

Rencana tindak lanjut jangka pendek berfokus pada konsolidasi konfigurasi dan peningkatan kualitas pengujian. Prioritas pertama adalah menstandarkan port dan environment variable antara mode development dan mode docker-compose agar tidak menimbulkan kebingungan bagi pengguna dan evaluator. Prioritas kedua adalah menyatukan jalur sinkronisasi dataset agar tidak terjadi perbedaan antara target direktori data AI yang digunakan job backend dan direktori yang digunakan AI service pada docker.

Selain itu, jangka pendek juga perlu menambahkan skenario pengujian yang terdokumentasi dengan baik untuk alur hauling dan rekomendasi strategi. Pengujian ini bertujuan memastikan bahwa perubahan kecil pada skema atau endpoint tidak merusak integrasi.

## 6.2 Rencana Tindak Lanjut Jangka Menengah

Pada jangka menengah, pengembangan diarahkan pada peningkatan kualitas rekomendasi dan integrasi data yang lebih real-time. Salah satu pendekatan adalah menambahkan mekanisme streaming atau event-driven untuk hauling activity, sehingga AI service dapat memuat data terkini tanpa menunggu ekspor file. Selain itu, diperlukan evaluasi model prediksi secara periodik, termasuk penetapan metrik seperti MAE untuk prediksi numerik dan AUC untuk prediksi probabilistik.

Jangka menengah juga dapat mencakup pengayaan fitur dashboard, misalnya tampilan trend produksi per shift dan analisis penyebab delay yang teragregasi. Namun, pengayaan ini tetap harus menjaga prinsip keterukuran dan keterlacakan data.

## 6.3 Rencana Tindak Lanjut Jangka Panjang

Pada jangka panjang, sistem dapat diarahkan ke arah decision intelligence yang lebih matang, di mana rekomendasi tidak hanya memberikan strategi, tetapi juga menyertakan justifikasi yang dapat diaudit dan diintegrasikan dengan SOP operasional. Pengembangan dapat mencakup integrasi dengan sistem perusahaan seperti ERP atau fleet management system, serta integrasi sensor untuk kondisi jalan dan cuaca.

Di sisi AI, chatbot dapat ditingkatkan menjadi asisten yang mampu melakukan analisis multi-sumber dan menghasilkan ringkasan eksekutif berkala. Peningkatan ini tetap perlu memperhatikan aspek tata kelola data, keamanan, dan privasi.

## 6.4 Rekomendasi Teknis

Rekomendasi teknis utama adalah memperkuat observability dan tata kelola konfigurasi. Sistem sudah menyediakan Prometheus dan Grafana pada mode docker-compose, namun metrik yang lebih spesifik seperti latency per endpoint, error rate, dan durasi job sinkronisasi akan sangat membantu. Di sisi keamanan, rekomendasi adalah menambah audit trail yang lebih eksplisit untuk perubahan status hauling dan perubahan konfigurasi sistem.

---

# BAB VII PENUTUP

## 7.1 Kesimpulan

Capstone project Mining Operations AI Decision Support System (DSS) berhasil diwujudkan sebagai sistem terintegrasi yang menggabungkan pengelolaan data operasional tambang, dashboard monitoring berbasis web, serta layanan AI/ML untuk rekomendasi strategi dan chatbot operasional. Dari sisi teknis, sistem telah mengimplementasikan backend yang aman dan terstruktur, database yang konsisten dengan relasi domain yang representatif, AI service yang memuat model prediksi dan menyediakan rekomendasi berbasis kontrak data, serta frontend yang menerapkan otorisasi berbasis role dan mendukung PWA.

Sistem juga menunjukkan ketahanan desain melalui health check, mekanisme timeout, dan kemampuan degradasi saat LLM tidak tersedia. Dengan demikian, sistem ini dapat dipandang sebagai fondasi yang kuat untuk pengembangan lebih lanjut menuju sistem pendukung keputusan yang lebih real-time dan lebih terintegrasi.

## 7.2 Saran

Saran utama untuk pengembangan adalah melakukan standardisasi konfigurasi environment dan menyatukan jalur sinkronisasi dataset, memperluas pengujian integrasi, serta melakukan evaluasi model prediksi secara periodik. Selain itu, peningkatan observability dan audit trail akan meningkatkan kredibilitas sistem ketika digunakan dalam skenario yang lebih serius.

---

# DAFTAR PUSTAKA

FastAPI. (n.d.). FastAPI Documentation. https://fastapi.tiangolo.com/

Grafana Labs. (n.d.). Grafana Documentation. https://grafana.com/docs/

Ollama. (n.d.). Ollama Documentation. https://ollama.com/

Prisma. (n.d.). Prisma Documentation. https://www.prisma.io/docs

Prometheus. (n.d.). Prometheus Documentation. https://prometheus.io/docs/

React. (n.d.). React Documentation. https://react.dev/

The PostgreSQL Global Development Group. (n.d.). PostgreSQL Documentation. https://www.postgresql.org/docs/

Express.js. (n.d.). Express Documentation. https://expressjs.com/

**(Akhir Dokumen)**
