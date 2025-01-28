import pkg from 'fast-glob';
const { globSync } = pkg;
import { parse } from '@babel/parser';
import sharp from 'sharp';
import chalk from 'chalk';
import fs from 'fs';
import _traverse from '@babel/traverse';
const traverse = _traverse.default;

// Scan for React and image files
const scanFiles = (projectPath) => {
    try {
        const reactFiles = globSync([`${projectPath}/**/*.{js,jsx,ts,tsx}`], { ignore: ['**/node_modules/**'] });
        const imageFiles = globSync([`${projectPath}/**/*.{png,jpg,jpeg,webp,svg,avif}`], { ignore: ['**/node_modules/**'] });
        return { reactFiles, imageFiles };
    } catch (error) {
        console.error('Error scanning files:', error);
        return { reactFiles: [], imageFiles: [] };
    }
};

// Analyze React files for accessibility issues
const analyzeReact = (filePaths) => {
    const issues = [];
    filePaths.forEach((file) => {
        try {
            const code = fs.readFileSync(file, 'utf-8');
            const ast = parse(code, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript', 'tsx']
            });

            traverse.default(ast, {
                JSXElement(path) {
                    const nodeName = path.node.openingElement.name.name;
                    if (nodeName === 'img') {
                        const attributes = path.node.openingElement.attributes;
                        const hasAlt = attributes.some(attr => attr.name?.name === 'alt');
                        if (!hasAlt) {
                            issues.push({
                                file,
                                message: 'Missing alt attribute on <img> tag'
                            });
                        }
                    }
                }
            });
        } catch (error) {
            console.error(`Error analyzing file ${file}: `, error);
        }
    });
    return issues;
};

// Analyze images for size and dimensions
const imageAnalyzer = async (imagePaths) => {
    const results = [];
    for (const imagePath of imagePaths) {
        try {
            const metadata = await sharp(imagePath).metadata();
            const stats = fs.statSync(imagePath);
            results.push({
                path: imagePath,
                size: stats.size,
                width: metadata.width,
                height: metadata.height,
                format: metadata.format
            });
        } catch (error) {
            console.error(`Error processing image ${imagePath}: `, error);
        }
    }
    return results;
};

// Generate the report
const generateReport = (issues, imageData) => {
    console.log(chalk.bold('\n=== Accessibility Issues ===='));
    if (issues.length === 0) {
        console.log(chalk.green('✅ No accessibility issues found'));
    } else {
        issues.forEach((issue) => {
            console.log(chalk.red(`❌ ${issue.file}: ${issue.message}`));
        });
    }

    console.log(chalk.bold('\n=== Image Analysis ===='));
    if (imageData.length === 0) {
        console.log(chalk.yellow('⚠️ No images found'));
    } else {
        imageData.forEach((img) => {
            const sizeMB = (img.size / 1024 / 1024).toFixed(2);
            const isOversized = img.size > 500 * 1024; 
            console.log(
                isOversized ? chalk.yellow('⚠️') : chalk.green('✅'),
                `${img.path}: ${img.width}x${img.height} (${sizeMB}MB, ${img.format})`
            );
        });
    }
};

// Main function to run the analysis
const runAnalysis = async (projectPath) => {
    try {
        // Scan for files
        const { reactFiles, imageFiles } = scanFiles(projectPath);
        console.log(chalk.blue(`Found ${reactFiles.length} React files and ${imageFiles.length} images`));

        if (reactFiles.length === 0) {
            console.log(chalk.yellow('⚠️ No React files found'));
            return;
        }
        // Run analyses
        const accessibilityIssues = analyzeReact(reactFiles);
        const imageAnalysis = await imageAnalyzer(imageFiles);

        // Generate report
        generateReport(accessibilityIssues, imageAnalysis);
    } catch (error) {
        console.error(chalk.red('❌ Analysis failed:'), error);
        process.exit(1);
    }
};


// Run the analysis when this file is executed directly
if (process.argv[2]) {
    runAnalysis(process.argv[2]);
} else {
    runAnalysis('./'); // Default to current directory
}

// Export functions for testing
export {
    scanFiles,
    analyzeReact,
    imageAnalyzer,
    generateReport,
    runAnalysis
};