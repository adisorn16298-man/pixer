const sharp = require('sharp');
const fs = require('fs');

async function testSharp() {
    console.log('--- SHARP TEST START ---');
    try {
        const input = 'public/watermark.png';
        console.log('Reading:', input);
        const data = fs.readFileSync(input);

        console.log('Attempting to resize with Sharp...');
        const result = await sharp(data)
            .resize(100, 100)
            .toBuffer();

        console.log('✅ Sharp is working! Buffer length:', result.length);
    } catch (err) {
        console.error('❌ Sharp FAILED:', err);
    }
}

testSharp();
