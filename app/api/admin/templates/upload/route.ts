import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as 'frame' | 'watermark' | 'logo';

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${type}_${nanoid(10)}${path.extname(file.name)}`;
        const key = `templates/${filename}`;

        const { isS3Enabled, uploadToS3 } = await import('@/lib/s3-upload');
        const s3Url = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;

        if (isS3Enabled && s3Url) {
            await uploadToS3(buffer, key, file.type);
            return NextResponse.json({
                url: `${s3Url}/${key}`,
                filename: filename
            });
        } else {
            const absolutePath = path.join(process.cwd(), 'public', key);
            // Ensure directory exists
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
            // Save file
            await fs.writeFile(absolutePath, buffer);

            return NextResponse.json({
                url: `/${key}`,
                filename: filename
            });
        }
    } catch (error) {
        console.error('Template upload error:', error);
        return NextResponse.json({ error: 'Failed to upload asset' }, { status: 500 });
    }
}
