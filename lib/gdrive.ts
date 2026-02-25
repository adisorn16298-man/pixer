import { google } from 'googleapis';
import stream from 'stream';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'http://localhost:8888/oauth2callback'
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

/**
 * Creates a folder if it doesn't exist and returns its ID
 */
export async function getOrCreateFolder(folderName: string, parentId?: string) {
    const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentId ? ` and '${parentId}' in parents` : ''}`;

    const res = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
    });

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
    }

    const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
    };

    const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
    });

    return folder.data.id;
}

/**
 * Uploads a buffer to Google Drive
 */
export async function uploadToDrive(buffer: Buffer, fileName: string, folderId?: string) {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);

    const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
    };

    const media = {
        mimeType: 'image/jpeg',
        body: bufferStream,
    };

    const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
    });

    return file.data;
}

/**
 * Deletes a file from Google Drive (moves to trash)
 */
export async function deleteFromDrive(fileId: string) {
    try {
        await drive.files.update({
            fileId: fileId,
            requestBody: {
                trashed: true,
            },
        });
        return true;
    } catch (error) {
        console.error(`[GDrive] Failed to delete file ${fileId}:`, error);
        return false;
    }
}
