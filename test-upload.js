const fs = require('fs');
const path = require('path');

async function test() {
    console.log('--- TEST UPLOAD START ---');

    // 1. Get a sample image buffer
    const imagePath = path.join(process.cwd(), 'public', 'originals', 'p2WkmIVtav.jpg');
    const buffer = fs.readFileSync(imagePath);
    const blob = new Blob([buffer], { type: 'image/jpeg' });

    // 2. Prepare FormData
    const formData = new FormData();
    formData.append('file', blob, 'test-upload.png');
    formData.append('eventId', 'cmlz1pqkx000211bv8uwcgrlj'); // Wedding Night 2026 ID
    formData.append('momentId', 'all');

    console.log('Sending request to /api/admin/photos/upload...');

    try {
        const response = await fetch('http://localhost:3000/api/admin/photos/upload', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Body:', result);

        if (response.ok) {
            console.log('✅ UPLOAD SUCCESSFUL!');
        } else {
            console.log('❌ UPLOAD FAILED!');
        }
    } catch (error) {
        console.error('❌ REQUEST FAILED:', error);
    }
}

test();
