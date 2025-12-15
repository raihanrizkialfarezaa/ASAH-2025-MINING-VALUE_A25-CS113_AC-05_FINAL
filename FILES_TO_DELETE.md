# DAFTAR FILE YANG AKAN DIHAPUS
# Tanggal: December 15, 2025
# 
# File-file ini adalah script debugging, testing, dan dokumentasi lama
# yang tidak lagi digunakan dalam production.

## ========================================
## ROOT DIRECTORY
## ========================================

### File Debug/Test JavaScript (7 files)
- analyze-current-state.js          # Script analisis state sistem (debugging)
- analyze-data-structure.js         # Script analisis struktur data (debugging)
- analyze-db.js                      # Script analisis database (debugging)
- check-db-data.js                   # Script cek data database (debugging)
- check-services.js                  # Script cek status services (debugging)
- test-ai-dynamic.py                 # Script test AI dinamis (testing)
- test-enhancements.py               # Script test enhancements (testing)
- test-simulator-import.py           # Script test import simulator (testing)
- test-simulator-syntax.py           # Script test syntax simulator (testing)

### Dokumentasi Lama/Duplikat (13 files)
- AI_INTEGRATION_SUMMARY.md                      # Summary integrasi AI (duplikat/lama)
- CLOUDFLARE_TUNNEL_FIX.md                       # Dokumentasi fix Cloudflare (lama)
- COMPREHENSIVE_IMPLEMENTATION_SUMMARY.md        # Summary implementasi (duplikat)
- DEPLOYMENT_SUCCESS_SUMMARY.md                  # Summary deployment (duplikat)
- FINAL_SUCCESS_REPORT.md                        # Report akhir (duplikat)
- MULTI_OBJECTIVE_IMPLEMENTATION_SUMMARY.md      # Summary multi-objective (duplikat)
- MULTI_OBJECTIVE_VALIDATION.md                  # Validasi multi-objective (lama)
- PROJECT_FINALIZATION_GUIDE.md                  # Guide finalisasi project (lama)
- QUICK_FIX_CLOUDFLARE.md                        # Quick fix Cloudflare (lama)
- QUICK_REFERENCE_CARD.md                        # Reference card (duplikat)
- QUICK_REFERENCE.md                             # Reference (duplikat)
- README_SISTEM_REKOMENDASI.md                   # README sistem rekomendasi (lama)
- REMAINING_TASKS_GUIDE.md                       # Guide task tersisa (lama)

CATATAN ROOT: File PENTING yang TETAP DIPERTAHANKAN:
✓ DEPLOYMENT.md                    # Dokumentasi deployment utama
✓ QUICK_START_GUIDE.md            # Guide startup utama
✓ RESTART_GUIDE.md                # Guide restart services
✓ package.json                     # Dependencies root
✓ docker-compose.yml              # Docker configuration
✓ start-*.ps1, start-*.bat        # Startup scripts
✓ restart-backend.ps1             # Restart script

## ========================================
## BACKEND-EXPRESS
## ========================================

### File Debug/Test (2 files)
- backend-express/check-dashboard-data.js        # Script cek data dashboard (debugging)
- backend-express/check-schedules.js             # Script cek schedules (debugging)

CATATAN BACKEND: File PENTING yang TETAP DIPERTAHANKAN:
✓ backend-express/package.json     # Dependencies backend
✓ backend-express/src/**/*         # Source code utama
✓ backend-express/prisma/**/*      # Database schema & migrations
✓ backend-express/scripts/**/*     # Scripts utilities
✓ backend-express/Dockerfile       # Docker config
✓ backend-express/README.md        # Dokumentasi backend

## ========================================
## MINING-OPS-AI (Python)
## ========================================

