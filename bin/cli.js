#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const { findLargeFiles } = require('../lib/findLargeFiles');
const { splitFile } = require('../lib/chunkManager');

program
  .version('1.0.0')
  .description('A tool to bypass LFS by splitting large files and creating a Node.js server project')
  .option('-t, --threshold <number>', 'Size threshold in MB for splitting files', '100')
  .option('-o, --output <directory>', 'Output directory for the generated project', './lfs-bypasser-server')
  .parse(process.argv);

const options = program.opts();

async function copyRecursively(source, target, excludeDirs) {
  const stats = await fs.stat(source);
  
  if (stats.isDirectory()) {
    const dirName = path.basename(source);
    if (excludeDirs.includes(dirName)) {
      return;
    }

    await fs.ensureDir(target);
    const files = await fs.readdir(source);
    
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);
      await copyRecursively(sourcePath, targetPath, excludeDirs);
    }
  } else if (stats.isFile()) {
    await fs.copy(source, target, { overwrite: true });
  }
}

function generatePackageJson(projectName) {
  return {
    "name": projectName,
    "version": "1.0.0",
    "description": "Unity WebGL game server with LFS bypass support",
    "main": "app.js",
    "scripts": {
      "start": "node app.js",
      "dev": "node app.js"
    },
    "keywords": [
      "unity",
      "webgl",
      "game",
      "server",
      "express"
    ],
    "author": "",
    "license": "MIT",
    "dependencies": {
      "express": "^4.18.2",
      "fs-extra": "^11.2.0",
      "chalk": "^4.1.2"
    }
  };
}

function generateServerCode() {
  return `const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

// Cache for combined files
const fileCache = new Map();
const CACHE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks

function combineChunks(manifestPath) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const combinedBuffer = Buffer.alloc(manifest.originalSize);
    const chunksDir = path.dirname(manifestPath);
    
    for (const chunk of manifest.chunks) {
        const chunkPath = path.join(chunksDir, chunk.path);
        const chunkData = fs.readFileSync(chunkPath);
        chunkData.copy(combinedBuffer, chunk.start);
    }

    // Verify hash
    const crypto = require('crypto');
    const combinedHash = crypto.createHash('sha256').update(combinedBuffer).digest('hex');
    if (combinedHash !== manifest.hash) {
        throw new Error('Combined file hash does not match original');
    }

    return combinedBuffer;
}

function getCachedFile(manifestPath) {
    const cached = fileCache.get(manifestPath);
    if (cached && Date.now() - cached.timestamp < CACHE_TIMEOUT) {
        console.log(chalk.blue(\`[Cache Hit] Serving cached file for \${path.basename(manifestPath)}\`));
        return cached.buffer;
    }
    
    console.log(chalk.blue(\`[Cache Miss] Reassembling chunks for \${path.basename(manifestPath)}\`));
    const buffer = combineChunks(manifestPath);
    fileCache.set(manifestPath, {
        buffer,
        timestamp: Date.now()
    });
    return buffer;
}

function startServer(port = 3000) {
    const app = express();
    const currentDir = process.cwd();
    const publicDir = path.join(currentDir, 'public');
    const chunksDir = path.join(currentDir, 'chunks');

    // Middleware to handle chunked files
    app.use((req, res, next) => {
        const filePath = path.join(publicDir, req.url);
        const manifestPath = path.join(chunksDir, \`\${path.basename(filePath)}.manifest.json\`);

        if (fs.existsSync(manifestPath)) {
            const startTime = Date.now();
            console.log(chalk.blue(\`[Request] Chunked file requested: \${path.basename(filePath)}\`));
            
            try {
                const buffer = getCachedFile(manifestPath);
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                
                // Set appropriate headers based on file extension
                if (filePath.endsWith('.wasm')) {
                    res.type('application/wasm');
                } else if (filePath.endsWith('.data')) {
                    res.type('application/octet-stream');
                }
                
                const endTime = Date.now();
                console.log(chalk.green(\`[Success] Served \${path.basename(filePath)} (\${(manifest.originalSize / 1024 / 1024).toFixed(2)}MB) in \${endTime - startTime}ms\`));
                return res.send(buffer);
            } catch (error) {
                console.error(chalk.red(\`[Error] Failed to serve chunked file \${path.basename(filePath)}:\`), error);
                return next();
            }
        }
        next();
    });

    // Serve static files from the public directory
    app.use(express.static(publicDir, {
        setHeaders: (res, path) => {
            if (path.endsWith('.wasm')) res.type('application/wasm');
            if (path.endsWith('.data')) res.type('application/octet-stream');
            if (path.endsWith('.js.gz')) {
                res.type('application/javascript');
                res.setHeader('Content-Encoding', 'gzip');
            }
        }
    }));

    // Start the server
    app.listen(port, () => {
        console.log(chalk.green(\`✓ Server is running on http://localhost:\${port}\`));
        console.log(chalk.blue('Chunked file serving is enabled - watching for requests...'));
        console.log(chalk.yellow('Press Ctrl+C to stop the server'));
    });
}

// Get port from command line arguments or environment variable
const port = process.argv[2] || process.env.PORT || 3000;
startServer(parseInt(port));
`;
}

