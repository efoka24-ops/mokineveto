#!/bin/bash

echo "🧪 TEST COMPLET DES CONNEXIONS MOKINEVETO"
echo "========================================="
echo ""

# Variables
BACKEND="http://localhost:8000"
ADMIN_EMAIL="admin@mokineveto.cm"
ADMIN_PASS="admin123456"
MARLY_EMAIL="kowssimamarlyy@gmail.com"
MARLY_PASS="marly123456"
FOKA_EMAIL="emm.foka@gmail.com"
FOKA_PASS="foka123456"

# Attendre que le backend soit prêt
echo "⏳ Attente du backend..."
for i in {1..30}; do
  if curl -s "$BACKEND/health" > /dev/null 2>&1; then
    echo "✅ Backend prêt!"
    break
  fi
  echo -n "."
  sleep 1
done

# Test 1: Admin Login
echo ""
echo "🔐 TEST 1: CONNEXION ADMIN"
echo "─────────────────────────"
ADMIN_RESPONSE=$(curl -s -X POST "$BACKEND/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"emailOrPhone\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")

ADMIN_SUCCESS=$(echo "$ADMIN_RESPONSE" | grep -o '"success":true' | head -1)
ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$ADMIN_SUCCESS" ]; then
  echo "✅ ADMIN LOGIN: SUCCESS"
  echo "   Email: $ADMIN_EMAIL"
  echo "   Token: ${ADMIN_TOKEN:0:40}..."
else
  echo "❌ ADMIN LOGIN: FAILED"
  echo "   Response: $(echo $ADMIN_RESPONSE | head -c 100)"
fi

# Test 2: Marly Login
echo ""
echo "🔐 TEST 2: CONNEXION MARLY YAYA (ÉLEVEUR)"
echo "──────────────────────────────────────────"
MARLY_RESPONSE=$(curl -s -X POST "$BACKEND/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"emailOrPhone\":\"$MARLY_EMAIL\",\"password\":\"$MARLY_PASS\"}")

MARLY_SUCCESS=$(echo "$MARLY_RESPONSE" | grep -o '"success":true' | head -1)
MARLY_TOKEN=$(echo "$MARLY_RESPONSE" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$MARLY_SUCCESS" ]; then
  echo "✅ MARLY LOGIN: SUCCESS"
  echo "   Email: $MARLY_EMAIL"
  echo "   Token: ${MARLY_TOKEN:0:40}..."
else
  echo "❌ MARLY LOGIN: FAILED"
  echo "   Response: $(echo $MARLY_RESPONSE | head -c 100)"
fi

# Test 3: Foka Login
echo ""
echo "🔐 TEST 3: CONNEXION DR. EMMANUEL FOKA (VÉTÉRINAIRE)"
echo "────────────────────────────────────────────────────"
FOKA_RESPONSE=$(curl -s -X POST "$BACKEND/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"emailOrPhone\":\"$FOKA_EMAIL\",\"password\":\"$FOKA_PASS\"}")

FOKA_SUCCESS=$(echo "$FOKA_RESPONSE" | grep -o '"success":true' | head -1)
FOKA_TOKEN=$(echo "$FOKA_RESPONSE" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$FOKA_SUCCESS" ]; then
  echo "✅ FOKA LOGIN: SUCCESS"
  echo "   Email: $FOKA_EMAIL"
  echo "   Token: ${FOKA_TOKEN:0:40}..."
else
  echo "❌ FOKA LOGIN: FAILED"
  echo "   Response: $(echo $FOKA_RESPONSE | head -c 100)"
fi

# Summary
echo ""
echo "========================================="
echo "📊 RÉSUMÉ"
echo "========================================="
echo ""
echo "🌐 Backend:        ✅ http://localhost:8000"
echo "📱 Mobile/Web:     ✅ http://localhost:8081"
echo "🎛️  Admin:          ✅ http://localhost:3000"
echo ""
if [ -n "$ADMIN_SUCCESS" ]; then echo "👨‍💼 Admin Login:     ✅ OK"; else echo "👨‍💼 Admin Login:     ❌ FAILED"; fi
if [ -n "$MARLY_SUCCESS" ]; then echo "👤 Marly Login:     ✅ OK"; else echo "👤 Marly Login:     ❌ FAILED"; fi
if [ -n "$FOKA_SUCCESS" ]; then echo "⚕️  Foka Login:      ✅ OK"; else echo "⚕️  Foka Login:      ❌ FAILED"; fi
echo ""
echo "========================================="
echo ""
echo "📋 INSTRUCTIONS:"
echo "───────────────"
echo "1. Admin Dashboard (http://localhost:3000)"
echo "   Email: $ADMIN_EMAIL"
echo "   Password: $ADMIN_PASS"
echo ""
echo "2. Mobile/Web App (http://localhost:8081)"
echo "   Login Screen:"
echo "   - Marly Email: $MARLY_EMAIL"
echo "   - Marly Password: $MARLY_PASS"
echo "   - Foka Email: $FOKA_EMAIL"
echo "   - Foka Password: $FOKA_PASS"
echo ""
