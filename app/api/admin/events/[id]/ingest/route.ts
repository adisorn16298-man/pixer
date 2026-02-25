import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const event = await prisma.event.findUnique({
            where: { id: params.id },
            select: { slug: true }
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const ingestPath = path.join(process.cwd(), 'ingest', event.slug);

        try {
            await fs.access(ingestPath);
            return NextResponse.json({ exists: true, path: ingestPath });
        } catch {
            return NextResponse.json({ exists: false, path: ingestPath });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Failed to check ingest folder' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const event = await prisma.event.findUnique({
            where: { id: params.id },
            select: { slug: true }
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const ingestPath = path.join(process.cwd(), 'ingest', event.slug);
        const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

        if (isVercel) {
            return NextResponse.json({
                error: 'Ingest folder is only available when running locally.',
                isRemote: true,
                path: ingestPath
            }, { status: 400 });
        }

        // Create directory recursively
        await fs.mkdir(ingestPath, { recursive: true });

        // Open in Windows Explorer
        try {
            // Check if explorer.exe likely exists (Windows)
            if (process.platform === 'win32') {
                await execAsync(`explorer.exe "${ingestPath}"`);
            } else if (process.platform === 'darwin') {
                await execAsync(`open "${ingestPath}"`);
            }
        } catch (execError) {
            console.error('Failed to open explorer:', execError);
        }

        return NextResponse.json({ success: true, path: ingestPath });
    } catch (error) {
        console.error('Ingest folder error:', error);
        return NextResponse.json({ error: 'Failed to manage ingest folder' }, { status: 500 });
    }
}
