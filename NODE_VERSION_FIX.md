# Node.js Compatibility Fix

## Problem

The project is encountering errors with Node.js v25.2.1 because older dependencies like `buffer-equal-constant-time` are not compatible with this version.

## Solution: Use Node.js LTS Version

### Option 1: Using nvm (Recommended)

If you have nvm installed:

```bash
# Navigate to backend directory
cd anzamanagmentbackend

# Install and use Node.js v20 (LTS)
nvm install 20
nvm use 20

# Verify version
node --version  # Should show v20.x.x

# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Start the server
nodemon index
```

### Option 2: Install Node.js v20 LTS Directly

If you don't have nvm:

1. Download Node.js v20 LTS from: https://nodejs.org/
2. Install it
3. Verify installation: `node --version`
4. Then run:

```bash
cd anzamanagmentbackend
rm -rf node_modules package-lock.json
npm install
nodemon index
```

### Option 3: Use npx with specific Node version

```bash
npx -p node@20 node index.js
```

## Why Node.js v20?

- Node.js v20 is the current LTS (Long Term Support) version
- Better compatibility with existing npm packages
- More stable for production use
- The dependencies in this project were built for Node.js v18-v20

## After Switching Node Version

Once you've switched to Node v20, your server should start without errors.