function generateReadme(projectName) {
  return `# ${projectName}

Unity WebGL game server with Large File Storage (LFS) bypass support.

## What this project contains

This project was automatically generated by static-unity-lfs-bypasser to serve your Unity WebGL build with chunked large files.

- **public/**: Your Unity WebGL build files
- **chunks/**: Split chunks of large files (>100MB by default)
- **app.js**: Express server that reassembles chunked files on-demand
- **package.json**: Node.js dependencies

## How to run

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the server:
   \`\`\`bash
   npm start
   \`\`\`
   
   Or specify a custom port:
   \`\`\`bash
   node app.js 8080
   \`\`\`

3. Open your browser and navigate to \`http://localhost:3000\` (or your custom port)

## How it works

- Large files in your Unity build are automatically split into 50MB chunks
- When a browser requests a large file, the server reassembles it from chunks in real-time
- Files are cached in memory for 30 minutes to improve performance
- Original files are preserved, so you can still use Git LFS if needed

## Deployment

You can deploy this project to any Node.js hosting platform:

- **Heroku**: Push this directory to a Heroku app
- **Railway**: Connect your Git repository
- **Render**: Deploy from Git
- **Vercel**: Deploy as a Node.js function
- **DigitalOcean App Platform**: Deploy from Git

Make sure to set the \`PORT\` environment variable if required by your hosting platform.
`;
}

async function main() {
  try {
    const currentDir = process.cwd();
    const outputDir = path.resolve(currentDir, options.output);
    const publicDir = path.join(outputDir, 'public');
    const chunksDir = path.join(outputDir, 'chunks');
    const projectName = path.basename(outputDir);

    console.log(chalk.blue(`Creating Unity WebGL server project in: ${outputDir}`));
    
    // Create output directories
    await fs.ensureDir(outputDir);
    await fs.ensureDir(publicDir);
    await fs.ensureDir(chunksDir);

    // Copy all files and directories to public directory except excluded ones
    console.log(chalk.blue('Copying Unity WebGL build files...'));
    const excludeDirs = ['node_modules', 'public', 'chunks', '.git', path.basename(outputDir)];
    await copyRecursively(currentDir, publicDir, excludeDirs);
    console.log(chalk.green('✓ Unity WebGL files copied to public directory'));

    // Find and split large files
    console.log(chalk.blue('Searching for large files...'));
    const largeFiles = findLargeFiles(publicDir, options.threshold * 1024 * 1024);

    if (largeFiles.length === 0) {
      console.log(chalk.yellow('No large files found that need splitting.'));
    } else {
      console.log(chalk.blue(`Found ${largeFiles.length} large files to split.`));
      
      for (const filePath of largeFiles) {
        console.log(chalk.blue(`Splitting ${path.basename(filePath)}...`));
        try {
          const manifest = splitFile(filePath, chunksDir);
          console.log(chalk.green(`✓ Successfully split ${path.basename(filePath)} into ${manifest.chunks.length} chunks`));
        } catch (error) {
          console.error(chalk.red(`Error splitting ${path.basename(filePath)}:`), error);
        }
      }
    }

    // Generate project files
    console.log(chalk.blue('Generating Node.js project files...'));
    
    // Generate package.json
    const packageJson = generatePackageJson(projectName);
    await fs.writeJSON(path.join(outputDir, 'package.json'), packageJson, { spaces: 2 });
    
    // Generate app.js
    const serverCode = generateServerCode();
    await fs.writeFile(path.join(outputDir, 'app.js'), serverCode);
    
    // Generate README.md
    const readme = generateReadme(projectName);
    await fs.writeFile(path.join(outputDir, 'README.md'), readme);
    
    // Generate .gitignore
    const gitignore = `node_modules/
*.log
.env
.DS_Store
`;
    await fs.writeFile(path.join(outputDir, '.gitignore'), gitignore);

    console.log(chalk.green('✓ Node.js project files generated'));
    console.log('');
    console.log(chalk.green('🎉 Unity WebGL server project created successfully!'));
    console.log('');
    console.log(chalk.blue('To run your game server:'));
    console.log(chalk.white(`  cd ${path.relative(currentDir, outputDir)}`));
    console.log(chalk.white('  npm install'));
    console.log(chalk.white('  npm start'));
    console.log('');
    console.log(chalk.blue(`Your game will be available at: http://localhost:3000`));

  } catch (error) {
    console.error(chalk.red('Error during setup:'), error);
    process.exit(1);
  }
}

main(); 