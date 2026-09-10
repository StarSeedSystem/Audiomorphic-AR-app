#!/bin/bash

# Script de empaquetado consolidado para Audiomorphic AR
# Genera instaladores para Mac, Windows y Android, organizándolos en la carpeta 'Instaladores'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
ELECTRON_DIST="$PROJECT_DIR/dist-electron"
INSTALLERS_DIR="$(cd "$PROJECT_DIR/.." && pwd)/Instaladores"

echo "🚀 Iniciando proceso de empaquetado consolidado..."

# 1. Limpieza Total
echo "🧹 Eliminando versiones anteriores y limpiando espacio..."
rm -rf "$INSTALLERS_DIR"/*
rm -rf "$DIST_DIR" "$ELECTRON_DIST"
mkdir -p "$INSTALLERS_DIR/Mac" "$INSTALLERS_DIR/Windows" "$INSTALLERS_DIR/Android"

# 2. Build Web (Vite)
echo "📦 Construyendo aplicación web con Vite..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error: El build de Vite falló."
    exit 1
fi

# 3. Build Desktop (Electron)
echo "💻 Generando instaladores Desktop para Mac y Windows..."
# --mac dmg genera el instalador para Mac
# --win nsis genera el ejecutable para Windows (requiere wine si se ejecuta en macOS)
npx electron-builder --mac dmg --win nsis

# Mover los archivos generados a la carpeta organizada
echo "📁 Organizando instaladores Desktop..."
find "$ELECTRON_DIST" -maxdepth 1 -name "*.dmg" -exec cp {} "$INSTALLERS_DIR/Mac/" \;
find "$ELECTRON_DIST" -maxdepth 1 -name "*.exe" -exec cp {} "$INSTALLERS_DIR/Windows/" \;

# 4. Build Mobile (Android)
if [ -d "$PROJECT_DIR/android" ]; then
    echo "🤖 Generando APK para Android..."
    npx cap copy android
    
    cd "$PROJECT_DIR/android"
    # Intentar generar el APK (Debug)
    ./gradlew assembleDebug
    if [ $? -eq 0 ]; then
        cp app/build/outputs/apk/debug/app-debug.apk "$INSTALLERS_DIR/Android/Audiomorphic_AR_Professional.apk"
        echo "✅ APK Profesional generado y copiado a '$INSTALLERS_DIR/Android/'."
    else
        echo "⚠️  Advertencia: El build de Android falló. Asegúrese de tener Android SDK instalado."
    fi
    cd "$PROJECT_DIR"
else
    echo "ℹ️  No se detectó carpeta 'android', omitiendo build mobile."
fi

# 5. Compresión Final (ZIP)
echo "🤐 Comprimiendo instaladores en archivos ZIP..."

# Mac
cd "$INSTALLERS_DIR/Mac"
if ls *.dmg >/dev/null 2>&1; then
    zip -r Mac_Audiomorphic_AR_Pro.zip . -i "*.dmg"
    echo "✅ Mac ZIP creado."
fi

# Windows
cd "$INSTALLERS_DIR/Windows"
if ls *.exe >/dev/null 2>&1; then
    zip -r Windows_Audiomorphic_AR_Pro.zip . -i "*.exe"
    echo "✅ Windows ZIP creado."
fi

# Android
cd "$INSTALLERS_DIR/Android"
if ls *.apk >/dev/null 2>&1; then
    zip -r Android_Audiomorphic_AR_Pro.zip . -i "*.apk"
    echo "✅ Android ZIP creado."
fi

cd "$PROJECT_DIR"

echo ""
echo "🎉 ¡EMPAQUETADO Y COMPRESIÓN FINALIZADOS!"
echo "----------------------------------------"
echo "Los archivos están listos en:"
echo "📂 $INSTALLERS_DIR"
echo "----------------------------------------"
ls -R "$INSTALLERS_DIR"
