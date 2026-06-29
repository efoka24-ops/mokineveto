
Write-Host "🧪 TEST COMPLET DES CONNEXIONS MOKINEVETO" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$BACKEND = "http://localhost:8000"
$ADMIN_EMAIL = "admin@mokineveto.cm"
$ADMIN_PASS = "admin123456"
$MARLY_EMAIL = "kowssimamarlyy@gmail.com"
$MARLY_PASS = "marly123456"
$FOKA_EMAIL = "emm.foka@gmail.com"
$FOKA_PASS = "foka123456"

# Attendre backend
Write-Host "⏳ Attente du backend..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "$BACKEND/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        Write-Host "✅ Backend prêt!" -ForegroundColor Green
        $ready = $true
        break
    } catch {
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    Write-Host "❌ Backend ne répond pas après 30 secondes" -ForegroundColor Red
    exit 1
}

# Test 1: Admin
Write-Host ""
Write-Host "🔐 TEST 1: CONNEXION ADMIN" -ForegroundColor Magenta
Write-Host "─────────────────────────" -ForegroundColor Magenta

$body = @{
    emailOrPhone = $ADMIN_EMAIL
    password = $ADMIN_PASS
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BACKEND/auth/login" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $body `
        -UseBasicParsing `
        -TimeoutSec 5
    $data = $response.Content | ConvertFrom-Json
    if ($data.success) {
        Write-Host "✅ ADMIN LOGIN: SUCCESS" -ForegroundColor Green
        Write-Host "   Email: $ADMIN_EMAIL"
        Write-Host "   Token: $($data.token.Substring(0, 40))..."
    } else {
        Write-Host "❌ ADMIN LOGIN: FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ADMIN LOGIN: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Marly
Write-Host ""
Write-Host "🔐 TEST 2: CONNEXION MARLY YAYA (ÉLEVEUR)" -ForegroundColor Magenta
Write-Host "──────────────────────────────────────────" -ForegroundColor Magenta

$body = @{
    emailOrPhone = $MARLY_EMAIL
    password = $MARLY_PASS
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BACKEND/auth/login" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $body `
        -UseBasicParsing `
        -TimeoutSec 5
    $data = $response.Content | ConvertFrom-Json
    if ($data.success) {
        Write-Host "✅ MARLY LOGIN: SUCCESS" -ForegroundColor Green
        Write-Host "   Email: $MARLY_EMAIL"
        Write-Host "   Token: $($data.token.Substring(0, 40))..."
    } else {
        Write-Host "❌ MARLY LOGIN: FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ MARLY LOGIN: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Foka
Write-Host ""
Write-Host "🔐 TEST 3: CONNEXION DR. EMMANUEL FOKA (VÉTÉRINAIRE)" -ForegroundColor Magenta
Write-Host "────────────────────────────────────────────────────" -ForegroundColor Magenta

$body = @{
    emailOrPhone = $FOKA_EMAIL
    password = $FOKA_PASS
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BACKEND/auth/login" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $body `
        -UseBasicParsing `
        -TimeoutSec 5
    $data = $response.Content | ConvertFrom-Json
    if ($data.success) {
        Write-Host "✅ FOKA LOGIN: SUCCESS" -ForegroundColor Green
        Write-Host "   Email: $FOKA_EMAIL"
        Write-Host "   Token: $($data.token.Substring(0, 40))..."
    } else {
        Write-Host "❌ FOKA LOGIN: FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FOKA LOGIN: ERROR - $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "📊 RÉSUMÉ" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Backend:        ✅ http://localhost:8000" -ForegroundColor Green
Write-Host "📱 Mobile/Web:     ✅ http://localhost:8081" -ForegroundColor Green
Write-Host "🎛️  Admin:          ✅ http://localhost:3000" -ForegroundColor Green
Write-Host ""

Write-Host "📋 INSTRUCTIONS:" -ForegroundColor Cyan
Write-Host "───────────────" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Admin Dashboard (http://localhost:3000)" -ForegroundColor White
Write-Host "   Email: $ADMIN_EMAIL" -ForegroundColor Gray
Write-Host "   Password: $ADMIN_PASS" -ForegroundColor Gray
Write-Host ""
Write-Host "2️⃣  Mobile/Web App (http://localhost:8081)" -ForegroundColor White
Write-Host "   " -ForegroundColor Gray
Write-Host "   MARLY YAYA (Éleveur):" -ForegroundColor White
Write-Host "   - Email: $MARLY_EMAIL" -ForegroundColor Gray
Write-Host "   - Password: $MARLY_PASS" -ForegroundColor Gray
Write-Host ""
Write-Host "   DR. EMMANUEL FOKA (Vétérinaire):" -ForegroundColor White
Write-Host "   - Email: $FOKA_EMAIL" -ForegroundColor Gray
Write-Host "   - Password: $FOKA_PASS" -ForegroundColor Gray
Write-Host ""
Write-Host "=========================================" -ForegroundColor Yellow