### Screenshot & Instruksi Lama (8 files)
- mining-ops-ai/screencapture-localhost-8501-2025-11-25-15_21_41.png
- mining-ops-ai/screencapture-localhost-8501-2025-11-25-15_31_11.png
- mining-ops-ai/screencapture-localhost-8501-2025-11-25-18_26_51.png
- mining-ops-ai/screencapture-localhost-8501-2025-11-25-18_30_28.png
- mining-ops-ai/feature_correlation_heatmap.png
- mining-ops-ai/InstructionFEBE.txt              # Instruksi lama
- mining-ops-ai/instructionML.txt                # Instruksi lama
- mining-ops-ai/instructionMLops.txt             # Instruksi lama

CATATAN MINING-OPS-AI: File PENTING yang TETAP DIPERTAHANKAN:
✓ mining-ops-ai/api.py              # FastAPI main application
✓ mining-ops-ai/simulator.py        # Simulator utama
✓ mining-ops-ai/simulator_gemini.py # Simulator dengan Gemini
✓ mining-ops-ai/simulator_ollama.py # Simulator dengan Ollama
✓ mining-ops-ai/chatbot.py          # Chatbot service
✓ mining-ops-ai/chatbot_stream.py   # Chatbot streaming
✓ mining-ops-ai/dashboard.py        # Dashboard Streamlit
✓ mining-ops-ai/scheduler.py        # Scheduler service
✓ mining-ops-ai/train_models.py     # Training models
✓ mining-ops-ai/train_pipeline.py   # Training pipeline
✓ mining-ops-ai/database.py         # Database utilities
✓ mining-ops-ai/data_loader.py      # Data loader
✓ mining-ops-ai/llm_config.py       # LLM configuration
✓ mining-ops-ai/main.py             # Main entry point
✓ mining-ops-ai/create_training_data.py  # Create training data
✓ mining-ops-ai/calibrate.py        # Calibration
✓ mining-ops-ai/requirements.txt    # Python dependencies
✓ mining-ops-ai/data/**/*           # Data directory
✓ mining-ops-ai/models/**/*         # Trained models
✓ mining-ops-ai/monitoring/**/*     # Monitoring files

## ========================================
## RINGKASAN
## ========================================

Total File yang Akan Dihapus: 32 files
- Root directory: 22 files (9 debug/test + 13 dokumentasi lama)
- Backend-express: 2 files (debugging)
- Mining-ops-ai: 8 files (screenshot/instruksi lama)

KRITERIA PENGHAPUSAN:
1. File debugging sementara (analyze-*.js, check-*.js, debug-*.cjs)
2. Dokumentasi duplikat atau lama (*_SUMMARY.md, QUICK_*.md)
3. Screenshot lama dan instruksi yang sudah tidak relevan

FILE YANG AMAN & TETAP DIPERTAHANKAN:
✓ Semua file di src/, prisma/, scripts/ (source code)
✓ Semua file konfigurasi (package.json, docker-compose.yml, .env)
✓ Dokumentasi utama (DEPLOYMENT.md, QUICK_START_GUIDE.md, RESTART_GUIDE.md)
✓ Script startup (start-*.ps1, start-*.bat, restart-*.ps1)
✓ File Python production (api.py, simulator*.py, train_*.py, chatbot*.py)
✓ File Python test & validasi (test-*.py, validate_*.py, backtest.py)
✓ Data & models (data/, models/, monitoring/)

## ========================================
## CARA MENJALANKAN CLEANUP
## ========================================

1. BACKUP DULU (PENTING!):
   - Git commit semua perubahan: git add . && git commit -m "Before cleanup"
   - Atau buat backup manual folder penting

2. REVIEW file yang akan dihapus (baca file ini dengan teliti)

3. Jalankan script cleanup:
   ./cleanup-unused-files.ps1

4. Ketik "YES" untuk konfirmasi penghapusan

5. Cek hasil cleanup dan pastikan aplikasi masih berjalan normal

## ========================================
## ROLLBACK (Jika Ada Masalah)
## ========================================

Jika setelah cleanup ada masalah:
- Git: git reset --hard HEAD~1
- Manual: restore dari backup
