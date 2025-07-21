# Static Unity LFS Bypasser

A tool to bypass Large File Storage (LFS) limitations by splitting large files and creating a Node.js server project for Unity WebGL builds.

## What this tool does

1. **Analyzes your Unity WebGL build** - Scans for large files that would require LFS
2. **Splits large files into chunks** - Breaks files >100MB (configurable) into smaller pieces
3. **Preserves original files** - Keeps your original files intact for LFS if needed
4. **Generates a complete Node.js project** - Creates an Express server with all dependencies
5. **Provides deployment-ready structure** - Ready to deploy to any Node.js hosting platform

## Quick Start (No Installation Required)

Run directly with npx:

```bash
npx static-unity-lfs-bypasser
```

Navigate to your Unity WebGL build directory and run the command above. That's it!

## Installation (Optional)

If you prefer to install globally:

```bash
npm install -g static-unity-lfs-bypasser
```

## Usage

### Option 1: Run with npx (Recommended)
Navigate to your Unity WebGL build directory and run:

```bash
npx static-unity-lfs-bypasser
```

### Option 2: Run after global installation
If you've installed globally:

```bash
static-unity-lfs-bypasser
```

### Options

- `-t, --threshold <number>` - Size threshold in MB for splitting files (default: 100)
- `-o, --output <directory>` - Output directory for the generated project (default: ./lfs-bypasser-server)

### Examples

```bash
# Use default settings with npx (100MB threshold, output to ./lfs-bypasser-server)
npx static-unity-lfs-bypasser

# Custom threshold and output directory with npx
npx static-unity-lfs-bypasser -t 50 -o my-game-server

# Split files larger than 75MB, output to ./game-deploy
npx static-unity-lfs-bypasser --threshold 75 --output game-deploy

# If installed globally, you can omit 'npx'
static-unity-lfs-bypasser -t 50 -o my-game-server
```

## What gets generated

The tool creates a complete Node.js project with:

- **`public/`** - Your Unity WebGL build files
- **`chunks/`** - Split chunks of large files with manifest files
- **`app.js`** - Express server that reassembles chunked files on-demand
- **`package.json`** - Node.js dependencies and scripts
- **`README.md`** - Instructions for running and deploying your server
- **`.gitignore`** - Appropriate ignore patterns for Node.js

## Running the generated server

After the tool completes:

```bash
cd lfs-bypasser-server  # or your custom output directory
npm install
npm start
```

Your Unity WebGL game will be available at `http://localhost:3000`.

## How it works

1. **File Analysis**: Scans your Unity build for files exceeding the size threshold
2. **Intelligent Chunking**: Splits large files into 50MB chunks with integrity verification
3. **Manifest Generation**: Creates JSON manifests to track chunk relationships
4. **Server Generation**: Creates an Express server that:
   - Serves static files normally
   - Reassembles chunked files on-demand
   - Caches reconstructed files for performance
   - Sets appropriate MIME types for Unity files (.wasm, .data)

## Deployment

The generated project can be deployed to any Node.js hosting platform:

- **Heroku** - Push the generated directory
- **Railway** - Connect your Git repository
- **Render** - Deploy from Git
- **Vercel** - Deploy as Node.js function
- **DigitalOcean App Platform** - Deploy from Git

## Benefits

- **No LFS required** - Host large Unity builds on GitHub without LFS costs
- **Fast downloads** - Files are streamed and cached efficiently
- **Deployment ready** - Complete server project generated automatically
- **Preserves originals** - Original files remain intact for future LFS use
- **Production ready** - Includes error handling, caching, and proper MIME types

## Use Case

Perfect for Unity WebGL developers who want to:
- Host games on GitHub without LFS limitations
- Deploy to various hosting platforms easily
- Avoid LFS bandwidth costs
- Maintain build integrity with chunk verification 