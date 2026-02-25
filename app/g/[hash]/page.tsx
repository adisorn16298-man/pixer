import { PrismaClient } from '@prisma/client';
import MasonryGallery from '@/components/MasonryGallery';
import { notFound } from 'next/navigation';

const prisma = new PrismaClient();

export default async function PublicGallery({ params }: { params: { hash: string } }) {
    const event = await prisma.event.findUnique({
        where: { shortHash: params.hash },
        include: {
            photographer: true,
            moments: true,
            photos: {
                orderBy: {
                    createdAt: 'desc'
                }
            },
        },
    });

    if (!event) {
        notFound();
    }

    // Map database photos to Gallery format
    const s3Url = process.env.NEXT_PUBLIC_S3_PUBLIC_URL || '';
    const photos = event.photos.map(p => ({
        id: p.id,
        thumbnailUrl: s3Url ? `${s3Url}/${p.thumbnailKey}` : `/${p.thumbnailKey}`,
        watermarkedUrl: s3Url ? `${s3Url}/${p.watermarkedKey}` : `/${p.watermarkedKey}`,
        width: p.width,
        height: p.height,
        momentId: p.momentId || undefined,
    }));

    const moments = event.moments.map(m => ({
        id: m.id,
        name: m.name,
    }));

    const primaryColor = event.primaryColor || '#6366f1';
    const secondaryColor = event.secondaryColor || '#4f46e5';
    const backgroundColor = event.backgroundColor || '#020617';

    return (
        <main className="min-h-screen transition-colors duration-700" style={{
            backgroundColor: backgroundColor,
            '--primary-color': primaryColor,
            '--secondary-color': secondaryColor,
            '--bg-color': backgroundColor,
        } as any}>
            {/* Pixid-style Dynamic Header */}
            <header className="relative py-20 px-8 text-center overflow-hidden">
                <div
                    className="absolute inset-0 blur-3xl rounded-full scale-150 transform -translate-y-1/2 opacity-10"
                    style={{ backgroundColor: primaryColor }}
                ></div>
                <div className="relative z-10">
                    {event.photographer.brandLogoUrl && (
                        <img src={event.photographer.brandLogoUrl} className="h-12 mx-auto mb-6 opacity-80" alt="Brand Logo" />
                    )}
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-7xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        {event.name}
                    </h1>
                    <p className="font-medium tracking-widest uppercase text-sm mb-2" style={{ color: primaryColor }}>
                        {new Date(event.date).toLocaleDateString('en-US', { dateStyle: 'full' })}
                    </p>
                    <div
                        className="h-1 w-20 mx-auto rounded-full mt-6 shadow-lg"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}80` }}
                    ></div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto py-8">
                <MasonryGallery
                    initialPhotos={photos}
                    moments={moments}
                    eventId={event.id}
                    brandName={event.photographer.brandName || event.photographer.name || undefined}
                    themeColor={primaryColor}
                />
            </div>

            <footer className="py-20 text-center border-t border-slate-900 bg-slate-950/50">
                <p className="text-slate-500 text-sm">
                    Powered by <span className="font-semibold tracking-tighter" style={{ color: primaryColor }}>pixer-lite</span>
                </p>
            </footer>
        </main>
    );
}
