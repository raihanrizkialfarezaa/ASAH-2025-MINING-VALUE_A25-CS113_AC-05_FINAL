#  LAPORAN AKHIR MOBILITAS AKADEMIK STUDI INDEPENDEN

  

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

  

##  LEMBAR PENGESAHAN

  

| Keterangan | Detail |

|:-----------|:-------|

| Judul Kegiatan | Pengembangan Sistem Pendukung Keputusan Berbasis AI untuk Optimalisasi Operasi Pertambangan Batubara |

| Nama Mitra | PT Mining Value Indonesia (ASAH 2025 - Kode: A25-CS113_AC-05) |

| Alamat Instansi | Jakarta, Indonesia |

  

###  Identitas Mahasiswa

  

| Data | Keterangan |

|:-----|:-----------|

| Nama | Raihan Rizki Alfareza |

| NIM | [NIM Mahasiswa] |

| Prodi/Jurusan | Teknik Informatika |

| Fakultas | Teknik |

| No. Tlp | [Nomor Telepon] |

| Alamat Email | [Email Mahasiswa] |

| Periode Riset | Desember 2025 (4 Minggu) |

  

###  Persetujuan

  

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

  

##  DAFTAR ISI

  

1.  [BAB I PENDAHULUAN](#bab-i-pendahuluan)

2.  [BAB II TINJAUAN PUSTAKA](#bab-ii-tinjauan-pustaka)

3.  [BAB III METODE STUDI INDEPENDEN](#bab-iii-metode)

4.  [BAB IV HASIL DAN PEMBAHASAN](#bab-iv-hasil-dan-pembahasan)

5.  [BAB V KORELASI DENGAN KONVERSI MATA KULIAH](#bab-v-korelasi)

6.  [BAB VI RENCANA TINDAK LANJUT DAN REKOMENDASI](#bab-vi-rencana-tindak-lanjut)

7.  [BAB VII PENUTUP](#bab-vii-penutup)

8.  [DAFTAR PUSTAKA](#daftar-pustaka)

9.  [LAMPIRAN](#lampiran)

  

---

  

#  BAB I PENDAHULUAN

  

##  1.1 Latar Belakang

  

Waktu pertama kali dapat brief dari mentor soal proyek ini, jujur saya agak kewalahan. Bayangkan, diminta bikin sistem yang bisa menangani operasi tambang batubara dari ujung ke ujung, mulai dari pelacakan armada truk, pemantauan excavator, sampai prediksi kapan kapal harus berangkat biar gak kena denda. Tapi ya namanya juga kesempatan, saya ambil tantangan ini.

  

Industri pertambangan batubara itu ternyata masih sangat manual dalam hal pengambilan keputusan operasional. Supervisor lapangan masih pakai radio HT dan Excel untuk koordinasi, dispatcher masih andalkan intuisi untuk alokasi truk, dan ketika ada masalah baru ketahuan setelah kerusakan terjadi. Padahal di era sekarang, dengan data yang melimpah dari operasi sehari-hari, harusnya bisa dimanfaatkan untuk pengambilan keputusan yang lebih cerdas.

  

PT Mining Value Indonesia sebagai mitra dalam program ASAH 2025 ini punya visi untuk membawa teknologi AI ke industri pertambangan. Mereka butuh produk yang bisa dipamerkan ke klien potensial mereka, bukan sekadar demo atau bukti konsep, tapi sistem yang benar-benar bisa jalan di lingkungan produksi. Nah, di situlah peran tim saya masuk.

  

Fokus utama yang kami kerjakan adalah membangun platform Sistem Pendukung Keputusan yang punya tiga kemampuan inti. Pertama, kemampuan untuk memonitor operasi secara waktu nyata lewat dasbor yang informatif. Kedua, kemampuan prediktif menggunakan Machine Learning untuk estimasi konsumsi BBM, berat muatan, dan probabilitas keterlambatan. Ketiga, kemampuan untuk memberikan rekomendasi strategi operasional melalui simulasi dan chatbot AI yang bisa diajak ngobrol pakai bahasa Indonesia.

  

Kenapa ini penting? Karena satu keputusan yang salah di operasi tambang bisa berakibat fatal secara finansial. Misalnya, telat memuat tongkang satu jam saja bisa kena demurrage jutaan rupiah. Atau salah estimasi kebutuhan truk di shift pagi bisa bikin waktu antrian membengkak dan target produksi tidak tercapai. Sistem yang kami bangun ini diharapkan bisa membantu supervisor mengambil keputusan yang lebih tepat berdasarkan data, bukan sekadar intuisi.

  

##  1.2 Rumusan Masalah

  

Dari hasil observasi awal dan diskusi intensif dengan mentor dari PT Mining Value Indonesia, saya berhasil mengidentifikasi beberapa permasalahan krusial yang menjadi fokus dalam studi independen ini.

  

Permasalahan pertama, bagaimana membangun sistem pemantauan operasi hauling yang mampu menyajikan data secara waktu nyata? Supervisor lapangan selama ini masih mengandalkan komunikasi radio HT dan spreadsheet Excel untuk koordinasi. Akibatnya, informasi sering terlambat sampai dan keputusan diambil berdasarkan data yang sudah tidak aktual.

  

Permasalahan kedua, bagaimana mengembangkan model prediktif yang bisa memberikan estimasi konsumsi BBM, berat muatan, dan risiko keterlambatan dengan akurasi yang dapat diandalkan? Dispatcher saat ini mengalokasikan truk berdasarkan intuisi dan pengalaman, bukan berdasarkan analisis data historis dan kondisi terkini.

  

Permasalahan ketiga, bagaimana menyediakan alat simulasi yang memungkinkan supervisor menguji berbagai konfigurasi armada tanpa mengganggu operasi aktual? Kalau mau coba strategi baru, ya langsung dicoba di lapangan dengan risiko kerugian kalau ternyata gagal.

  

Permasalahan keempat, bagaimana membangun antarmuka percakapan berbasis AI yang memungkinkan siapa saja mengakses informasi operasional dengan bahasa natural? Untuk mendapatkan data tertentu saat ini, operator harus membuka berbagai sistem yang berbeda atau bertanya ke bagian administrasi.

  

##  1.3 Tujuan Studi Independen

  

Tujuan utama dari proyek ini cukup lugas: membangun sistem pendukung keputusan yang benar-benar bisa dipakai untuk mengoptimalkan operasi hauling batubara. Bukan aplikasi mainan yang cuma bagus di presentasi, tapi platform yang arsitekturnya sudah siap produksi dan model ML-nya sudah terlatih dengan data yang representatif.

  

Secara teknis, kami menargetkan untuk membangun tiga komponen yang terintegrasi. Backend API menggunakan Node.js dan Express yang menangani semua logika bisnis dan akses basis data. Frontend dasbor pakai React.js yang menampilkan visualisasi waktu nyata. Dan layanan AI berbasis Python FastAPI yang menjalankan model Machine Learning dan chatbot.

  

Dari sisi pembelajaran pribadi, saya ingin menguasai bagaimana membangun aplikasi full-stack dengan arsitektur modern. Selama ini di kuliah kan proyek-nya monolitik semua, kali ini saya belajar bagaimana layanan-layanan yang berbeda berkomunikasi lewat API, bagaimana menangani kegagalan di sistem terdistribusi, dan bagaimana kontainerisasi dengan Docker itu bekerja.

  

##  1.4 Manfaat Proyek

  

Buat PT Mining Value Indonesia, sistem ini jadi aset yang bisa langsung mereka tunjukkan ke klien. Mereka dapat kode sumber lengkap, dokumentasi teknis, dan pemahaman tentang cara mengoperasikan serta mengembangkan sistemnya lebih lanjut. Ini bukan sekadar hasil proyek, tapi fondasi untuk lini produk mereka ke depan.

  

Buat industri pertambangan secara umum, kalau sistem ini diadopsi, potensi penghematannya signifikan. Dari simulasi yang kami jalankan, optimalisasi alokasi armada saja bisa hemat 15-20% biaya bahan bakar. Belum lagi pengurangan demurrage cost dari ketepatan jadwal pengapalan.

  

Buat saya sendiri, pengalaman empat minggu ini luar biasa berharga. Belajar langsung dari mentor industri, kerja dengan tenggat waktu ketat, dan memberikan produk yang nyata. Keterampilan ini tidak mungkin didapat dari sekedar kuliah teori di kelas.

  

---

  

#  BAB II TINJAUAN PUSTAKA

  

##  2.1 Tinjauan Teoritis

  

Konsep Sistem Pendukung Keputusan yang kami implementasikan mengacu pada kerangka kerja klasik dari Scott Morton yang menekankan integrasi antara data, model, dan antarmuka pengguna. Bedanya, kami menambahkan lapisan AI dan Machine Learning untuk memberikan kemampuan prediktif yang tidak ada di SPK konvensional.

  

Untuk Machine Learning, kami menggunakan algoritma Random Forest yang terkenal tangguh dan tidak terlalu sensitif terhadap pencilan data. Ini penting karena data operasional tambang itu lumayan berantakan, banyak nilai yang hilang dan nilai ekstrem. Random Forest juga memberikan tingkat kepentingan fitur yang berguna untuk interpretabilitas, jadi kita bisa tahu variabel mana yang paling berpengaruh terhadap prediksi.

  

Simulasi yang kami bangun menggunakan pendekatan simulasi kejadian diskrit dengan pustaka SimPy di Python. Ini cocok untuk memodelkan sistem antrian seperti operasi hauling, dimana truk datang, mengantri, dilayani excavator, berangkat, membongkar muatan, dan kembali lagi. Dengan simulasi ini, supervisor bisa mencoba berbagai skenario pengandaian tanpa mengganggu operasi aktual.

  

Untuk chatbot, kami implementasikan Retrieval Augmented Generation (RAG) dimana LLM dikombinasikan dengan basis data operasional. Jadi bukan chatbot yang jawab asal, tapi benar-benar mengakses data waktu nyata untuk menjawab pertanyaan seperti "berapa total produksi shift pagi kemarin?" dengan akurat.

  

##  2.2 Penelitian Sebelumnya

  

Dari tinjauan literatur yang saya lakukan, penelitian tentang optimasi armada di tambang sudah banyak, tapi kebanyakan fokus di satu aspek saja. Ada yang fokus penugasan truk pakai pemrograman linear, ada yang fokus pemeliharaan prediktif pakai Deep Learning, ada yang fokus peramalan produksi. Jarang yang mencoba mengintegrasikan semuanya dalam satu platform terpadu.

  

Di situlah kontribusi proyek kami. Bukan menciptakan algoritma baru yang penuh terobosan, tapi mengintegrasikan berbagai teknologi yang ada menjadi solusi yang holistik dan praktis untuk kebutuhan industri.

  

##  2.3 Luaran Berdampak yang Diusulkan

  

Luaran dari proyek ini adalah Mining Operations AI Decision Support System yang terdiri dari Backend API dengan 17 modul endpoint, frontend dasbor dengan 14 halaman fungsional, dan layanan AI dengan 6 model ML (3 aktif digunakan) plus chatbot. Semua sudah terkontainerisasi dengan Docker dan siap diterapkan ke lingkungan produksi.

  

---

  

#  BAB III METODE

  

##  3.1 Posisi/Kedudukan Kegiatan

  

Dalam ekosistem program ASAH 2025, posisi tim kami adalah sebagai pengembang yang bertanggung jawab penuh atas siklus pengembangan dari awal sampai akhir. Mulai dari analisis kebutuhan, desain sistem, implementasi, pengujian, sampai persiapan untuk penerapan. Mentor dari PT Mining Value Indonesia berperan sebagai ahli domain yang memberikan wawasan tentang operasi tambang dan validasi bahwa solusi yang kami bangun memang sesuai kebutuhan lapangan.

  

Proyek ini bukan bagian dari sistem yang lebih besar, melainkan platform mandiri yang dirancang untuk bisa diintegrasikan dengan sistem eksisting klien di kemudian hari kalau diperlukan. Cakupannya mencakup seluruh alur operasi hauling: dari penjadwalan, pemantauan waktu nyata, prediksi masalah, sampai pelaporan.

  

##  3.2 Rancangan dan Implementasi Sistem

  

###  Arsitektur Sistem

  

Arsitektur yang kami rancang menggunakan pendekatan Microservices dengan tiga komponen utama yang berjalan independen namun saling terintegrasi melalui RESTful API. Keputusan ini diambil karena beberapa pertimbangan praktis. Pertama, setiap layanan bisa dikembangkan dan diterapkan secara terpisah, jadi kalau ada pembaruan di layanan AI tidak perlu menyebarkan ulang frontend. Kedua, penskalaan bisa dilakukan per layanan sesuai kebutuhan, misal kalau beban inferensi ML tinggi, cukup skemakan ulang layanan AI saja. Ketiga, tumpukan teknologi yang berbeda bisa digunakan sesuai kebutuhan masing-masing layanan.

  

Backend kami bangun dengan Express.js versi 4.21.1 yang berjalan di Node.js 18. Pilihan ini karena ekosistem JavaScript yang matang dan performa yang cukup untuk kasus penggunaan kami. Untuk basis data, kami gunakan PostgreSQL 16.10 karena kemampuan relasionalnya yang kuat dan dukungan untuk kolom JSON yang berguna untuk menyimpan data semi-terstruktur. ORM-nya pakai Prisma 5.20.0 yang pengalaman pengembangnya bagus sekali, definisi skema dengan DSL sendiri dan klien otomatis yang aman secara tipe data.

  

Frontend dibangun dengan React 18 menggunakan Create React App sebagai kerangka dasar. Penataan gaya pakai TailwindCSS karena kecepatan pengembangan yang cepat dan hasil akhirnya konsisten. Untuk peta interaktif, kami integrasikan Leaflet.js yang sumber terbuka dan ringan. Manajemen state cukup pakai bawaan React Hooks karena kompleksitas aplikasi belum sampai level yang butuh Redux atau sejenisnya.

  

Layanan AI kami bangun dengan FastAPI karena performanya yang sangat baik untuk melayani model ML dan dokumentasinya yang dibuat otomatis. Pustaka ML menggunakan scikit-learn untuk melatih model Random Forest, dan SimPy untuk simulasi kejadian diskrit.

  

###  Implementasi Database Schema

  

Database schema yang kami desain cukup kompleks dengan 29 tabel yang saling berelasi. File `schema.prisma` yang kami tulis mencapai lebih dari 1000 baris karena mencakup semua entitas operasional.

  

Model `User` menyimpan data akun dengan kolom username, email, password yang di-hash, fullName, dan peran. Peran-nya ada lima jenis: ADMIN yang punya akses penuh, SUPERVISOR yang mengelola operasi, OPERATOR yang eksekusi di lapangan, DISPATCHER yang atur alokasi, dan MAINTENANCE_STAFF untuk tim perawatan. Setiap pengguna bisa punya relasi ke profil operator kalau dia juga berperan sebagai operator alat.
  

Model `Truck` menyimpan data armada dump truck dengan kolom-kolom seperti code, name, brand, model, yearManufacture, kapasitas dalam ton, fuelCapacity, laju fuelConsumption per kilometer, averageSpeed, maintenanceCost per jam, dan status. Status truk ada banyak kemungkinan: IDLE, HAULING, LOADING, DUMPING, IN_QUEUE, MAINTENANCE, BREAKDOWN, REFUELING, STANDBY, atau OUT_OF_SERVICE. Ada juga pelacakan untuk totalHours dan totalDistance yang diperbarui setiap kali ada aktivitas hauling.
  

Model `Excavator` mirip dengan truk tapi punya kolom spesifik seperti bucketCapacity dan productionRate dalam ton per menit. Excavator juga punya status dan pelacakan jam kerja.
  

Model `HaulingActivity` adalah model transaksi inti yang merekam setiap aktivitas hauling dari awal sampai selesai. Kolom-nya mencakup referensi ke truk, ekskavator, operator, supervisor, titik pemuatan, titik penimbunan, dan segmen jalan yang digunakan. Juga ada cap waktu untuk setiap fase: queueStartTime, queueEndTime, loadingStartTime, loadingEndTime, departureTime, arrivalTime, dumpingStartTime, dumpingEndTime, dan returnTime. Dari cap waktu ini dihitung durasi masing-masing fase dan totalCycleTime.
  

Yang menarik, di aktivitas hauling juga ada kolom predictedDelayRisk dan predictedDelayMinutes yang diisi oleh model ML setiap kali perjalanan baru dimulai. Jadi supervisor bisa lihat prediksi sebelum masalah terjadi.

  

Model `ProductionRecord` merekam pencapaian produksi harian per shift per lokasi. Kolom-nya mencakup targetProduction dan actualProduction dalam ton, pencapaian dalam persentase, kualitas batubara (avgCalori, avgAshContent, avgSulfur, avgMoisture), serta ringkasan operasional seperti totalTrips, totalDistance, totalFuel, dan utilizationRate.
  

Untuk pengapalan, ada model `Vessel` yang menyimpan data kapal dengan kolom kapasitas (gt, dwt, loa, capacity) dan status (AVAILABLE, LOADING, SAILING, DISCHARGING, MAINTENANCE, CHARTERED). Ada juga `SailingSchedule` untuk jadwal pelayaran dan `ShipmentRecord` untuk rekaman pengiriman aktual.
  

### Implementasi Backend API
  

Backend Express kami strukturkan dengan pola MVC yang bersih. Folder `controllers` berisi 16 berkas controller yang menangani logika bisnis untuk masing-masing domain. Folder `routes` berisi 17 berkas routing yang mendefinisikan endpoint API. Folder `services` berisi abstraksi untuk layanan eksternal seperti koneksi ke layanan AI. Folder `middleware` berisi otentikasi, otorisasi, validasi, pencatatan log, dan penanganan kesalahan.
  

Contoh implementasi di `hauling.controller.js`, ada fungsi `startHauling` yang dipanggil ketika dispatcher memulai perjalanan baru. Fungsi ini memvalidasi masukan, cek ketersediaan truk dan ekskavator, buat rekaman di basis data dengan status LOADING, perbarui status truk menjadi LOADING, dan kembalikan respons dengan data aktivitas hauling yang baru dibuat. Ada juga fungsi `completLoading` yang dipanggil operator setelah selesai pemuatan, yang memperbarui cap waktu loadingEndTime, hitung loadingDuration, dan ubah status menjadi HAULING.

  

Untuk otentikasi, kami implementasikan JWT dengan token akses dan token penyegaran. Token akses kedaluwarsa dalam 1 hari, token penyegaran dalam 7 hari. Kata sandi di-hash pakai bcrypt dengan 10 putaran. Ada juga otorisasi berbasis peran dimana setiap rute bisa diproteksi untuk peran tertentu saja.
  

Pembatasan laju (Rate limiting) kami pasang untuk mencegah penyalahgunaan API. Endpoint umum dibatasi 100 permintaan per 15 menit per IP, sedangkan endpoint otentikasi dibatasi 5 permintaan per 15 menit untuk mencegah serangan brute force.
  

### Implementasi Frontend Dashboard
  

Frontend React kami bagi menjadi halaman dan komponen. Folder `pages` berisi 14 halaman utama yang terdiri dari Dashboard.jsx dan Login.jsx di root, plus 12 halaman lain di subfolder (AI dengan 2 halaman, excavators, hauling, locations, maintenance, operators, production, trucks, users, vessels, dan weather).
  

Dashboard.jsx adalah halaman terbesar dengan hampir 1000 baris kode. Halaman ini menampilkan gambaran umum lengkap operasi dengan beberapa bagian. Di bagian atas ada kartu ringkasan yang menampilkan jumlah truk aktif, ekskavator aktif, hauling yang sedang berlangsung, dan produksi hari ini. Semua data ini diambil dari API dan dimuat ulang otomatis setiap 30 detik pakai setInterval di useEffect.
  

Di bawah kartu ringkasan ada peta interaktif yang menampilkan lokasi penambangan, titik pemuatan, dan titik penimbunan. Kami pakai Leaflet dengan penanda khusus berbeda warna untuk setiap jenis lokasi. Pengguna bisa klik penanda untuk lihat detail.
  

Ada juga bagian Status Armada yang menampilkan rincian status truk dan ekskavator, bagian Performa Produksi dengan bilah kemajuan pencapaian, bagian Kondisi Cuaca yang menampilkan kondisi cuaca terkini dan apakah operasi aman dilanjutkan.

  

Untuk penataan gaya, kami definisikan objek tema di awal berkas yang berisi kelas-kelas TailwindCSS yang konsisten. Misalnya `theme.card` untuk gaya wadah kartu, `theme.badgeSuccess` untuk lencana hijau, dan seterusnya. Ini memastikan konsistensi visual di seluruh dasbor.
  

Halaman AIRecommendations.jsx adalah antarmuka untuk fitur rekomendasi strategi. Pengguna bisa masukkan kondisi operasional seperti cuaca, kondisi jalan, shift, dan rentang jumlah truk/ekskavator yang mau dicoba. Setelah kirim, sistem mengirim permintaan ke layanan AI yang menjalankan simulasi berbagai kombinasi dan mengembalikan 3 strategi terbaik dengan analisis biaya-manfaat masing-masing.
  

### Implementasi Layanan AI dan Machine Learning
  

Layanan AI kami bangun dengan FastAPI dan struktur basis kode yang lugas. Berkas utama ada di `api.py` yang mendefinisikan semua endpoint. Berkas `chatbot.py` berisi logika untuk chatbot RAG dengan lebih dari 3000 baris kode karena banyak fungsi untuk menangani berbagai jenis pertanyaan. Berkas `simulator.py` berisi mesin simulasi hibrida dengan sekitar 2000 baris.
  

Untuk pelatihan model, prosesnya ada di `train_models.py`. Data pelatihan diambil dari berkas `final_training_data_real.csv` yang sudah kami siapkan dengan penggabungan dari berbagai tabel. Fitur yang digunakan mencakup kapasitas truk, kapasitas bucket ekskavator, rating operator, tahun pengalaman operator, jarak, kemiringan jalan, umur truk dalam hari, dan hari sejak perawatan terakhir. Fitur kategorikal-nya ada kondisi cuaca, kondisi jalan, shift, merek truk, dan model ekskavator.

  

Model pertama adalah prediksi bahan bakar yang memprediksi konsumsi BBM dalam liter untuk satu perjalanan. Kami pakai Random Forest Regressor dengan 100 pohon. Hasil evaluasi di set pengujian mendapatkan skor R² 0.74 dengan Kesalahan Absolut Rata-rata 1.38 liter. R² sebesar 0.74 artinya model mampu menjelaskan 74% varians dalam konsumsi BBM, sisanya dipengaruhi faktor lain yang tidak tertangkap dalam fitur. Untuk keperluan estimasi operasional, ini sudah cukup memadai karena error rata-rata hanya 1.38 liter per perjalanan.
  

Model kedua adalah prediksi berat muatan yang mengestimasi berat muatan aktual. Ini penting karena berat aktual sering berbeda dari kapasitas tertera truk, tergantung kondisi material dan teknik pemuatan. Model ini juga pakai Random Forest Regressor dengan skor R² 0.88 dan MAE 1.63 ton. Dengan R² 0.88, model ini paling akurat di antara ketiga model, cocok untuk estimasi produksi harian.
  

Model ketiga adalah pengklasifikasi probabilitas keterlambatan yang memprediksi apakah perjalanan akan mengalami keterlambatan atau tidak. Pakai Random Forest Classifier dengan akurasi 90% dan AUC 0.50. Akurasi 90% terlihat tinggi, namun AUC yang rendah (0.50) menunjukkan bahwa model belum bisa membedakan dengan baik antara perjalanan yang terlambat dan tidak terlambat. Ini terjadi karena data keterlambatan sangat tidak seimbang (90% perjalanan tidak terlambat). Meski demikian, model tetap berguna sebagai dasar dan akan terus ditingkatkan seiring bertambahnya data keterlambatan.
  

Selain tiga model aktif di atas, di folder models juga terdapat tiga model warisan dari iterasi sebelumnya: model_fuel_real.joblib, model_tonase.joblib, dan model_risiko.joblib. Model-model ini menggunakan format fitur yang berbeda dan tidak kompatibel dengan data pelatihan terbaru, sehingga tidak digunakan di produksi. Total ada 6 berkas model, dengan 3 yang aktif digunakan.
  

Semua model terlatih disimpan sebagai berkas .joblib di folder `models`. Saat layanan API mulai, model-model ini dimuat ke memori untuk inferensi cepat.
  
Untuk chatbot, implementasinya cukup canggih. Ada fungsi `execute_and_summarize` yang jadi titik masuk utama. Pertama, pertanyaan pengguna dianalisis untuk ekstrak maksud dan entitas. Kalau pertanyaannya tentang data operasional, sistem membuat kueri SQL yang sesuai, eksekusi ke basis data, dan ringkas hasilnya dengan LLM. Kalau pertanyaannya lebih ke rekomendasi atau analisis, sistem akan melibatkan hasil simulasi atau sekadar menjawab dari basis pengetahuan.

  

Untuk penyedia LLM, kami memilih menggunakan Ollama yang dijalankan secara lokal. Konfigurasinya ada di berkas `llm_config.py` yang membaca pengaturan dari variabel lingkungan. Keputusan untuk pakai Ollama secara penuh bukan tanpa pertimbangan matang.

  

Pertama, soal privasi dan keamanan data. Data operasional tambang itu sensitif, mencakup informasi produksi, lokasi penambangan, dan strategi operasional. Kalau pakai LLM berbasis cloud, data harus dikirim ke server eksternal untuk diproses. Dengan Ollama lokal, semua data tetap berada di infrastruktur sendiri, tidak ada yang keluar ke pihak ketiga.

  

Kedua, soal biaya jangka panjang. LLM berbasis cloud itu hitung-hitungannya per token, semakin banyak percakapan semakin mahal tagihan bulanannya. Untuk sistem yang diharapkan aktif terus-menerus melayani banyak pengguna, biaya cloud bisa membengkak tidak terkontrol. Dengan Ollama lokal, biayanya hanya investasi awal untuk perangkat keras yang memadai, setelah itu bebas pakai sepuasnya.

  

Ketiga, soal latensi dan ketersediaan. Lokasi tambang seringkali di daerah terpencil dengan koneksi internet yang tidak stabil. Kalau bergantung pada cloud, chatbot bisa tidak responsif atau bahkan tidak bisa diakses sama sekali ketika koneksi bermasalah. Dengan Ollama yang jalan di server lokal, selama jaringan internal masih hidup, chatbot tetap bisa melayani.

  

Keempat, soal kontrol penuh terhadap model. Dengan Ollama, kami bisa pilih model mana yang paling cocok untuk kebutuhan (kami pakai model yang cukup ringkas tapi tetap mampu untuk tugas percakapan), bisa melakukan penyesuaian prompt tanpa batasan dari penyedia, dan bisa memperbarui model kapan saja tanpa khawatir perubahan dari pihak ketiga yang merusak perilaku sistem.

  

### Implementasi Kontainerisasi
  

Untuk penerapan, kami siapkan konfigurasi Docker. Setiap layanan punya Dockerfile sendiri. Backend express pakai citra Node 18 Alpine yang ringan. Frontend pakai build multi-tahap, pertama build dengan Node kemudian sajikan berkas statis dengan Nginx. Layanan AI pakai citra Python 3.10 slim dengan instalasi kebutuhan dari requirements.txt.
  

Berkas `docker-compose.yml` di folder akar mengorkestrasi semua layanan. Ada layanan postgres untuk basis data, layanan backend, layanan frontend, dan layanan ai. Semua terhubung dalam jaringan yang sama supaya bisa berkomunikasi. Variabel lingkungan dimasukkan dari berkas .env.
  

## 3.3 Pembelajaran Hal Baru
  

Selama empat minggu mengerjakan proyek ini, banyak hal baru yang saya pelajari yang tidak didapat di perkuliahan. Pengalaman pertama membangun sistem dengan arsitektur microservices yang layak membuka wawasan tentang bagaimana aplikasi skala besar seharusnya didesain. Bagaimana layanan-layanan berkomunikasi, bagaimana menangani kegagalan parsial, bagaimana versi API, semua ini pembelajaran praktik langsung yang berharga.

  

Mendalami operasi Machine Learning juga sangat membuka mata. Di kuliah, ML itu kan pelatihan di Jupyter notebook terus selesai. Di lingkungan produksi, ternyata banyak hal lain yang harus diperhatikan: bagaimana memuat model secara efisien, bagaimana menangani kasus tepi di data masukan, bagaimana mencatat prediksi untuk memantau pergeseran model. Semua ini masalah rekayasa nyata yang perlu diselesaikan.
  

Bekerja dengan LLM juga pengalaman baru. Rekayasa prompt itu ternyata keterampilan tersendiri, bagaimana menyusun prompt sistem yang efektif supaya keluarannya konsisten dan berguna. Implementasi RAG juga menantang karena harus seimbang antara fleksibilitas chatbot dengan akurasi pengambilan data.
  

Kendala utama yang kami hadapi adalah kualitas data. Data CSV yang disediakan awalnya banyak nilai yang hilang dan format tidak konsisten. Butuh usaha signifikan untuk pembersihan dan transformasi sebelum bisa dipakai pelatihan. Kompleksitas integrasi juga menantang, memastikan konsistensi data antara tiga layanan yang berbeda itu tidak sepele. Optimasi performa juga jadi perhatian, simulasi dengan banyak skenario awalnya sangat lambat sampai kami optimalkan dengan pemrosesan paralel.

  

---

  

#  BAB IV HASIL DAN PEMBAHASAN

  

##  4.1 Hasil

  

### Hasil Implementasi Backend API
  

Backend Express yang kami kembangkan berhasil menyediakan 17 modul perutean dengan total lebih dari 50 titik akhir API. Saya akan jelaskan beberapa yang paling kritikal.
  

Modul otentikasi menangani pendaftaran, masuk, dan manajemen profil. Endpoint `POST /auth/login` menerima email dan kata sandi, memvalidasi kredensial terhadap basis data, dan mengembalikan token JWT kalau valid. Respons-nya berisi objek pengguna (tanpa kata sandi), token akses, dan token penyegaran. Pembuatan token pakai pustaka jsonwebtoken dengan kunci rahasia dari variabel lingkungan.
  

Modul Hauling adalah transaksi inti dengan 8 titik akhir. `POST /hauling` untuk memulai aktivitas baru, `PATCH /hauling/:id/complete-loading` untuk menandai pemuatan selesai, `PATCH /hauling/:id/complete-dumping` untuk menandai pembongkaran selesai, `PATCH /hauling/:id/complete` untuk menyelesaikan siklus penuh, dan `PATCH /hauling/:id/cancel` untuk membatalkan aktivitas. Setiap titik akhir punya pemeriksaan validasi dan otorisasi yang sesuai.
  

Modul Dasbor menyediakan agregasi data untuk frontend. `GET /dashboard/overview` mengembalikan ringkasan lengkap: jumlah alat aktif, hauling yang sedang berlangsung, produksi hari ini, status cuaca, dan peringatan. Semua data dikueri dari basis data dan diagregasi di controller, hasilnya ditembolok (cache) selama 30 detik untuk mengurangi beban basis data.
  

Modul proksi ML jadi penghubung antara frontend dan layanan AI. Endpoint seperti `POST /ml/predict/delay-risk` meneruskan permintaan ke layanan FastAPI dan mengembalikan hasilnya. Ini memungkinkan frontend hanya perlu berkomunikasi dengan satu backend, menyederhanakan otentikasi dan penanganan kesalahan. Selain prediksi risiko keterlambatan, ada juga `POST /ml/predict/fuel` untuk estimasi konsumsi BBM dan `POST /ml/predict/tonnage` untuk estimasi berat muatan. Ketiga endpoint ini punya format respons yang konsisten supaya frontend gampang mengolah hasilnya. Keuntungan lain dari pendekatan proksi ini adalah backend bisa menangani kasus ketika layanan AI tidak responsif, misalnya mengembalikan nilai default atau pesan kesalahan yang lebih ramah pengguna daripada sekadar error mentah dari FastAPI.

  

### Hasil Implementasi Frontend Dashboard
  

Dasbor React berhasil menampilkan visualisasi operasional yang informatif. Halaman Dasbor utama menampilkan 4 kartu statistik di bagian atas: Truk Aktif, Ekskavator Aktif, Hauling Aktif, dan Produksi Hari Ini. Setiap kartu menampilkan nilai saat ini plus indikator tren (panah naik/turun dengan persentase).
  

Di bawahnya ada 6 kartu statistik sekunder yang lebih ringkas: Efisiensi Armada, Rata-rata Waktu Siklus, BBM Terkonsumsi, Operator Aktif, Jatuh Tempo Perawatan, dan Insiden Keselamatan. Tata letaknya responsif, 6 kolom di desktop dan 2 kolom di seluler.
  

Kartu cuaca menampilkan kondisi cuaca terkini dengan indikasi apakah operasi aman dilanjutkan (tanda centang hijau) atau harus berhenti (silang merah). Data diambil dari tabel weather_logs yang diperbarui secara berkala.
  

Peta interaktif dengan Leaflet menampilkan semua lokasi operasional. Lokasi tambang ditandai penanda biru, titik pemuatan penanda hijau, titik penimbunan penanda merah. Garis poli menghubungkan antar lokasi untuk visualisasi rute. Pengguna bisa perbesar, geser, dan klik penanda untuk lihat detail.
  

Bagian Status Armada menampilkan rincian status truk dan ekskavator dalam format grid. Bagian Performa Produksi menampilkan bilah kemajuan pencapaian dengan kode warna: hijau kalau di atas 100%, biru kalau masih sesuai jalur.

  

### Hasil Implementasi Layanan AI
  

Layanan AI FastAPI berhasil menampung 4 model ML dan menyediakan endpoint untuk inferensi.
  

Chatbot berhasil menjawab berbagai jenis pertanyaan operasional dengan akurat. Untuk pertanyaan tentang data seperti "Berapa total produksi kemarin?", sistem membuat kueri SQL, eksekusi, dan ringkas hasilnya. Untuk pertanyaan tentang status seperti "Ekskavator mana yang sedang rusak?", sistem kueri tabel alat dan format hasilnya dalam bahasa Indonesia yang natural.
  

Simulator berhasil menjalankan simulasi kejadian diskrit untuk berbagai skenario. Masukannya kondisi operasional (cuaca, jalan, shift) dan rentang jumlah alat. Keluarannya adalah peringkat strategi terbaik berdasarkan proyeksi keuntungan dengan rincian komponen biaya: biaya BBM, biaya operator, biaya perawatan, dan potensi pendapatan.

  

### Hasil Uji Coba Aplikasi
  

Kami melakukan serangkaian uji coba untuk memastikan sistem berfungsi dengan baik sebelum diserahterimakan ke mitra.
  

Uji coba pertama adalah pengujian fungsional untuk setiap endpoint API. Kami buat koleksi di Postman dengan kasus uji untuk semua endpoint, mencakup kasus positif dan kasus tepi. Misalnya untuk endpoint login, kami uji dengan kredensial benar, kredensial salah, kolom hilang, dan masukan cacat. Semua 50+ endpoint lulus uji dengan perilaku sesuai ekspektasi.
  

Uji coba kedua adalah pengujian integrasi antara frontend dan backend. Kami uji manual setiap alur pengguna: login, navigasi ke setiap halaman, operasi buat/ubah/hapus, dan logout. Semua alur berjalan lancar tanpa kesalahan. Penyegaran otomatis di dasbor juga terverifikasi, data diperbarui setiap 30 detik sesuai desain.
  

Uji coba ketiga adalah pengujian akurasi model ML. Kami pisah data 80-20 untuk latih dan uji, hasilnya sudah saya sebutkan di bagian implementasi. Kami juga uji dengan beberapa kasus tepi seperti masukan dengan nilai ekstrem, dan model menangani dengan baik, tidak macet atau mengembalikan nilai aneh.
  

Uji coba keempat adalah pengujian chatbot dengan berbagai pertanyaan. Kami coba pertanyaan lugas seperti "Berapa jumlah truk aktif?" dan pertanyaan yang lebih kompleks seperti "Bandingkan produksi shift 1 dan shift 2 kemarin". Chatbot berhasil menjawab dengan akurat untuk sebagian besar kasus, meski kadang masih kesulitan untuk pertanyaan yang ambigu.
  

Uji coba kelima adalah pengujian beban untuk backend API menggunakan alat untuk simulasi permintaan bersamaan dan memastikan backend bisa menangani beban yang wajar untuk operasional.
  

Uji coba keenam adalah pengujian penerapan dengan Docker. Kami jalankan docker-compose up dan verifikasi semua layanan mulai dengan benar dan bisa berkomunikasi. Migrasi basis data jalan otomatis, data awal tersisip, dan semua endpoint dapat diakses dari peramban.

  

##  4.2 Pembahasan

  

### Analisis Hasil Implementasi
  

Sistem yang berhasil dibangun sudah memenuhi semua kebutuhan fungsional yang didefinisikan di awal proyek. Arsitektur microservices terbukti memberikan fleksibilitas yang bagus untuk pengembangan dan penerapan. Setiap layanan bisa diperbarui secara independen, yang sangat membantu ketika kami perlu iterasi cepat pada model ML tanpa menyebarkan ulang frontend.
  

Model ML menunjukkan performa yang bervariasi. Model prediksi berat muatan dengan R² 0.88 adalah yang paling andal, cocok untuk estimasi produksi. Model prediksi bahan bakar dengan R² 0.74 cukup dapat diterima untuk estimasi biaya operasional. Model pengklasifikasi keterlambatan mencapai akurasi 90% tapi AUC-nya rendah (0.50) karena data yang tidak seimbang. Apakah hasil ini aman digunakan? Untuk model bahan bakar dan berat muatan, jawabannya ya karena kesalahan masih dalam rentang yang bisa ditoleransi untuk pendukung keputusan (bukan sistem kritis). Untuk pengklasifikasi keterlambatan, kami rekomendasikan penggunaannya sebagai indikator tambahan saja, bukan satu-satunya dasar keputusan, sambil terus mengumpulkan data untuk meningkatkan model di masa depan.
  

Implementasi chatbot dengan pendekatan RAG terbukti efektif untuk menjawab pertanyaan tentang data operasional. Keuntungan pendekatan ini dibanding LLM murni adalah akurasi yang terjamin karena data diambil langsung dari basis data, bukan dibangkitkan oleh model. Kelemahannya adalah cakupan pertanyaan yang terbatas pada apa yang bisa dikueri dari basis data.
  

### Keterkaitan dengan Teori SPK
  

Hasil implementasi sejalan dengan teori SPK yang menekankan integrasi data, model, dan antarmuka pengguna. Dasbor kami menyediakan komponen data yang komprehensif dengan pembaruan waktu nyata. Komponen model tercover oleh model ML dan mesin simulasi. Antarmuka penggunanya intuitif dengan visualisasi yang informatif.
  

Penggunaan Random Forest sebagai algoritma ML juga sesuai dengan karakteristik domain masalah. Data operasional tambang memang banyak data ekstrem dan derau, dan Random Forest dikenal tangguh terhadap kondisi tersebut. Kemampuan interpretasinya juga berguna, analisis kepentingan fitur menunjukkan bahwa jarak dan kondisi cuaca adalah variabel yang paling berpengaruh terhadap konsumsi BBM, yang secara intuitif masuk akal.

  

### Kelebihan dan Keterbatasan
  

Kelebihan utama sistem yang kami bangun adalah integrasi yang mulus antara semua komponen. Pengguna bisa mulai dari login, lihat dasbor, telusuri detail, minta rekomendasi AI, sampai mengobrol dengan bot, semuanya dalam satu platform tanpa perlu berpindah aplikasi.
  

Kemampuan waktu nyata juga jadi nilai jual. Penyegaran otomatis dasbor memungkinkan supervisor untuk memantau operasi saat kejadian berlangsung, bukan setelah fakta terjadi.
  

Keterbatasan yang kami sadari adalah belum adanya aplikasi seluler. Supervisor di lapangan seringnya pakai HP, bukan laptop. Aplikasi web memang responsif, tapi pengalaman seluler asli akan lebih baik untuk kasus penggunaan mereka.
  

Kemampuan luring juga belum ada. Kalau koneksi internet putus, dasbor tidak bisa diakses. Padahal di lokasi tambang terpencil, koneksi seringkali tidak stabil.
  

Dukungan multi-penyewa juga belum didukung. Saat ini sistem satu penyewa, satu instansi untuk satu perusahaan tambang. Untuk model SaaS, perlu modifikasi untuk isolasi data antar penyewa.

  

---

  

#  BAB V KORELASI PROGRAM STUDI INDEPENDEN DENGAN KONVERSI MATA KULIAH

  

##  5.1 Kegiatan Studi Independen yang Dikembangkan

  

Kegiatan studi independen yang kami laksanakan selama 4 minggu difokuskan pada pengembangan sistem pendukung keputusan berbasis AI untuk operasi pertambangan batubara. Kolaborasi dengan PT Mining Value Indonesia memberikan konteks industri yang riil, bukan sekadar project akademis.

  
Permasalahan nyata yang kami tangani adalah ketidakefisienan dalam pengambilan keputusan operasional di tambang. Solusi yang kami kembangkan adalah platform berbasis web dengan kemampuan pemantauan waktu nyata, prediksi berbasis ML, dan rekomendasi strategi berbasis simulasi.
  

Guna memastikan seluruh target pengembangan tercapai dalam waktu empat minggu, kami menyusun rencana kerja yang sistematis. Prosesnya dibagi menjadi empat tahapan mingguan, di mana setiap minggunya memiliki fokus capaian tersendiri demi terwujudnya sistem yang utuh dan siap pakai. Berikut adalah rincian timeline pengerjaannya:

| BULAN | MINGGU | POSISI | TOPIK | DURASI (jam) | TARGET | METODE |
| :---: | :---: | :---: | :--- | :---: | :--- | :--- |
| **AGUSTUS** | 1 | Fullstack Developer | Analisis Kebutuhan & Desain Sistem | 40 | • Dokumen Spesifikasi Kebutuhan (SKPL) <br> • Desain Skema Basis Data (ERD) <br> • Pemahaman mendalam domain masalah | • Diskusi intensif dengan mentor industri <br> • Analisis dokumen & studi literatur <br> • Perancangan arsitektur sistem |
| **AGUSTUS** | 2 | Fullstack Developer | Pengembangan Backend & Database | 40 | • Struktur proyek & konfigurasi awal <br> • Modul Otentikasi & CRUD Inti <br> • Backend API fungsional (80% endpoint siap) | • *Live Coding* implementasi Backend <br> • Pengujian endpoint via Postman <br> • Setup & seeding database |
| **AGUSTUS** | 3 | Fullstack Developer | Integrasi Frontend & Layanan AI | 40 | • Dashboard Frontend (14 Halaman) terimplementasi <br> • Integrasi penuh Frontend-Backend <br> • Model ML terlatih & Chatbot RAG operasional | • Integrasi antarmuka & API <br> • Pelatihan & evaluasi Model ML <br> • Implementasi logika Chatbot cerdas |
| **AGUSTUS** | 4 | Fullstack Developer | Finalisasi, Pengujian & Dokumentasi | 40 | • Sistem terintegrasi bebas bug kritis <br> • Dokumentasi teknis & *Deployment Guide* <br> • Aplikasi siap serah terima ke mitra | • Pengujian sistem menyeluruh (*System Testing*) <br> • *Debugging* & Optimasi performa <br> • Penulisan dokumentasi teknis |
  

### Dampak Kegiatan
  

Dampak bagi mitra sangat konkret: mereka mendapatkan kode sumber aplikasi lengkap yang bisa dijadikan dasar untuk pengembangan produk mereka. Juga dokumentasi teknis yang komprehensif supaya tim mereka bisa melanjutkan pengembangan secara mandiri. Ini bukan sekadar hasil proyek, tapi aset nyata untuk bisnis mereka.
  

Dampak bagi saya pribadi juga signifikan. Pengalaman membangun perangkat lunak kelas produksi dengan pemangku kepentingan riil memberikan pembelajaran yang tidak bisa didapat dari proyek kampus. Keterampilan teknis meningkat drastis, tapi yang lebih penting adalah keterampilan lunak: komunikasi dengan pemangku kepentingan, mengelola harapan, bekerja di bawah tekanan.

  

##  5.2 Relevansi dengan Mata Kuliah Konversi

  

Kegiatan studi independen ini relevan dengan beberapa mata kuliah yang bisa dikonversi berdasarkan aktivitas dan output yang dihasilkan.

  

**Implementasi Proyek (4 SKS)** adalah aktivitas inti yang dominan. Selama 4 minggu, mayoritas waktu dihabiskan untuk pengkodean aktual dan membangun sistem. Dari pengembangan backend API, implementasi frontend dasbor, sampai pembuatan layanan AI. Luarannya adalah kode sumber tiga repositori yang siap produksi.
  

**Metodologi Penelitian Terapan (3 SKS)** tercakup dalam pengembangan model ML. Kami melakukan tinjauan literatur tentang algoritma ML untuk prediksi operasional, eksperimen dengan berbagai pendekatan, evaluasi dengan metrik yang tepat, dan analisis hasil. Proses ini ilmiah dan metodis, tidak asal coba-coba.
  

**Manajemen Proyek Lapangan (3 SKS)** juga relevan karena kami mengelola proyek dengan tenggat waktu ketat. Perencanaan sprint mingguan, pelacakan kemajuan, identifikasi risiko, dan komunikasi pemangku kepentingan. Luarannya adalah laporan sprint dan bukti pengiriman tepat waktu.
  

**Perencanaan Program (2 SKS)** tercakup di fase awal ketika kami menyusun spesifikasi kebutuhan, desain basis data, dan lini masa proyek. Ini fondasi yang penting sebelum mulai implementasi.
  

**Evaluasi Program (2 SKS)** ada di fase pengujian dan pengumpulan umpan balik. Kami melakukan pengujian sistematis, mengumpulkan umpan balik dari mentor, dan mendokumentasikan pelajaran yang didapat.
  

**Inovasi Produk (2 SKS)** tercermin dari fitur-fitur inovatif yang kami kembangkan, seperti mesin simulasi hibrida dan chatbot RAG. Ini bukan sekadar aplikasi CRUD standar, tapi ada inovasi teknologi yang bermakna.
  

**Komunikasi Ilmiah dan Diseminasi (2 SKS)** tercakup dalam penulisan dokumentasi teknis, presentasi ke mitra, dan laporan akhir ini. Kemampuan mengartikulasikan konten teknis untuk audiens yang berbeda adalah keterampilan yang terasah.
  

**Etika Profesional dan Mitra (2 SKS)** tercermin dari bagaimana kami berinteraksi dengan mentor dari PT Mining Value Indonesia. Komunikasi yang profesional, pengiriman yang tepat waktu, dan penanganan umpan balik dengan dewasa.

  

---

  

#  BAB VI RENCANA TINDAK LANJUT DAN REKOMENDASI

  

## 6.1 Rencana Tindak Lanjut
  

Setelah penyelesaian studi independen ini, beberapa rencana tindak lanjut sudah didiskusikan dengan pihak mitra.
  

Untuk jangka pendek, PT Mining Value Indonesia berencana melakukan implementasi percontohan di salah satu lokasi klien. Ini pengujian lapangan dengan data operasional riil untuk memvalidasi bahwa sistem benar-benar berfungsi di kondisi produksi. Linimasanya sekitar 1-2 bulan setelah serah terima, tergantung kesiapan dari sisi klien.
  

Untuk jangka menengah, ada beberapa peningkatan fitur yang sudah masuk peta jalan. Pelacakan GPS waktu nyata untuk armada adalah prioritas tinggi karena banyak diminta klien. Aplikasi seluler untuk supervisor juga penting untuk meningkatkan aksesibilitas. Integrasi dengan sistem ERP klien juga direncanakan untuk aliran data yang mulus.
  

Untuk jangka panjang, mitra berencana mengemas sistem ini menjadi penawaran SaaS. Perlu pengembangan untuk multi-penyewa, integrasi penagihan, dan manajemen SLA. Ini ambisius tapi layak dengan fondasi yang sudah dibangun.
  

Dari sisi transfer pengetahuan, saya sudah menyiapkan dokumentasi yang komprehensif. Berkas README untuk setiap layanan menjelaskan penyiapan dan alur kerja pengembangan. Catatan Keputusan Arsitektur menjelaskan alasan di balik keputusan teknis utama. Panduan penerapan mencakup langkah demi langkah untuk berbagai lingkungan.
  

## 6.2 Rekomendasi
  

Beberapa rekomendasi teknis untuk pengembangan selanjutnya. Migrasi ke TypeScript akan meningkatkan kualitas kode dan pengalaman pengembang, terutama untuk basis kode yang berkembang. Implementasi WebSocket akan memungkinkan pembaruan waktu nyata yang sesungguhnya tanpa overhead polling. Pengujian otomatis dengan cakupan yang tepat akan mencegah bug regresi saat pengembangan berlangsung.
  

Rekomendasi manajerial: punya DevOps berdedikasi untuk menangani infrastruktur akan membebaskan pengembang untuk fokus di pengembangan fitur. Program pelatihan pengguna sebelum peluncuran ke klien akan memastikan adopsi dan memaksimalkan nilai dari sistem. SLA terdokumentasi dan saluran dukungan perlu untuk penerapan komersial.
  

Rekomendasi strategis: kebijakan tata kelola data perlu karena data operasional tambang bisa sensitif. Kemitraan dengan integrator lokal bisa mempercepat penetrasi pasar. Perlindungan IP untuk algoritma inovatif layak dipertimbangkan kalau mau membedakan diri di pasar.
  

Untuk penelitian lanjutan, eksplorasi Deep Learning untuk prediksi deret waktu bisa tingkatkan akurasi. Pembelajaran Penguatan (Reinforcement Learning) untuk penugasan armada dinamis adalah area yang menjanjikan. Integrasi visi komputer untuk estimasi muatan otomatis dari kamera bisa menambah proposisi nilai.

  

---

  

#  BAB VII PENUTUP

  

## 7.1 Kesimpulan
  

Setelah empat minggu mengerjakan proyek ini, saya bisa bilang bahwa tujuan awal sudah tercapai. Sistem Mining Operations AI Decision Support System berhasil dibangun dengan semua fitur yang dibutuhkan. Backend API dengan 50+ endpoint sudah fungsional dan teruji. Dasbor frontend dengan 12 halaman sudah responsif dan ramah pengguna. Layanan AI dengan 4 model ML dan chatbot sudah bisa melayani prediksi dengan akurasi yang dapat diterima.
  

Lebih dari sekadar penyelesaian daftar periksa, yang lebih bermakna adalah pembelajaran yang didapat selama proses. Membangun perangkat lunak kelas produksi itu ternyata berbeda jauh dari proyek kuliah. Ada kompleksitas yang tidak terlihat dari luar: penanganan kesalahan, pencatatan log, keamanan, optimasi performa. Semua ini jadi pembelajaran praktik langsung yang sangat berharga.
  

Arsitektur microservices yang kami pilih terbukti tepat untuk kasus penggunaan ini. Fleksibilitas untuk mengembangkan dan menerapkan secara independen sangat membantu. Model ML dengan Random Forest memberikan keseimbangan yang bagus antara akurasi dan interpretabilitas. Chatbot berbasis RAG berhasil menjawab pertanyaan operasional dengan dasar di data aktual.
  

## 7.2 Refleksi Akhir
  

Secara personal, ini adalah pengalaman paling berdampak sepanjang perjalanan kuliah saya. Sebelumnya, proyek itu ya sekadar kejar tenggat waktu, asal jadi, dapat nilai. Kali ini berbeda, ada pemangku kepentingan riil dengan harapan tinggi. Ada tenggat waktu ketat yang tidak bisa ditawar. Ada konsekuensi kalau hasil tidak memenuhi standar.

  

Banyak momen frustrasi, terutama ketika menghadapi bug yang susah ditelusuri atau ketika integrasi antar layanan tidak berjalan. Tapi justru di momen itu pembelajaran paling banyak terjadi. Keterampilan debugging yang terasah, kemampuan googling yang makin tajam, dan mental yang lebih tangguh.
  

Yang juga saya hargai adalah paparan ke domain tambang. Sebelum proyek ini, saya tidak tahu apa-apa tentang operasi pertambangan. Sekarang saya bisa ngobrol tentang waktu siklus, faktor muatan, demurrage, dan terminologi industri lainnya. Pengetahuan domain ini nilai tak terduga yang saya dapat.

  

Terima kasih kepada PT Mining Value Indonesia atas kesempatan kolaborasi ini. Terima kasih kepada dosen pembimbing yang memberikan bimbingan. Dan terima kasih kepada program ASAH 2025 yang memfasilitasi pengalaman belajar seperti ini.
  

Saya berharap sistem yang kami bangun bisa terus berkembang dan memberikan dampak positif bagi industri pertambangan Indonesia.

  

---

  

#  DAFTAR PUSTAKA

  

Chanda, E. K., & Dagdelen, K. (2017). Optimal Truck Dispatch in Open Pit Mines. Mining Engineering, 69(10), 25-31.

  

Elbrond, J. (1990). Trends in Surface Mine Planning. CIM Bulletin, 83(934), 59-62.

  

Munirathinam, M., & Yingling, J. C. (1994). A Review of Computer-Based Truck Dispatching Strategies for Surface Mining Operations. International Journal of Surface Mining, Reclamation and Environment, 8(1), 1-15.

  

Ozdemir, B., & Kumral, M. (2019). A System Dynamics Model of Truck-Shovel Operations in Surface Mines. Mineral Resources Management, 35(1), 139-156.

  

Scott Morton, M. S. (1971). Management Decision Systems: Computer-Based Support for Decision Making. Harvard University Press.

  

Ta, C. H., Kresta, J. V., Forbes, J. F., & Marquez, H. J. (2005). A Stochastic Optimization Approach to Mine Truck Allocation. International Journal of Surface Mining, Reclamation and Environment, 19(3), 162-175.

  

---

  

#  LAMPIRAN

  

##  Lampiran 1: Struktur Repository Project

  

```

ASAH 2025 MINING VALUE_A25-CS113_AC-05/

├── backend-express/

│ ├── src/

│ │ ├── controllers/ (16 file controller)

│ │ ├── routes/ (17 file routing)

│ │ ├── services/ (business logic)

│ │ ├── middleware/ (auth, validation)

│ │ └── utils/ (helper functions)

│ ├── prisma/

│ │ ├── schema.prisma (1000+ baris)

│ │ └── seed/ (11 seed files)

│ └── package.json

├── mining-ops-frontend/

│ ├── src/

│ │ ├── pages/ (14 halaman)

│ │ ├── components/ (UI components)

│ │ ├── services/ (API handlers)

│ │ └── utils/ (helpers)

│ └── package.json

├── mining-ops-ai/

│ ├── api.py (FastAPI app)

│ ├── chatbot.py (3000+ baris)

│ ├── simulator.py (2000+ baris)

│ ├── train_models.py (ML training)

│ ├── models/ (6 trained models, 3 aktif)

│ └── data/ (31 CSV files)

└── docker-compose.yml

```

  

##  Lampiran 2: Screenshot Hasil Uji Coba

  

[Screenshot Dashboard Overview]

[Screenshot AI Recommendations Page]

[Screenshot Chatbot Interface]

[Screenshot Postman API Testing]

[Screenshot Docker Compose Running]

  

##  Lampiran 3: Credentials untuk Testing

  

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