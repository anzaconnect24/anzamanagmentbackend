#!/bin/bash

echo "Installing dependencies for Anza Backend..."
echo "Current Node version: $(node --version)"
echo ""

# Remove old installations if they exist
if [ -d "node_modules" ]; then
    echo "Removing old node_modules..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    echo "Removing old package-lock.json..."
    rm -f package-lock.json
fi

echo ""
echo "Installing dependencies..."
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation successful!"
    echo ""
    echo "You can now start the server with: nodemon index"
else
    echo ""
    echo "❌ Installation failed!"
    echo ""
    echo "This is likely due to Node.js v25 compatibility issues."
    echo "Please switch to Node.js v20 LTS:"
    echo ""
    echo "  nvm install 20"
    echo "  nvm use 20"
    echo "  ./install.sh"
    echo ""
    echo "Or download Node.js v20 from: https://nodejs.org/"
fi
