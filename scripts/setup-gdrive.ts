import { google } from 'googleapis';
import 'dotenv/config';
import http from 'http';
import { URL } from 'url';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 8888;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

async function main() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('❌ Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing in .env');
        process.exit(1);
    }

    const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent' // Force to get refresh token
    });

    const server = http.createServer(async (req, res) => {
        try {
            if (req.url!.indexOf('/oauth2callback') > -1) {
                const qs = new URL(req.url!, `http://localhost:${PORT}`).searchParams;
                const code = qs.get('code');

                console.log(`\n✅ Code received! Exchanging for tokens...`);
                res.end('Authentication successful! You can close this window and return to the terminal.');

                const { tokens } = await oauth2Client.getToken(code!);
                console.log('\n--- SUCCESS! ---');
                console.log('Copy this Refresh Token to your .env:');
                console.log(`\nGOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"\n`);
                console.log('----------------\n');

                server.destroy();
                process.exit(0);
            }
        } catch (e) {
            console.error('Error getting token:', e);
            res.end('Authentication failed.');
            process.exit(1);
        }
    });

    // Polyfill server.destroy for older node versions if needed
    const connections = new Set<any>();
    server.on('connection', (conn) => {
        connections.add(conn);
        conn.on('close', () => connections.delete(conn));
    });
    (server as any).destroy = () => {
        for (const conn of connections) conn.destroy();
        server.close();
    };

    server.listen(PORT, () => {
        console.log(`\n🚀 Setup Server listening on http://localhost:${PORT}`);
        console.log('--- ACTION REQUIRED ---');
        console.log('1. Visit this URL to authorize:');
        console.log(authUrl);
        console.log('\n2. If it asks for redirect URI in Google Console, use:');
        console.log(REDIRECT_URI);
        console.log('-----------------------\n');
    });
}

main().catch(console.error);
