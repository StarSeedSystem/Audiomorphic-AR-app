#!/bin/bash

# Configuration
PROJECT_ROOT="/Users/alex/Documents/Audiomorphic FULL/audiomorphic-visualizer-ar-app-pro-con-suscripción "
INSTALLERS_DIR="/Users/alex/Documents/Audiomorphic FULL/Instaladores"
ICON_SOURCE="/Users/alex/Documents/Audiomorphic FULL/iconos"

echo "🧹 Limpiando directorio de Instaladores..."
rm -rf "$INSTALLERS_DIR"/*
mkdir -p "$INSTALLERS_DIR"

cd "$PROJECT_ROOT"

# Ensure icons are correct in the build folder
echo "🖼️ Sincronizando iconos..."
mkdir -p build
cp "$ICON_SOURCE/audiomorphic.png" build/icon.png
cp "$ICON_SOURCE/build/icon.icns" build/icon.icns
cp "$ICON_SOURCE/build/icon.ico" build/icon.ico

echo "🏗️ Iniciando Build..."
npm run build

# Electron Build
echo "🖥️ Generando instaladores de Desktop (Mac/Win)..."
npx electron-builder --mac --win

# Packaging Final outputs to ZIP
echo "📦 Empaquetando versiones finales..."

# Mac
if [ -d "dist-electron/mac-arm64" ]; then
    zip -r "$INSTALLERS_DIR/Audiomorphic_AR_Mac_M1_M2.zip" "dist-electron/mac-arm64/Audiomorphic AR.app"
fi

if [ -d "dist-electron/mac" ]; then
    zip -r "$INSTALLERS_DIR/Audiomorphic_AR_Mac_Intel.zip" "dist-electron/mac/Audiomorphic AR.app"
fi

# Windows (NSIS generates .exe, but user wants ZIP)
if [ -f "dist-electron/Audiomorphic AR Setup.exe" ]; then
    zip -j "$INSTALLERS_DIR/Audiomorphic_AR_Windows.zip" "dist-electron/Audiomorphic AR Setup.exe"
fi

# Web version
echo "🌐 Empaquetando versión Web..."
zip -r "$INSTALLERS_DIR/Audiomorphic_AR_Web.zip" dist/

echo "✅ Proceso completado. Archivos ZIP finales disponibles en 'Instaladores'."
