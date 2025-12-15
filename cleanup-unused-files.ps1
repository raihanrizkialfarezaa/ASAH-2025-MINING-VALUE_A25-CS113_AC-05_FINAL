# Script untuk menghapus file-file yang tidak terpakai
# Dibuat: December 15, 2025
# PERHATIAN: Backup dulu sebelum menjalankan script ini!

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  CLEANUP SCRIPT - Hapus File Tidak Terpakai  " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Konfirmasi dulu
Write-Host "Script ini akan menghapus file-file berikut:" -ForegroundColor Yellow
Write-Host ""

$filesToDelete = @(
    # ===== ROOT DIRECTORY - FILE DEBUG/TEST =====
    "analyze-current-state.js",
    "analyze-data-structure.js",
    "analyze-db.js",
    "check-db-data.js",
    "check-services.js",
    "test-ai-dynamic.py",
    "test-enhancements.py",
    "test-simulator-import.py",
    "test-simulator-syntax.py",
    
    # ===== ROOT DIRECTORY - DOKUMENTASI LAMA/DUPLIKAT =====
    "AI_INTEGRATION_SUMMARY.md",
    "CLOUDFLARE_TUNNEL_FIX.md",
    "COMPREHENSIVE_IMPLEMENTATION_SUMMARY.md",
    "DEPLOYMENT_SUCCESS_SUMMARY.md",
    "FINAL_SUCCESS_REPORT.md",
    "MULTI_OBJECTIVE_IMPLEMENTATION_SUMMARY.md",
    "MULTI_OBJECTIVE_VALIDATION.md",
    "PROJECT_FINALIZATION_GUIDE.md",
    "QUICK_FIX_CLOUDFLARE.md",
    "QUICK_REFERENCE_CARD.md",
    "QUICK_REFERENCE.md",
    "README_SISTEM_REKOMENDASI.md",
    "REMAINING_TASKS_GUIDE.md",
    
    # ===== BACKEND-EXPRESS - FILE DEBUG/TEST =====
    "backend-express\check-dashboard-data.js",
    "backend-express\check-schedules.js",
    
    # ===== MINING-OPS-AI - FILE SCREENSHOT/INSTRUKSI LAMA =====
    "mining-ops-ai\screencapture-localhost-8501-2025-11-25-15_21_41.png",
    "mining-ops-ai\screencapture-localhost-8501-2025-11-25-15_31_11.png",
    "mining-ops-ai\screencapture-localhost-8501-2025-11-25-18_26_51.png",
    "mining-ops-ai\screencapture-localhost-8501-2025-11-25-18_30_28.png",
    "mining-ops-ai\feature_correlation_heatmap.png",
    "mining-ops-ai\InstructionFEBE.txt",
    "mining-ops-ai\instructionML.txt",
    "mining-ops-ai\instructionMLops.txt"
)

Write-Host "KATEGORI FILE YANG AKAN DIHAPUS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "[ROOT] File debug/test JavaScript:" -ForegroundColor Green
Write-Host "  - analyze-*.js (3 files)" -ForegroundColor Gray
Write-Host "  - check-*.js (2 files)" -ForegroundColor Gray
Write-Host "  - test-*.py (4 files)" -ForegroundColor Gray
Write-Host ""
Write-Host "[ROOT] Dokumentasi lama/duplikat:" -ForegroundColor Green
Write-Host "  - *_SUMMARY.md (5 files)" -ForegroundColor Gray
Write-Host "  - QUICK_*.md (3 files)" -ForegroundColor Gray
Write-Host "  - PROJECT_FINALIZATION_GUIDE.md" -ForegroundColor Gray
Write-Host "  - README_SISTEM_REKOMENDASI.md" -ForegroundColor Gray
Write-Host "  - REMAINING_TASKS_GUIDE.md" -ForegroundColor Gray
Write-Host ""
Write-Host "[BACKEND-EXPRESS] File debug:" -ForegroundColor Green
Write-Host "  - check-dashboard-data.js" -ForegroundColor Gray
Write-Host "  - check-schedules.js" -ForegroundColor Gray
Write-Host ""
Write-Host "[MINING-OPS-AI] Screenshot & instruksi lama:" -ForegroundColor Green
Write-Host "  - screencapture-*.png (4 files)" -ForegroundColor Gray
Write-Host "  - feature_correlation_heatmap.png" -ForegroundColor Gray
Write-Host "  - Instruction*.txt (3 files)" -ForegroundColor Gray
Write-Host ""

Write-Host "Total: $($filesToDelete.Count) file akan dihapus" -ForegroundColor Yellow
Write-Host ""

# Tanyakan konfirmasi
$confirmation = Read-Host "Apakah Anda yakin ingin menghapus semua file ini? (ketik 'YES' untuk konfirmasi)"

if ($confirmation -ne "YES") {
    Write-Host ""
    Write-Host "Operasi dibatalkan." -ForegroundColor Red
    Write-Host "Tidak ada file yang dihapus." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Memulai proses penghapusan..." -ForegroundColor Green
Write-Host ""

$baseDir = "b:\ASAH FEBE AI\ASAH 2025 MINING VALUE_A25-CS113_AC-05"
$deletedCount = 0
$notFoundCount = 0
$errorCount = 0

foreach ($file in $filesToDelete) {
    $fullPath = Join-Path $baseDir $file
    
    if (Test-Path $fullPath) {
        try {
            Remove-Item $fullPath -Force
            Write-Host "[OK] Dihapus: $file" -ForegroundColor Green
            $deletedCount++
        }
        catch {
            Write-Host "[ERROR] Gagal menghapus: $file" -ForegroundColor Red
            Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    }
    else {
        Write-Host "[SKIP] Tidak ditemukan: $file" -ForegroundColor Yellow
        $notFoundCount++
    }
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  HASIL CLEANUP  " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Berhasil dihapus: $deletedCount file" -ForegroundColor Green
Write-Host "Tidak ditemukan: $notFoundCount file" -ForegroundColor Yellow
Write-Host "Gagal/Error: $errorCount file" -ForegroundColor Red
Write-Host ""

if ($deletedCount -gt 0) {
    Write-Host "Cleanup selesai! Workspace Anda sekarang lebih bersih." -ForegroundColor Green
}

Write-Host ""
Write-Host "CATATAN: File-file PENTING yang TIDAK dihapus:" -ForegroundColor Cyan
Write-Host "  + package.json, docker-compose.yml" -ForegroundColor Gray
Write-Host "  + DEPLOYMENT.md, QUICK_START_GUIDE.md, RESTART_GUIDE.md" -ForegroundColor Gray
Write-Host "  + Semua file di src/, prisma/, scripts/" -ForegroundColor Gray
Write-Host "  + File Python utama: api.py, simulator.py, train_*.py" -ForegroundColor Gray
Write-Host "  + File Python test: test-*.py, validate_*.py, backtest.py" -ForegroundColor Gray
Write-Host "  + File script startup: start-*.ps1, start-*.bat" -ForegroundColor Gray
Write-Host ""
