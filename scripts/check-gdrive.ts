import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3001/oauth2callback'
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function listArchive() {
    console.log('🔍 Checking Google Drive Archive...');

    try {
        // 1. Find the root PIXER_ARCHIVE folder
        const rootResponse = await drive.files.list({
            q: "name = 'PIXER_ARCHIVE' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields: 'files(id, name)',
        });

        const rootId = rootResponse.data.files?.[0]?.id;
        if (!rootId) {
            console.log('❌ PIXER_ARCHIVE folder not found.');
            return;
        }

        console.log(`✅ Found Root Folder: PIXER_ARCHIVE (ID: ${rootId})`);

        // 2. List subfolders (Events)
        const eventRes = await drive.files.list({
            q: `'${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        const events = eventRes.data.files || [];
        console.log(`📂 Found ${events.length} Event Folder(s)`);

        for (const event of events) {
            console.log(`\n--- Event: ${event.name} ---`);
            const fileRes = await drive.files.list({
                q: `'${event.id}' in parents and trashed = false`,
                fields: 'files(id, name, createdTime, size)',
            });

            const files = fileRes.data.files || [];
            if (files.length === 0) {
                console.log('  (Empty folder)');
            } else {
                files.forEach(f => {
                    const sizeKB = f.size ? (parseInt(f.size) / 1024).toFixed(2) : 'unknown';
                    console.log(`  📄 ${f.name} (${sizeKB} KB) - Uploaded: ${f.createdTime}`);
                });
            }
        }
    } catch (error: any) {
        console.error('❌ Error listing Drive content:', error.message);
    }
}

listArchive();
