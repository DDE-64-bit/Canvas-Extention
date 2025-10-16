#!/bin/bash

echo "Canvas Filter Extension Builder"
echo "=================================="

echo "Cleaning up old files..."
rm -rf canvas-filter-firefox canvas-filter-chrome canvas-filter-edge
rm -f *.zip

echo "Creating directories..."
mkdir -p canvas-filter-firefox
mkdir -p canvas-filter-chrome  
mkdir -p canvas-filter-edge

echo "Copying common files..."
cp content.js styles.css popup.html inpage-router-hook.js canvas-filter-firefox/
cp content.js styles.css popup.html inpage-router-hook.js canvas-filter-chrome/
cp content.js styles.css popup.html inpage-router-hook.js canvas-filter-edge/

echo "Copying browser-specific manifests..."
cp manifest-firefox.json canvas-filter-firefox/manifest.json
cp manifest-chrome.json canvas-filter-chrome/manifest.json
cp manifest-edge.json canvas-filter-edge/manifest.json

echo "Creating zip files..."
cd canvas-filter-firefox && zip -r ../canvas-filter-firefox.zip . && cd ..
cd canvas-filter-chrome && zip -r ../canvas-filter-chrome.zip . && cd ..
cd canvas-filter-edge && zip -r ../canvas-filter-edge.zip . && cd ..

echo ""
echo "Build complete! Created zip files:"
ls -la *.zip

echo ""
echo "Installation instructions:"
echo "• Firefox: about:addons → Install Add-on From File → canvas-filter-firefox.zip"
echo "• Chrome: chrome://extensions → Developer mode → Load unpacked → canvas-filter-chrome.zip"
echo "• Edge: edge://extensions → Developer mode → Load unpacked → canvas-filter-edge.zip"
