#!/bin/bash
# Script to build Audiomorphic VR APK locally

echo "Building web assets..."
npm run build

echo "Syncing Capacitor..."
npx cap sync android

echo "Building APK..."
cd android && ./gradlew assembleDebug

echo "--------------------------------------------------"
echo "APK generation complete!"
echo "Find your APK at: android/app/build/outputs/apk/debug/app-debug.apk"
echo "--------------------------------------------------"
