const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks

function splitFile(filePath, chunksDir) {
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    const fileBuffer = fs.readFileSync(filePath);
    
    // If chunksDir is not provided, use the default location
    if (!chunksDir) {
        chunksDir = path.join(path.dirname(filePath), '..', 'chunks');
    }
    
    const manifest = {
        fileName,
        originalSize: fileSize,
        chunks: [],
        hash: crypto.createHash('sha256').update(fileBuffer).digest('hex')
    };

    for (let i = 0; i < fileSize; i += CHUNK_SIZE) {
        const chunk = fileBuffer.slice(i, i + CHUNK_SIZE);
        const chunkHash = crypto.createHash('sha256').update(chunk).digest('hex');
        const chunkFileName = `${fileName}.chunk.${i}-${i + chunk.length}`;
        const chunkPath = path.join(chunksDir, chunkFileName);
        
        fs.writeFileSync(chunkPath, chunk);
        manifest.chunks.push({
            path: chunkFileName,
            start: i,
            size: chunk.length,
            hash: chunkHash
        });
    }

    fs.writeFileSync(
        path.join(chunksDir, `${fileName}.manifest.json`),
        JSON.stringify(manifest, null, 2)
    );

    return manifest;
}

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
    const combinedHash = crypto.createHash('sha256').update(combinedBuffer).digest('hex');
    if (combinedHash !== manifest.hash) {
        throw new Error('Combined file hash does not match original');
    }

    return combinedBuffer;
}

module.exports = {
    splitFile,
    combineChunks,
    CHUNK_SIZE
}; 