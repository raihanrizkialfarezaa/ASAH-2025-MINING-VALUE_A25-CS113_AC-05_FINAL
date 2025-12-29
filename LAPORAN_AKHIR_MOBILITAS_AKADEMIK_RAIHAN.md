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
3. [BAB III METODE STUDI INDEPENDEN](#bab-iii-metode)
4. [BAB IV HASIL DAN PEMBAHASAN](#bab-iv-hasil-dan-pembahasan)
5. [BAB V KORELASI DENGAN KONVERSI MATA KULIAH](#bab-v-korelasi)
6. [BAB VI RENCANA TINDAK LANJUT DAN REKOMENDASI](#bab-vi-rencana-tindak-lanjut)
7. [BAB VII PENUTUP](#bab-vii-penutup)
8. [DAFTAR PUSTAKA](#daftar-pustaka)
9. [LAMPIRAN](#lampiran)

---

# BAB I PENDAHULUAN

## 1.1 Latar Belakang

Waktu pertama kali dapat brief dari mentor soal project ini, jujur saya agak overwhelmed. Bayangkan, diminta bikin sistem yang bisa handle operasi tambang batubara dari ujung ke ujung, mulai dari tracking armada truk, monitoring excavator, sampai prediksi kapan kapal harus berangkat biar gak kena denda. Tapi ya namanya juga kesempatan, saya ambil tantangan ini.

Industri pertambangan batubara itu ternyata masih sangat manual dalam hal pengambilan keputusan operasional. Supervisor lapangan masih pakai radio HT dan Excel untuk koordinasi, dispatcher masih andalkan feeling untuk alokasi truk, dan ketika ada masalah baru ketahuan setelah kerusakan terjadi. Padahal di era sekarang, dengan data yang melimpah dari operasi sehari-hari, harusnya bisa dimanfaatkan untuk decision making yang lebih cerdas.

PT Mining Value Indonesia sebagai mitra dalam program ASAH 2025 ini punya visi untuk membawa teknologi AI ke industri pertambangan. Mereka butuh produk yang bisa di-showcase ke klien potensial mereka, bukan sekadar demo atau proof of concept, tapi sistem yang benar-benar bisa jalan di production. Nah, di situlah peran tim saya masuk.

Fokus utama yang kami kerjakan adalah membangun platform Decision Support System yang punya tiga kemampuan inti. Pertama, kemampuan untuk memonitor operasi secara real-time lewat dashboard yang informatif. Kedua, kemampuan prediktif menggunakan machine learning untuk estimasi konsumsi BBM, berat muatan, dan probabilitas keterlambatan. Ketiga, kemampuan untuk memberikan rekomendasi strategi operasional melalui simulasi dan AI chatbot yang bisa diajak ngobrol pakai bahasa Indonesia.

Kenapa ini penting? Karena satu keputusan yang salah di operasi tambang bisa berakibat fatal secara finansial. Misalnya, telat loading tongkang satu jam saja bisa kena demurrage jutaan rupiah. Atau salah estimasi kebutuhan truk di shift pagi bisa bikin queue time membengkak dan target produksi tidak tercapai. Sistem yang kami bangun ini diharapkan bisa membantu supervisor mengambil keputusan yang lebih informed berdasarkan data, bukan sekadar intuisi.

## 1.2 Tujuan Studi Independen

Tujuan utama dari project ini cukup straightforward: membangun sistem pendukung keputusan yang benar-benar bisa dipakai untuk mengoptimalkan operasi hauling batubara. Bukan aplikasi mainan yang cuma bagus di presentasi, tapi platform yang arsitekturnya sudah siap production dan model ML-nya sudah terlatih dengan data yang representatif.

Secara teknis, kami menargetkan untuk membangun tiga komponen yang terintegrasi. Backend API menggunakan Node.js dan Express yang handle semua logic bisnis dan akses database. Frontend dashboard pakai React.js yang menampilkan visualisasi real-time. Dan AI service berbasis Python FastAPI yang menjalankan model machine learning dan chatbot.

Dari sisi pembelajaran pribadi, saya ingin menguasai bagaimana membangun aplikasi full-stack dengan arsitektur modern. Selama ini di kuliah kan project-nya monolitik semua, kali ini saya belajar bagaimana service-service yang berbeda berkomunikasi lewat API, bagaimana handle failure di distributed system, dan bagaimana containerization dengan Docker itu bekerja.

## 1.3 Manfaat Proyek

Buat PT Mining Value Indonesia, sistem ini jadi asset yang bisa langsung mereka tunjukkan ke klien. Mereka dapat source code lengkap, dokumentasi teknis, dan pemahaman tentang cara mengoperasikan serta mengembangkan sistemnya lebih lanjut. Ini bukan sekadar deliverable project, tapi foundation untuk product line mereka ke depan.

Buat industri pertambangan secara umum, kalau sistem ini diadopsi, potensi penghematannya signifikan. Dari simulasi yang kami jalankan, optimalisasi alokasi armada saja bisa hemat 15-20% biaya bahan bakar. Belum lagi pengurangan demurrage cost dari ketepatan jadwal pengapalan.

Buat saya sendiri, pengalaman empat minggu ini luar biasa valuable. Belajar langsung dari mentor industri, kerja dengan timeline ketat, dan deliver produk yang nyata. Skill-skill ini tidak mungkin didapat dari sekedar kuliah teori di kelas.

---

# BAB II TINJAUAN PUSTAKA

## 2.1 Tinjauan Teoritis

Konsep Decision Support System yang kami implementasikan mengacu pada framework klasik dari Scott Morton yang menekankan integrasi antara data, model, dan user interface. Bedanya, kami menambahkan layer AI dan machine learning untuk memberikan kemampuan prediktif yang tidak ada di DSS konvensional.

Untuk machine learning, kami menggunakan algoritma Random Forest yang terkenal robust dan tidak terlalu sensitif terhadap outlier. Ini penting karena data operasional tambang itu lumayan berantakan, banyak missing values dan nilai ekstrem. Random Forest juga memberikan feature importance yang berguna untuk interpretability, jadi kita bisa tahu variabel mana yang paling berpengaruh terhadap prediksi.

Simulasi yang kami bangun menggunakan pendekatan discrete event simulation dengan library SimPy di Python. Ini cocok untuk memodelkan sistem antrian seperti operasi hauling, dimana truk datang, mengantri, dilayani excavator, berangkat, dump, dan kembali lagi. Dengan simulasi ini, supervisor bisa mencoba berbagai skenario what-if tanpa mengganggu operasi aktual.

Untuk chatbot, kami implementasikan Retrieval Augmented Generation dimana LLM dikombinasikan dengan database operasional. Jadi bukan chatbot yang jawab ngasal, tapi benar-benar mengakses data real-time untuk menjawab pertanyaan seperti "berapa total produksi shift pagi kemarin?" dengan akurat.

## 2.2 Penelitian Sebelumnya

Dari literature review yang saya lakukan, penelitian tentang optimasi fleet di tambang sudah banyak, tapi kebanyakan fokus di satu aspek saja. Ada yang fokus truck dispatching pakai linear programming, ada yang fokus predictive maintenance pakai deep learning, ada yang fokus production forecasting. Jarang yang mencoba mengintegrasikan semuanya dalam satu platform terpadu.

Di situlah kontribusi project kami. Bukan menciptakan algoritma baru yang groundbreaking, tapi mengintegrasikan berbagai teknologi existing menjadi solusi yang holistic dan practical untuk kebutuhan industri.

## 2.3 Luaran Berdampak yang Diusulkan

Output dari project ini adalah Mining Operations AI Decision Support System yang terdiri dari backend API dengan 17 modul endpoint, frontend dashboard dengan 14 halaman fungsional, dan AI service dengan 6 model ML (3 aktif digunakan) plus chatbot. Semua sudah terkontainerisasi dengan Docker dan siap deploy ke environment production.

---

# BAB III METODE

## 3.1 Posisi/Kedudukan Kegiatan

Dalam ekosistem program ASAH 2025, posisi tim kami adalah sebagai developer yang bertanggung jawab penuh atas development cycle dari awal sampai akhir. Mulai dari requirement analysis, system design, implementation, testing, sampai preparation untuk deployment. Mentor dari PT Mining Value Indonesia berperan sebagai domain expert yang memberikan insight tentang operasi tambang dan validasi bahwa solusi yang kami bangun memang sesuai kebutuhan lapangan.

Project ini bukan bagian dari sistem yang lebih besar, melainkan standalone platform yang dirancang untuk bisa diintegrasikan dengan sistem existing klien di kemudian hari kalau diperlukan. Scope-nya mencakup seluruh flow operasi hauling: dari penjadwalan, monitoring real-time, prediksi masalah, sampai pelaporan.

## 3.2 Rancangan dan Implementasi Sistem

### Arsitektur Sistem

Arsitektur yang kami rancang menggunakan pendekatan microservices dengan tiga komponen utama yang berjalan independen namun saling terintegrasi melalui RESTful API. Keputusan ini diambil karena beberapa pertimbangan praktis. Pertama, setiap service bisa dikembangkan dan di-deploy secara terpisah, jadi kalau ada update di AI service tidak perlu redeploy frontend. Kedua, scaling bisa dilakukan per-service sesuai kebutuhan, misal kalau beban ML inference tinggi, cukup scale AI service saja. Ketiga, tech stack yang berbeda bisa digunakan sesuai kebutuhan masing-masing service.

Backend kami bangun dengan Express.js versi 4.21.1 yang berjalan di Node.js 18. Pilihan ini karena JavaScript ecosystem yang mature dan performance yang cukup untuk use case kami. Untuk database, kami gunakan PostgreSQL 16.10 karena kemampuan relational-nya yang kuat dan support untuk JSON fields yang berguna untuk menyimpan data semi-structured. ORM-nya pakai Prisma 5.20.0 yang developer experience-nya bagus banget, schema definition dengan DSL sendiri dan auto-generated client yang type-safe.

Frontend dibangun dengan React 18 menggunakan Create React App sebagai boilerplate. Styling pakai TailwindCSS karena development speed-nya cepat dan hasil akhirnya konsisten. Untuk peta interaktif, kami integrasikan Leaflet.js yang open source dan ringan. State management cukup pakai built-in React Hooks karena complexity aplikasi belum sampai level yang butuh Redux atau sejenisnya.

AI service kami bangun dengan FastAPI karena performance-nya yang excellent untuk serving ML models dan documentationnya yang auto-generated. Library ML menggunakan scikit-learn untuk training Random Forest models, dan SimPy untuk discrete event simulation.

### Implementasi Database Schema

Database schema yang kami desain cukup kompleks dengan 29 tabel yang saling berelasi. File `schema.prisma` yang kami tulis mencapai lebih dari 1000 baris karena mencakup semua entitas operasional.

Model `User` menyimpan data akun dengan field username, email, password yang di-hash, fullName, dan role. Role-nya ada lima jenis: ADMIN yang punya full access, SUPERVISOR yang manage operasi, OPERATOR yang eksekusi di lapangan, DISPATCHER yang atur alokasi, dan MAINTENANCE_STAFF untuk tim perawatan. Setiap user bisa punya relasi ke operator profile kalau dia juga berperan sebagai operator alat.

Model `Truck` menyimpan data armada dump truck dengan field-field seperti code, name, brand, model, yearManufacture, capacity dalam ton, fuelCapacity, fuelConsumption rate per kilometer, averageSpeed, maintenanceCost per jam, dan status. Status truck ada banyak kemungkinan: IDLE, HAULING, LOADING, DUMPING, IN_QUEUE, MAINTENANCE, BREAKDOWN, REFUELING, STANDBY, atau OUT_OF_SERVICE. Ada juga tracking untuk totalHours dan totalDistance yang di-update setiap kali ada hauling activity.

Model `Excavator` mirip dengan truck tapi punya field spesifik seperti bucketCapacity dan productionRate dalam ton per menit. Excavator juga punya status dan tracking hour meter.

Model `HaulingActivity` adalah core transaction model yang merekam setiap aktivitas hauling dari awal sampai selesai. Field-nya mencakup referensi ke truck, excavator, operator, supervisor, loading point, dumping point, dan road segment yang digunakan. Juga ada timestamp untuk setiap fase: queueStartTime, queueEndTime, loadingStartTime, loadingEndTime, departureTime, arrivalTime, dumpingStartTime, dumpingEndTime, dan returnTime. Dari timestamp ini dihitung durasi masing-masing fase dan totalCycleTime.

Yang menarik, di hauling activity juga ada field predictedDelayRisk dan predictedDelayMinutes yang diisi oleh ML model setiap kali trip baru dimulai. Jadi supervisor bisa lihat prediksi sebelum masalah terjadi.

Model `ProductionRecord` merekam pencapaian produksi harian per shift per site. Field-nya mencakup targetProduction dan actualProduction dalam ton, achievement dalam persentase, kualitas batubara (avgCalori, avgAshContent, avgSulfur, avgMoisture), serta summary operasional seperti totalTrips, totalDistance, totalFuel, dan utilizationRate.

Untuk shipping, ada model `Vessel` yang menyimpan data kapal dengan field kapasitas (gt, dwt, loa, capacity) dan status (AVAILABLE, LOADING, SAILING, DISCHARGING, MAINTENANCE, CHARTERED). Ada juga `SailingSchedule` untuk jadwal pelayaran dan `ShipmentRecord` untuk rekaman pengiriman aktual.

### Implementasi Backend API

Backend Express kami strukturkan dengan pattern MVC yang clean. Folder `controllers` berisi 16 file controller yang handle business logic untuk masing-masing domain. Folder `routes` berisi 17 file routing yang define endpoint API. Folder `services` berisi abstraksi untuk external services seperti koneksi ke AI service. Folder `middleware` berisi authentication, authorization, validation, logging, dan error handling.

Contoh implementasi di `hauling.controller.js`, ada function `startHauling` yang dipanggil ketika dispatcher memulai trip baru. Function ini validate input, cek ketersediaan truck dan excavator, create record di database dengan status LOADING, update status truck menjadi LOADING, dan return response dengan data hauling activity yang baru dibuat. Ada juga function `completLoading` yang dipanggil operator setelah selesai loading, yang update timestamp loadingEndTime, hitung loadingDuration, dan ubah status menjadi HAULING.

Untuk authentication, kami implementasikan JWT dengan access token dan refresh token. Access token expire dalam 1 hari, refresh token dalam 7 hari. Password di-hash pakai bcrypt dengan 10 rounds. Ada juga role-based authorization dimana setiap route bisa di-protect untuk role tertentu saja.

Rate limiting kami pasang untuk prevent abuse API. General endpoints limit 100 requests per 15 menit per IP, sedangkan auth endpoints limit 5 requests per 15 menit untuk prevent brute force.

### Implementasi Frontend Dashboard

Frontend React kami bagi menjadi pages dan components. Folder `pages` berisi 14 halaman utama yang terdiri dari Dashboard.jsx dan Login.jsx di root, plus 12 halaman lain di subfolder (AI dengan 2 halaman, excavators, hauling, locations, maintenance, operators, production, trucks, users, vessels, dan weather).

Dashboard.jsx adalah halaman terbesar dengan hampir 1000 baris kode. Halaman ini menampilkan overview lengkap operasi dengan beberapa section. Di bagian atas ada summary cards yang menampilkan jumlah truck aktif, excavator aktif, hauling in progress, dan produksi hari ini. Semua data ini di-fetch dari API dan auto-refresh setiap 30 detik pakai setInterval di useEffect.

Di bawah summary cards ada peta interaktif yang menampilkan lokasi mining sites, loading points, dan dumping points. Kami pakai Leaflet dengan custom markers berbeda warna untuk setiap jenis lokasi. User bisa klik marker untuk lihat detail.

Ada juga section Fleet Status yang menampilkan breakdown status truck dan excavator, section Production Performance dengan progress bar achievement, section Weather Conditions yang menampilkan kondisi cuaca terkini dan apakah operasi aman dilanjutkan.

Untuk styling, kami definisikan theme object di awal file yang berisi class-class TailwindCSS yang konsisten. Misalnya `theme.card` untuk styling card container, `theme.badgeSuccess` untuk badge hijau, dan seterusnya. Ini memastikan visual consistency di seluruh dashboard.

Halaman AIRecommendations.jsx adalah interface untuk fitur rekomendasi strategi. User bisa input kondisi operasional seperti cuaca, kondisi jalan, shift, dan range jumlah truck/excavator yang mau dicoba. Setelah submit, sistem mengirim request ke AI service yang menjalankan simulasi berbagai kombinasi dan return 3 strategi terbaik dengan analisis cost-benefit masing-masing.

### Implementasi AI Service dan Machine Learning

AI service kami bangun dengan FastAPI dan struktur codebase yang straightforward. File utama ada di `api.py` yang define semua endpoint. File `chatbot.py` berisi logic untuk RAG chatbot dengan lebih dari 3000 baris kode karena banyak function untuk handle berbagai jenis pertanyaan. File `simulator.py` berisi engine simulasi hybrid dengan sekitar 2000 baris.

Untuk training model, prosesnya ada di `train_models.py`. Data training diambil dari file `final_training_data_real.csv` yang sudah kami prepare dengan join dari berbagai tabel. Feature yang digunakan mencakup capacity truck, bucketCapacity excavator, rating operator, experience years operator, distance, gradient jalan, umur truck dalam hari, dan hari sejak maintenance terakhir. Categorical features-nya ada weatherCondition, roadCondition, shift, brand truck, dan model excavator.

Model pertama adalah fuel prediction yang memprediksi konsumsi BBM dalam liter untuk satu trip. Kami pakai Random Forest Regressor dengan 100 trees. Hasil evaluasi di test set mendapatkan R² score 0.74 dengan Mean Absolute Error 1.38 liter. R² sebesar 0.74 artinya model mampu menjelaskan 74% variance dalam konsumsi BBM, sisanya dipengaruhi faktor lain yang tidak tercapture dalam fitur. Untuk keperluan estimasi operasional, ini sudah cukup memadai karena error rata-rata hanya 1.38 liter per trip.

Model kedua adalah load weight prediction yang estimasi berat muatan aktual. Ini penting karena berat aktual sering berbeda dari kapasitas rated truck, tergantung kondisi material dan loading technique. Model ini juga pakai Random Forest Regressor dengan R² score 0.88 dan MAE 1.63 ton. Dengan R² 0.88, model ini paling akurat di antara ketiga model, cocok untuk estimasi produksi harian.

Model ketiga adalah delay probability classifier yang prediksi apakah trip akan mengalami keterlambatan atau tidak. Pakai Random Forest Classifier dengan accuracy 90% dan AUC 0.50. Accuracy 90% terlihat tinggi, namun AUC yang rendah (0.50) menunjukkan bahwa model belum bisa membedakan dengan baik antara trip yang delay dan tidak delay. Ini terjadi karena data delay sangat imbalanced (90% trip tidak delay). Meski demikian, model tetap berguna sebagai baseline dan akan terus di-improve seiring bertambahnya data delay.

Selain tiga model aktif di atas, di folder models juga terdapat tiga model legacy dari iterasi sebelumnya: model_fuel_real.joblib, model_tonase.joblib, dan model_risiko.joblib. Model-model ini menggunakan format fitur yang berbeda dan tidak kompatibel dengan data training terbaru, sehingga tidak digunakan di production. Total ada 6 file model, dengan 3 yang aktif digunakan.

Semua trained model disimpan sebagai file .joblib di folder `models`. Saat API service start, model-model ini di-load ke memory untuk fast inference.

Untuk chatbot, implementasinya cukup sophisticated. Ada function `execute_and_summarize` yang jadi main entry point. Pertama, pertanyaan user dianalisis untuk extract intent dan entities. Kalau pertanyaannya tentang data operasional, sistem generate SQL query yang appropriate, execute ke database, dan summarize hasilnya dengan LLM. Kalau pertanyaannya lebih ke rekomendasi atau analisis, sistem akan involve simulation results atau just answer from knowledge base.

Kami support dua LLM provider: Ollama untuk local deployment dan Google Gemini API untuk cloud. Configuration-nya di file `llm_config.py` yang baca dari environment variable mau pakai yang mana.

### Implementasi Containerization

Untuk deployment, kami siapkan Docker configuration. Setiap service punya Dockerfile sendiri. Backend express pakai Node 18 Alpine image yang lightweight. Frontend pakai multi-stage build, pertama build dengan Node kemudian serve static files dengan Nginx. AI service pakai Python 3.10 slim image dengan install requirements dari requirements.txt.

File `docker-compose.yml` di root folder mengorkestrasi semua services. Ada service postgres untuk database, service backend, service frontend, dan service ai. Semua terhubung dalam network yang sama supaya bisa communicate. Environment variables di-inject dari .env file.

## 3.3 Pembelajaran Hal Baru

Selama empat minggu mengerjakan project ini, banyak hal baru yang saya pelajari yang tidak didapat di perkuliahan. Pengalaman pertama membangun sistem dengan arsitektur microservices proper membuka wawasan tentang bagaimana aplikasi skala besar seharusnya didesain. Bagaimana service-service berkomunikasi, bagaimana handle partial failure, bagaimana versioning API, semua ini hands-on learning yang valuable.

Deep dive ke machine learning operations juga eye-opening. Di kuliah, ML itu kan training di Jupyter notebook terus selesai. Di production, ternyata banyak concern lain: bagaimana load model efficiently, bagaimana handle edge cases di input data, bagaimana logging predictions untuk monitoring model drift. Semua ini real engineering problems yang perlu di-solve.

Working dengan LLM juga pengalaman baru. Prompt engineering itu ternyata skill tersendiri, bagaimana menyusun system prompt yang efektif supaya output-nya consistent dan useful. Implementing RAG juga challenging karena harus balance antara flexibility chatbot dengan accuracy data retrieval.

Kendala utama yang kami hadapi adalah data quality. Data CSV yang di-provide awalnya banyak missing values dan format inconsistent. Butuh effort signifikan untuk cleaning dan transformation sebelum bisa dipakai training. Integration complexity juga challenging, memastikan data consistency antara tiga service yang berbeda itu tidak trivial. Performance optimization juga jadi concern, simulasi dengan banyak skenario awalnya sangat lambat sampai kami optimize dengan parallel processing.

---

# BAB IV HASIL DAN PEMBAHASAN

## 4.1 Hasil

### Hasil Implementasi Backend API

Backend Express yang kami kembangkan berhasil menyediakan 17 modul routing dengan total lebih dari 50 endpoint API. Saya akan jelaskan beberapa yang paling kritikal.

Authentication module handle register, login, dan profile management. Endpoint `POST /auth/login` menerima email dan password, validate credentials terhadap database, dan return JWT tokens kalau valid. Response-nya berisi user object (tanpa password), accessToken, dan refreshToken. Token generation pakai library jsonwebtoken dengan secret key dari environment variable.

Hauling module adalah core transaction dengan 8 endpoint. `POST /hauling` untuk start aktivitas baru, `PATCH /hauling/:id/complete-loading` untuk mark loading selesai, `PATCH /hauling/:id/complete-dumping` untuk mark dumping selesai, `PATCH /hauling/:id/complete` untuk complete full cycle, dan `PATCH /hauling/:id/cancel` untuk cancel aktivitas. Setiap endpoint punya validation dan authorization check yang appropriate.

Dashboard module menyediakan agregasi data untuk frontend. `GET /dashboard/overview` return summary lengkap: jumlah equipment aktif, hauling in progress, produksi hari ini, status cuaca, dan alerts. Semua data diquery dari database dan di-aggregate di controller, hasilnya di-cache untuk 30 detik untuk reduce database load.

ML proxy module jadi penghubung antara frontend dan AI service. Endpoint seperti `POST /ml/predict/delay-risk` forward request ke FastAPI service dan return hasilnya. Ini memungkinkan frontend hanya perlu communicate dengan satu backend, simplify authentication dan error handling.

### Hasil Implementasi Frontend Dashboard

Dashboard React berhasil menampilkan visualisasi operasional yang informatif. Halaman Dashboard utama menampilkan 4 stat cards di bagian atas: Active Trucks, Active Excavators, Active Hauling, dan Today's Production. Setiap card menampilkan nilai current plus trend indicator (up/down arrow dengan persentase).

Di bawahnya ada 6 secondary stat cards yang lebih compact: Fleet Efficiency, Avg Cycle Time, Fuel Consumed, Active Operators, Maintenance Due, dan Safety Incidents. Layout-nya responsive, 6 columns di desktop dan 2 columns di mobile.

Weather card menampilkan kondisi cuaca terkini dengan indication apakah operasi aman dilanjutkan (green checkmark) atau harus stop (red X). Data diambil dari weather_logs table yang di-update berkala.

Interactive map dengan Leaflet menampilkan semua lokasi operasional. Mining sites ditandai marker biru, loading points marker hijau, dumping points marker merah. Polylines menghubungkan antar lokasi untuk visualisasi rute. User bisa zoom, pan, dan klik marker untuk lihat detail.

Fleet Status section menampilkan breakdown status truck dan excavator dalam format grid. Production Performance section menampilkan progress bar achievement dengan color coding: hijau kalau di atas 100%, biru kalau masih on track.

### Hasil Implementasi AI Service

AI service FastAPI berhasil meng-host 4 model ML dan menyediakan endpoint untuk inference.

Chatbot berhasil menjawab berbagai jenis pertanyaan operasional dengan akurat. Untuk pertanyaan tentang data seperti "Berapa total produksi kemarin?", sistem generate SQL query, execute, dan summarize hasilnya. Untuk pertanyaan tentang status seperti "Excavator mana yang sedang breakdown?", sistem query equipment table dan format hasilnya dalam bahasa Indonesia yang natural.

Simulator berhasil menjalankan discrete event simulation untuk berbagai skenario. Input-nya kondisi operasional (cuaca, jalan, shift) dan range jumlah equipment. Output-nya adalah ranking strategi terbaik berdasarkan projected profit dengan breakdown cost components: fuel cost, operator cost, maintenance cost, dan potential revenue.

### Hasil Uji Coba Aplikasi

Kami melakukan serangkaian uji coba untuk memastikan sistem berfungsi dengan baik sebelum di-handover ke mitra.

Uji coba pertama adalah functional testing untuk setiap endpoint API. Kami buat collection di Postman dengan test cases untuk semua endpoint, covering positive cases dan edge cases. Misalnya untuk login endpoint, kami test dengan credentials benar, credentials salah, missing fields, dan malformed input. Semua 50+ endpoints lulus test dengan behavior sesuai expectation.

Uji coba kedua adalah integration testing antara frontend dan backend. Kami manually test setiap user flow: login, navigasi ke setiap halaman, create/edit/delete operations, dan logout. Semua flow berjalan smooth tanpa error. Auto-refresh di dashboard juga verified, data update setiap 30 detik sesuai design.

Uji coba ketiga adalah ML model accuracy testing. Kami split data 80-20 untuk train dan test, hasilnya sudah saya sebutkan di section implementasi. Kami juga test dengan beberapa edge cases seperti input dengan nilai ekstrem, dan model handle dengan graceful, tidak crash atau return nilai absurd.

Uji coba keempat adalah chatbot testing dengan berbagai pertanyaan. Kami coba pertanyaan straightforward seperti "Berapa jumlah truck aktif?" dan pertanyaan yang lebih complex seperti "Bandingkan produksi shift 1 dan shift 2 kemarin". Chatbot berhasil menjawab dengan akurat untuk sebagian besar kasus, meski kadang masih struggle untuk pertanyaan yang ambiguous.

Uji coba kelima adalah load testing untuk backend API menggunakan tool untuk simulate concurrent requests dan memastikan backend bisa handle beban yang reasonable untuk operasional.

Uji coba keenam adalah deployment testing dengan Docker. Kami run docker-compose up dan verify semua service start correctly dan bisa communicate. Database migration jalan otomatis, seed data ter-insert, dan semua endpoint accessible dari browser.

## 4.2 Pembahasan

### Analisis Hasil Implementasi

Sistem yang berhasil dibangun sudah memenuhi semua functional requirements yang di-define di awal project. Arsitektur microservices terbukti memberikan fleksibilitas yang bagus untuk development dan deployment. Setiap service bisa di-update secara independen, yang sangat helpful ketika kami perlu iterate quickly pada ML models tanpa redeploy frontend.

ML models menunjukkan performance yang bervariasi. Model load weight prediction dengan R² 0.88 adalah yang paling reliable, cocok untuk estimasi produksi. Model fuel prediction dengan R² 0.74 cukup acceptable untuk estimasi biaya operasional. Model delay classifier mencapai accuracy 90% tapi AUC-nya rendah (0.50) karena data yang imbalanced. Apakah hasil ini aman digunakan? Untuk model fuel dan load weight, jawabannya ya karena error masih dalam range yang bisa ditoleransi untuk decision support (bukan sistem kritis). Untuk delay classifier, kami rekomendasikan penggunaannya sebagai indikator tambahan saja, bukan satu-satunya dasar keputusan, sambil terus mengumpulkan data untuk improve model di masa depan.

Chatbot implementation dengan RAG approach terbukti effective untuk menjawab pertanyaan tentang data operasional. Keuntungan approach ini dibanding pure LLM adalah accuracy yang terjamin karena data diambil langsung dari database, bukan generated by model. Kelemahannya adalah coverage pertanyaan yang terbatas pada apa yang bisa di-query dari database.

### Keterkaitan dengan Teori DSS

Hasil implementasi sejalan dengan teori DSS yang menekankan integrasi data, model, dan user interface. Dashboard kami menyediakan data component yang comprehensive dengan real-time updates. Model component tercover oleh ML models dan simulation engine. User interface-nya intuitive dengan visualisasi yang informatif.

Penggunaan Random Forest sebagai algoritma ML juga sesuai dengan karakteristik problem domain. Data operasional tambang memang banyak outlier dan noise, dan Random Forest known robust terhadap kondisi tersebut. Interpretability-nya juga berguna, feature importance analysis menunjukkan bahwa distance dan weather condition adalah variable yang paling influential terhadap fuel consumption, yang intuitively makes sense.

### Kelebihan dan Keterbatasan

Kelebihan utama sistem yang kami bangun adalah integrasi yang seamless antara semua komponen. User bisa mulai dari login, lihat dashboard, drill down ke detail, minta rekomendasi AI, sampai chat dengan bot, semuanya dalam satu platform tanpa perlu switch aplikasi.

Real-time capability juga jadi selling point. Dashboard auto-refresh memungkinkan supervisor untuk monitor operasi as it happens, bukan after the fact.

Keterbatasan yang kami sadari adalah belum adanya mobile app. Supervisor di lapangan seringnya pakai HP, bukan laptop. Web app memang responsive, tapi native mobile experience akan lebih baik untuk use case mereka.

Offline capability juga belum ada. Kalau koneksi internet putus, dashboard tidak bisa diakses. Padahal di remote mining site, koneksi seringkali tidak stabil.

Multi-tenancy juga belum di-support. Saat ini sistem single-tenant, satu instance untuk satu mining company. Untuk SaaS model, perlu modifikasi untuk isolasi data antar tenant.

---

# BAB V KORELASI PROGRAM STUDI INDEPENDEN DENGAN KONVERSI MATA KULIAH

## 5.1 Kegiatan Studi Independen yang Dikembangkan

Kegiatan studi independen yang kami laksanakan selama 4 minggu difokuskan pada pengembangan sistem pendukung keputusan berbasis AI untuk operasi pertambangan batubara. Kolaborasi dengan PT Mining Value Indonesia memberikan konteks industri yang riil, bukan sekadar project akademis.

Permasalahan nyata yang kami address adalah ketidakefisienan dalam pengambilan keputusan operasional di tambang. Solusi yang kami kembangkan adalah platform web-based dengan kemampuan monitoring real-time, prediksi berbasis ML, dan rekomendasi strategi berbasis simulasi.

Minggu pertama kami fokus pada requirement gathering dan system design. Komunikasi intensif dengan mentor untuk memahami domain tambang, pain points yang dihadapi operator, dan expectation terhadap sistem. Output minggu ini adalah Software Requirements Specification dan database schema design.

Minggu kedua kami mulai implementation backend dan database. Setup project structure, implementasi authentication, dan core CRUD operations untuk semua entitas. Testing setiap endpoint dengan Postman. Output minggu ini adalah backend API yang functional dengan 80% endpoints sudah working.

Minggu ketiga fokus di frontend dan AI service. Implementasi semua halaman dashboard, integrasi dengan backend API, dan training ML models. Juga mulai development chatbot dengan RAG approach. Output minggu ini adalah frontend yang connected dengan backend dan AI service yang bisa serve predictions.

Minggu keempat adalah finalisasi dan testing. Integration testing full flow, bug fixing, documentation writing, dan preparation untuk handover. Output minggu ini adalah sistem yang complete dan documented, siap untuk demo ke mitra.

### Dampak Kegiatan

Dampak bagi mitra sangat concrete: mereka mendapatkan source code aplikasi lengkap yang bisa dijadikan base untuk product development mereka. Juga dokumentasi teknis yang comprehensive supaya tim mereka bisa continue development secara mandiri. Ini bukan sekadar deliverable project, tapi real asset untuk bisnis mereka.

Dampak bagi saya pribadi juga significant. Pengalaman membangun production-grade software dengan stakeholder riil memberikan learning yang tidak bisa didapat dari project kampus. Skill teknis meningkat drastis, tapi yang lebih penting adalah soft skills: komunikasi dengan stakeholder, managing expectations, working under pressure.

## 5.2 Relevansi dengan Mata Kuliah Konversi

Kegiatan studi independen ini relevan dengan beberapa mata kuliah yang bisa dikonversi berdasarkan aktivitas dan output yang dihasilkan.

**Implementasi Proyek (4 SKS)** adalah core activity yang dominan. Selama 4 minggu, mayoritas waktu dihabiskan untuk actual coding dan building sistem. Dari backend API development, frontend dashboard implementation, sampai AI service creation. Output-nya adalah source code tiga repository yang production-ready.

**Metodologi Penelitian Terapan (3 SKS)** tercakup dalam pengembangan ML models. Kami melakukan literature review tentang algoritma ML untuk operational prediction, experimentation dengan berbagai approaches, evaluation dengan proper metrics, dan analysis of results. Proses ini scientific dan methodical, tidak asal trial and error.

**Manajemen Proyek Lapangan (3 SKS)** juga relevant karena kami mengelola project dengan timeline ketat. Weekly sprint planning, progress tracking, risk identification, dan stakeholder communication. Output-nya adalah sprint reports dan evidence of on-time delivery.

**Perencanaan Program (2 SKS)** tercakup di fase awal ketika kami menyusun requirement specification, database design, dan project timeline. Ini foundation yang penting sebelum mulai implementation.

**Evaluasi Program (2 SKS)** ada di fase testing dan feedback collection. Kami conduct systematic testing, collect feedback dari mentor, dan document lessons learned.

**Inovasi Produk (2 SKS)** tercermin dari fitur-fitur inovatif yang kami kembangkan, seperti hybrid simulation engine dan RAG chatbot. Ini bukan sekadar CRUD app standar, tapi ada inovasi teknologi yang meaningful.

**Komunikasi Ilmiah dan Diseminasi (2 SKS)** tercakup dalam penulisan dokumentasi teknis, presentation ke mitra, dan laporan akhir ini. Kemampuan mengartikulasikan technical content untuk audience yang berbeda adalah skill yang terasah.

**Etika Profesional dan Mitra (2 SKS)** tercermin dari bagaimana kami berinteraksi dengan mentor dari PT Mining Value Indonesia. Komunikasi yang profesional, delivery yang tepat waktu, dan handling feedback dengan mature.

---

# BAB VI RENCANA TINDAK LANJUT DAN REKOMENDASI

## 6.1 Rencana Tindak Lanjut

Setelah completion studi independen ini, beberapa rencana tindak lanjut sudah didiskusikan dengan pihak mitra.

Untuk jangka pendek, PT Mining Value Indonesia berencana melakukan pilot implementation di salah satu site klien. Ini field testing dengan data operasional riil untuk validate bahwa sistem benar-benar berfungsi di kondisi production. Timeline-nya sekitar 1-2 bulan setelah handover, tergantung readiness dari sisi klien.

Untuk jangka menengah, ada beberapa feature enhancement yang sudah di-roadmap. Real-time GPS tracking untuk armada adalah prioritas tinggi karena banyak diminta klien. Mobile app untuk supervisor juga penting untuk improve accessibility. Integration dengan sistem ERP klien juga di-plan untuk seamless data flow.

Untuk jangka panjang, mitra berencana productize sistem ini menjadi SaaS offering. Perlu development untuk multi-tenancy, billing integration, dan SLA management. Ini ambitious tapi feasible dengan foundation yang sudah dibangun.

Dari sisi transfer knowledge, saya sudah menyiapkan documentation yang comprehensive. README files untuk setiap service menjelaskan setup dan development workflow. Architecture Decision Records menjelaskan reasoning behind major technical decisions. Deployment guide cover step-by-step untuk berbagai environments.

## 6.2 Rekomendasi

Beberapa rekomendasi teknis untuk development selanjutnya. Migration ke TypeScript akan meningkatkan code quality dan developer experience, terutama untuk codebase yang growing. WebSocket implementation akan enable true real-time updates tanpa polling overhead. Automated testing dengan proper coverage akan prevent regression bugs saat ongoing development.

Rekomendasi manajerial: punya dedicated DevOps untuk handle infrastructure akan free up developers untuk focus di feature development. User training program sebelum rollout ke klien will ensure adoption dan maximize value dari sistem. Documented SLA dan support channels perlu untuk commercial deployment.

Rekomendasi strategis: data governance policy perlu karena data operasional mining bisa sensitive. Partnership dengan integrator lokal bisa accelerate market penetration. IP protection untuk algoritma inovatif worth considering kalau mau differentiate di market.

Untuk research lanjutan, explore deep learning untuk time-series prediction bisa improve accuracy. Reinforcement learning untuk dynamic fleet dispatching adalah area yang promising. Computer vision integration untuk automated payload estimation dari camera bisa menambah value proposition.

---

# BAB VII PENUTUP

## 7.1 Kesimpulan

Setelah empat minggu mengerjakan project ini, saya bisa bilang bahwa tujuan awal sudah tercapai. Sistem Mining Operations AI Decision Support System berhasil dibangun dengan semua fitur yang di-require. Backend API dengan 50+ endpoints sudah functional dan tested. Frontend dashboard dengan 12 halaman sudah responsive dan user-friendly. AI service dengan 4 ML models dan chatbot sudah bisa serve predictions dengan accuracy yang acceptable.

Lebih dari sekadar checklist completion, yang lebih meaningful adalah learning yang didapat selama proses. Membangun production-grade software itu ternyata berbeda jauh dari project kuliah. Ada complexity yang tidak visible dari luar: error handling, logging, security, performance optimization. Semua ini jadi hands-on learning yang sangat valuable.

Arsitektur microservices yang kami pilih terbukti tepat untuk use case ini. Flexibility untuk develop dan deploy secara independen sangat helpful. ML models dengan Random Forest memberikan balance yang bagus antara accuracy dan interpretability. RAG-based chatbot berhasil menjawab pertanyaan operasional dengan grounding di data aktual.

## 7.2 Refleksi Akhir

Secara personal, ini adalah pengalaman paling impactful sepanjang perjalanan kuliah saya. Sebelumnya, project itu ya sekadar kejar deadline, asal jadi, dapat nilai. Kali ini berbeda, ada stakeholder riil dengan expectation tinggi. Ada timeline ketat yang tidak bisa di-nego. Ada consequence kalau deliverable tidak memenuhi standard.

Banyak momen frustrasi, terutama ketika menghadapi bug yang susah di-trace atau ketika integrasi antar service tidak berjalan. Tapi justru di momen itu learning paling banyak terjadi. Skill debugging yang terasah, kemampuan googling yang makin tajam, dan mental yang lebih resilient.

Yang juga saya appreciate adalah exposure ke domain tambang. Sebelum project ini, saya tidak tahu apa-apa tentang operasi pertambangan. Sekarang saya bisa ngobrol tentang cycle time, payload factor, demurrage, dan terminologi industri lainnya. Domain knowledge ini unexpected value yang saya dapat.

Terima kasih kepada PT Mining Value Indonesia atas kesempatan kolaborasi ini. Terima kasih kepada dosen pembimbing yang memberikan guidance. Dan terima kasih kepada program ASAH 2025 yang memfasilitasi pengalaman belajar seperti ini.

Saya berharap sistem yang kami bangun bisa terus berkembang dan memberikan impact positif bagi industri pertambangan Indonesia.

---

# DAFTAR PUSTAKA

Chanda, E. K., & Dagdelen, K. (2017). Optimal Truck Dispatch in Open Pit Mines. Mining Engineering, 69(10), 25-31.

Elbrond, J. (1990). Trends in Surface Mine Planning. CIM Bulletin, 83(934), 59-62.

Munirathinam, M., & Yingling, J. C. (1994). A Review of Computer-Based Truck Dispatching Strategies for Surface Mining Operations. International Journal of Surface Mining, Reclamation and Environment, 8(1), 1-15.

Ozdemir, B., & Kumral, M. (2019). A System Dynamics Model of Truck-Shovel Operations in Surface Mines. Mineral Resources Management, 35(1), 139-156.

Scott Morton, M. S. (1971). Management Decision Systems: Computer-Based Support for Decision Making. Harvard University Press.

Ta, C. H., Kresta, J. V., Forbes, J. F., & Marquez, H. J. (2005). A Stochastic Optimization Approach to Mine Truck Allocation. International Journal of Surface Mining, Reclamation and Environment, 19(3), 162-175.

---

# LAMPIRAN

## Lampiran 1: Struktur Repository Project

```
ASAH 2025 MINING VALUE_A25-CS113_AC-05/
├── backend-express/
│   ├── src/
│   │   ├── controllers/     (16 file controller)
│   │   ├── routes/          (17 file routing)
│   │   ├── services/        (business logic)
│   │   ├── middleware/      (auth, validation)
│   │   └── utils/           (helper functions)
│   ├── prisma/
│   │   ├── schema.prisma    (1000+ baris)
│   │   └── seed/            (11 seed files)
│   └── package.json
├── mining-ops-frontend/
│   ├── src/
│   │   ├── pages/           (14 halaman)
│   │   ├── components/      (UI components)
│   │   ├── services/        (API handlers)
│   │   └── utils/           (helpers)
│   └── package.json
├── mining-ops-ai/
│   ├── api.py               (FastAPI app)
│   ├── chatbot.py           (3000+ baris)
│   ├── simulator.py         (2000+ baris)
│   ├── train_models.py      (ML training)
│   ├── models/              (6 trained models, 3 aktif)
│   └── data/                (31 CSV files)
└── docker-compose.yml
```

## Lampiran 2: Screenshot Hasil Uji Coba

[Screenshot Dashboard Overview]
[Screenshot AI Recommendations Page]  
[Screenshot Chatbot Interface]
[Screenshot Postman API Testing]
[Screenshot Docker Compose Running]

## Lampiran 3: Credentials untuk Testing

```
Admin Account:
Email: admin@mining.com
Password: password123

Supervisor Account:
Email: supervisor1@mining.com
Password: password123
```

---

**Laporan Akhir Studi Independen Tahun 2025**

---
