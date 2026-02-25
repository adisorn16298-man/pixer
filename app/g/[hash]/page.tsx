import prisma from '@/lib/prisma';
import MasonryGallery from '@/components/MasonryGallery';
import { notFound } from 'next/navigation';

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

    const eventData = event as any;

    // Map database photos to Gallery format
    const s3Url = process.env.NEXT_PUBLIC_S3_PUBLIC_URL || '';
    const photos = eventData.photos.map((p: any) => ({
        id: p.id,
        thumbnailUrl: s3Url ? `${s3Url}/${p.thumbnailKey}` : `/${p.thumbnailKey}`,
        watermarkedUrl: s3Url ? `${s3Url}/${p.watermarkedKey}` : `/${p.watermarkedKey}`,
        width: p.width,
        height: p.height,
        momentId: p.momentId || undefined,
    }));

    const moments = eventData.moments.map((m: any) => ({
        id: m.id,
        name: m.name,
    }));

    const primaryColor = eventData.primaryColor || '#6366f1';
    const secondaryColor = eventData.secondaryColor || '#4f46e5';
    const backgroundColor = eventData.backgroundColor || '#020617';

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
                    {eventData.logoUrl ? (
                        <img src={eventData.logoUrl} className="h-16 mx-auto mb-6 opacity-90 object-contain max-w-[200px]" alt="Event Logo" />
                    ) : eventData.photographer.brandLogoUrl && (
                        <img src={eventData.photographer.brandLogoUrl} className="h-12 mx-auto mb-6 opacity-80" alt="Brand Logo" />
                    )}
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-7xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        {eventData.name}
                    </h1>
                    <p className="font-medium tracking-widest uppercase text-sm mb-2" style={{ color: primaryColor }}>
                        {new Date(eventData.date).toLocaleDateString('en-US', { dateStyle: 'full' })}
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
                    eventId={eventData.id}
                    brandName={eventData.photographer.brandName || eventData.photographer.name || undefined}
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
