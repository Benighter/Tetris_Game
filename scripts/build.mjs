import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const includeEntries = ['index.html', 'style.css', 'script.js', 'js', 'styles'];

async function ensureCleanDist() {
    await rm(distDir, { recursive: true, force: true });
    await mkdir(distDir, { recursive: true });
}

async function copyEntry(entryName) {
    const sourcePath = path.join(rootDir, entryName);
    const targetPath = path.join(distDir, entryName);
    const sourceStats = await stat(sourcePath);

    if (sourceStats.isDirectory()) {
        await cp(sourcePath, targetPath, { recursive: true });
        return;
    }

    await mkdir(path.dirname(targetPath), { recursive: true });
    await cp(sourcePath, targetPath);
}

async function verifyEntries() {
    const rootEntries = new Set(await readdir(rootDir));
    const missingEntries = includeEntries.filter(entry => !rootEntries.has(entry));

    if (missingEntries.length > 0) {
        throw new Error(`Missing build input: ${missingEntries.join(', ')}`);
    }
}

await verifyEntries();
await ensureCleanDist();
await Promise.all(includeEntries.map(copyEntry));

console.log(`Built static bundle in ${path.relative(rootDir, distDir)}`);