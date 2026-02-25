import 'dotenv/config';
import FtpServer from 'ftp-srv';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { processPhotoForEvent } from '../lib/image-processor';
import { getOrCreateFolder, uploadToDrive } from '../lib/gdrive';

const PORT = 2121;
const INGEST_ROOT = path.join(process.cwd(), 'ingest');
const PROCESSED_ROOT = path.join(process.cwd(), 'processed');

// Ensure directories exist
[INGEST_ROOT, PROCESSED_ROOT].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

console.log('🚀 UNIFIED INGEST SERVICE STARTING...');
console.log(`📂 Ingest Root: ${INGEST_ROOT}`);

// --- FTP SERVER CONFIG ---
const ftpServer = new FtpServer({
    url: `ftp://0.0.0.0:${PORT}`,
    anonymous: true,
    greeting: 'Welcome to Event Photo Ingest Server',
});

ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
    console.log(`[FTP] Anonymous login attempt...`);
    resolve({ root: INGEST_ROOT });
});

// --- FOLDER WATCHER (LOCAL & FTP) ---
const processingFiles = new Set<string>();

const watcher = chokidar.watch(INGEST_ROOT, {
    ignored: [
        /(^|[\/\\])\../,
        '**/_processed/**',
        '**/processed/**',
        '**/Thumbs.db',
    ],
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
        stabilityThreshold: 1500,
        pollInterval: 100
    }
});

console.log('👀 Watching for changes in ingest folder...');

async function handleNewFile(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    if (processingFiles.has(filePath)) return;

    const relativePath = path.relative(INGEST_ROOT, filePath);
    const parts = relativePath.split(path.sep);

    // Filter out root files or any internal system folders
    if (parts.length < 2 || parts.some(p => p.startsWith('_') || p === 'processed')) {
        return;
    }

    const fileName = path.basename(filePath);
    if (!/\.(jpg|jpeg|png)$/i.test(fileName)) return;

    processingFiles.add(filePath);
    console.log(`[Watcher] 🔔 NEW PHOTO DETECTED: ${relativePath}`);

    const eventSlug = parts[0];

    try {
        const event = await prisma.event.findUnique({
            where: { slug: eventSlug }
        });

        if (!event) {
            console.error(`[Watcher] ❌ Event not found for slug: ${eventSlug}`);
            processingFiles.delete(filePath);
            return;
        }

        const buffer = fs.readFileSync(filePath);

        console.log(`[Watcher] ⚙️  Processing ${fileName} for event "${event.name}"...`);
        const photo = await processPhotoForEvent(
            buffer,
            fileName,
            event.id
        );

        console.log(`✅ [Watcher] SUCCESS: Photo ${photo.id} created.`);

        // --- ARCHIVE to Google Drive ---
        console.log(`[Watcher] ☁️  Uploading archive to Google Drive...`);
        try {
            const rootFolderId = await getOrCreateFolder('PIXER_ARCHIVE');
            const eventFolderId = await getOrCreateFolder(eventSlug, rootFolderId || undefined);

            const gDriveFile = await uploadToDrive(buffer, fileName, eventFolderId || undefined);
            console.log(`[Watcher] ✅ Archived to Google Drive: PIXER_ARCHIVE/${eventSlug}/${fileName} (ID: ${gDriveFile.id})`);

            if (gDriveFile.id) {
                await prisma.photo.update({
                    where: { id: photo.id },
                    data: { gDriveFileId: gDriveFile.id }
                });
                console.log(`[Watcher] 💾 Saved GDrive ID to database for photo ${photo.id}`);
            }
        } catch (gdriveError) {
            console.error(`[Watcher] ⚠️  Google Drive Archive Failed:`, gdriveError);
            // Fallback: Keep local copy if cloud fails? 
            // For now, we still move it out of ingest to prevent loop.
        }

        // --- Clean up local ingest ---
        if (fs.existsSync(filePath)) {
            // Move to local processed as a secondary backup
            const eventProcessedDir = path.join(PROCESSED_ROOT, eventSlug);
            if (!fs.existsSync(eventProcessedDir)) fs.mkdirSync(eventProcessedDir, { recursive: true });
            const targetPath = path.join(eventProcessedDir, fileName);

            fs.renameSync(filePath, targetPath);
            console.log(`[Watcher] 📦 Local backup saved to: ${path.relative(process.cwd(), targetPath)}`);
        }

    } catch (error) {
        console.error(`❌ [Watcher] CRITICAL ERROR processing ${fileName}:`, error);
    } finally {
        // Keep in set for 5 seconds to block any repetitive filesystem events
        setTimeout(() => {
            processingFiles.delete(filePath);
        }, 5000);
    }
}

// Single set of listeners
watcher.on('add', (filePath) => handleNewFile(filePath));
watcher.on('change', (filePath) => handleNewFile(filePath));

// Handle Termination
const shutdown = async () => {
    console.log('Stopping Ingest Service...');
    await ftpServer.close();
    await watcher.close();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start FTP
ftpServer.listen().then(() => {
    console.log(`📡 FTP Server listening on port ${PORT}`);
});
