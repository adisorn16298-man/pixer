import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as 'frame' | 'watermark';

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${type}_${nanoid(10)}${path.extname(file.name)}`;
        const relativePath = `templates/${filename}`;
        const absolutePath = path.join(process.cwd(), 'public', relativePath);

        // Ensure directory exists
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });

        // Save file
        await fs.writeFile(absolutePath, buffer);

        return NextResponse.json({
            url: `/${relativePath}`,
            filename: filename
        });
    } catch (error) {
        console.error('Template upload error:', error);
        return NextResponse.json({ error: 'Failed to upload asset' }, { status: 500 });
    }
}
