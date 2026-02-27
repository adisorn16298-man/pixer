"use client";

import React, { useState, useEffect } from 'react';
import MasonryGallery from '@/components/MasonryGallery';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomePage() {
    const [event, setEvent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/events/featured')
            .then(res => res.json())
            .then(data => {
                // Since API returns object (single event) or null
                setEvent(data && data.id ? data : null);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Fetch error:', err);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 animate-pulse font-bold tracking-widest uppercase text-[10px]">Loading Experience...</p>
            </div>
        );
    }

    if (!event) {
        return (
            <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
                <div className="max-w-md text-center">
                    <h1 className="text-6xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-800">
                        PIXER
                    </h1>
                    <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-[40px] space-y-4">
                        <p className="text-slate-400 font-medium">No public galleries are currently featured on the main page.</p>
                        <p className="text-slate-500 text-sm">Please check back soon for new event photos from our professional photographers.</p>
                    </div>
                </div>
            </main>
        );
    }

    // Process event data for gallery component
    const s3Url = process.env.NEXT_PUBLIC_S3_PUBLIC_URL || '';
    const photos = event.photos.map((p: any) => ({
        id: p.id,
        thumbnailUrl: p.thumbnailKey ? (s3Url ? `${s3Url}/${p.thumbnailKey}` : `/${p.thumbnailKey}`) : '',
        watermarkedUrl: p.watermarkedKey ? (s3Url ? `${s3Url}/${p.watermarkedKey}` : `/${p.watermarkedKey}`) : '',
        width: p.width,
        height: p.height,
        momentId: p.momentId || undefined,
    }));

    const moments = event.moments.map((m: any) => ({
        id: m.id,
        name: m.name,
    }));

    const primaryColor = event.primaryColor || '#6366f1';
    const backgroundColor = event.backgroundColor || '#020617';

    return (
        <main className="min-h-screen transition-colors duration-700" style={{
            backgroundColor: backgroundColor,
            '--primary-color': primaryColor,
            '--bg-color': backgroundColor,
        } as any}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={event.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                >
                    <header className="relative py-24 px-8 text-center overflow-hidden">
                        <div
                            className="absolute inset-0 blur-[120px] rounded-full scale-150 transform -translate-y-1/2 opacity-20"
                            style={{ backgroundColor: primaryColor }}
                        ></div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="relative z-10"
                        >
                            {event.logoUrl ? (
                                <img src={event.logoUrl} className="h-20 mx-auto mb-8 opacity-90 object-contain max-w-[240px]" alt="Logo" />
                            ) : event.photographer?.brandLogoUrl && (
                                <img src={event.photographer.brandLogoUrl} className="h-14 mx-auto mb-8 opacity-80" alt="Brand Logo" />
                            )}

                            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                                {event.name}
                            </h1>

                            <p className="font-black tracking-[0.3em] uppercase text-[10px] md:text-sm mb-8 px-4 py-2 bg-white/5 inline-block rounded-full border border-white/10" style={{ color: primaryColor }}>
                                {new Date(event.date).toLocaleDateString('en-US', { dateStyle: 'full' })}
                            </p>

                            <div
                                className="h-1 w-24 mx-auto rounded-full shadow-lg"
                                style={{ backgroundColor: primaryColor, boxShadow: `0 0 20px ${primaryColor}80` }}
                            ></div>
                        </motion.div>
                    </header>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="max-w-7xl mx-auto py-12 px-4 md:px-8"
                    >
                        <MasonryGallery
                            initialPhotos={photos}
                            moments={moments}
                            eventId={event.id}
                            brandName={event.photographer?.brandName || event.photographer?.name || undefined}
                            themeColor={primaryColor}
                        />
                    </motion.div>

                    <footer className="py-24 text-center border-t border-white/5 bg-black/20">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">
                            Powered by <span style={{ color: primaryColor }}>{event.photographer?.footerText || 'PIXER LITE ENGINE'}</span>
                        </p>
                    </footer>
                </motion.div>
            </AnimatePresence>
        </main>
    );
}
