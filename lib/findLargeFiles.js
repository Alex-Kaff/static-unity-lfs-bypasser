const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

function findLargeFiles(directory, thresholdSize) {
    const largeFiles = [];
    try {
        if (!fs.existsSync(directory)) {
            console.log(chalk.yellow(`Directory not found: ${directory}`));
            return largeFiles;
        }

        const files = fs.readdirSync(directory);
        
        files.forEach(file => {
            const filePath = path.join(directory, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile()) {
                const sizeInMB = stats.size / (1024 * 1024);
                if (stats.size > thresholdSize) {
                    console.log(chalk.blue(`Large file found: ${file}`));
                    console.log(chalk.blue(`Size: ${sizeInMB.toFixed(2)} MB`));
                    console.log(chalk.blue('------------------------'));
                    largeFiles.push(filePath);
                }
            } else if (stats.isDirectory() && file !== 'chunks') {
                // Recursively search subdirectories
                const subDirFiles = findLargeFiles(filePath, thresholdSize);
                largeFiles.push(...subDirFiles);
            }
        });
    } catch (error) {
        console.error(chalk.red('Error while searching for large files:'), error);
    }
    return largeFiles;
}

module.exports = {
    findLargeFiles
}; 