"use client";

import React, { useState, useEffect } from 'react';
import Masonry from 'react-responsive-masonry';
import { motion, AnimatePresence } from 'framer-motion';

interface Photo {
    id: string;
    thumbnailUrl: string;
    watermarkedUrl: string;
    width: number;
    height: number;
    momentId?: string;
}

interface Moment {
    id: string;
    name: string;
}

interface GalleryProps {
    initialPhotos: Photo[];
    moments?: Moment[];
    eventId: string;
    brandName?: string;
    themeColor?: string;
}

export default function MasonryGallery({ initialPhotos, moments, eventId, brandName, themeColor }: GalleryProps) {
    const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [activeMoment, setActiveMoment] = useState<string>('all');
    const [showCopied, setShowCopied] = useState(false);

    const primaryColor = themeColor || '#6366f1';

    const filteredPhotos = activeMoment === 'all'
        ? photos
        : photos.filter(p => p.momentId === activeMoment);

    const currentIndex = selectedPhoto ? filteredPhotos.findIndex(p => p.id === selectedPhoto.id) : -1;

    const handleNext = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (currentIndex < filteredPhotos.length - 1) {
            setSelectedPhoto(filteredPhotos[currentIndex + 1]);
        } else {
            setSelectedPhoto(filteredPhotos[0]); // Wrap to beginning
        }
    };

    const handlePrev = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (currentIndex > 0) {
            setSelectedPhoto(filteredPhotos[currentIndex - 1]);
        } else {
            setSelectedPhoto(filteredPhotos[filteredPhotos.length - 1]); // Wrap to end
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedPhoto) return;
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') setSelectedPhoto(null);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPhoto, currentIndex, filteredPhotos]);

    const handleDownload = (photo: Photo) => {
        console.log('[Gallery] Triggering download for photo:', photo.id);
        window.location.assign(`/api/photos/download?photoId=${photo.id}`);
    };

    const handleShare = async (photo: Photo) => {
        const shareUrl = `${window.location.origin}/api/photos/download?photoId=${photo.id}`;

        // Always copy to clipboard first as a robust fallback
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        } catch (clipErr) {
            console.error('Initial clipboard copy failed:', clipErr);
        }

        // Then try native share if available
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check out this photo!',
                    url: shareUrl,
                });
            } catch (err) {
                // If it's not a user cancellation, maybe log it
                if ((err as Error).name !== 'AbortError') {
                    console.error('Native share failed:', err);
                }
            }
        }
    };
    return (
        <div className="p-4 text-slate-200">
            {/* Moments Tabs */}
            {moments && moments.length > 0 && (
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
                    <button
                        onClick={() => setActiveMoment('all')}
                        className={`px-6 py-2 rounded-full transition-all whitespace-nowrap ${activeMoment === 'all' ? 'text-white shadow-lg' : 'bg-slate-800 hover:bg-slate-700'}`}
                        style={activeMoment === 'all' ? { backgroundColor: primaryColor } : {}}
                    >
                        All Photos
                    </button>
                    {moments.map(moment => (
                        <button
                            key={moment.id}
                            onClick={() => setActiveMoment(moment.id)}
                            className={`px-6 py-2 rounded-full transition-all whitespace-nowrap ${activeMoment === moment.id ? 'text-white shadow-lg' : 'bg-slate-800 hover:bg-slate-700'}`}
                            style={activeMoment === moment.id ? { backgroundColor: primaryColor } : {}}
                        >
                            {moment.name}
                        </button>
                    ))}
                </div>
            )}

            <Masonry columnsCount={3} gutter="16px">
                {filteredPhotos.map((photo) => (
                    <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -5 }}
                        className="relative cursor-pointer overflow-hidden rounded-xl shadow-2xl group border border-slate-800"
                    >
                        <img
                            src={photo.thumbnailUrl}
                            alt="Event"
                            onClick={() => setSelectedPhoto(photo)}
                            className="w-full h-auto block transition-transform group-hover:scale-105"
                            loading="lazy"
                        />
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4 pointer-events-none">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDownload(photo); }}
                                className="p-2 rounded-full text-white pointer-events-auto shadow-lg"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <DownloadIcon />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleShare(photo); }}
                                className="p-2 rounded-full text-white pointer-events-auto shadow-lg"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <ShareIcon />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </Masonry>

            {/* Lightbox / Modal */}
            <AnimatePresence>
                {selectedPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 md:p-8"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        {/* Image Wrapper */}
                        <div className="relative w-full flex-1 flex flex-col items-center justify-center overflow-hidden">
                            {/* Previous Button */}
                            <button
                                onClick={handlePrev}
                                className="absolute left-4 z-20 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all border border-white/10 hidden md:block"
                            >
                                <ChevronLeftIcon />
                            </button>

                            <motion.div
                                key={selectedPhoto.id}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.5}
                                onDragEnd={(_, info) => {
                                    const swipeThreshold = 50;
                                    if (info.offset.x < -swipeThreshold) {
                                        handleNext();
                                    } else if (info.offset.x > swipeThreshold) {
                                        handlePrev();
                                    }
                                }}
                                initial={{ scale: 0.9, opacity: 0, x: 20 }}
                                animate={{ scale: 1, opacity: 1, x: 0 }}
                                exit={{ scale: 0.9, opacity: 0, x: -20 }}
                                className="relative max-w-full max-h-full flex items-center justify-center p-4 cursor-grab active:cursor-grabbing"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <img
                                    src={selectedPhoto.watermarkedUrl}
                                    className="max-w-full max-h-[75vh] md:max-h-[85vh] rounded-lg shadow-2xl object-contain select-none shadow-indigo-500/20"
                                    style={{ boxShadow: `0 30px 60px -12px ${primaryColor}66` }}
                                    alt="Selected"
                                    draggable={false}
                                />
                            </motion.div>

                            {/* Next Button */}
                            <button
                                onClick={handleNext}
                                className="absolute right-4 z-20 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all border border-white/10 hidden md:block"
                            >
                                <ChevronRightIcon />
                            </button>

                            {/* Close Button Top Right */}
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="absolute top-4 right-4 z-20 p-2 text-white/50 hover:text-white transition-colors"
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="py-6 flex flex-wrap justify-center gap-3 md:gap-6 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleDownload(selectedPhoto)} className="flex items-center gap-2 bg-slate-800 px-5 py-3 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700 text-sm font-medium">
                                <DownloadIcon /> Download
                            </button>

                            <button onClick={() => handleShare(selectedPhoto)} className="relative flex items-center gap-2 text-white px-5 py-3 rounded-xl transition-all shadow-lg text-sm font-medium" style={{ backgroundColor: primaryColor }}>
                                <ShareIcon /> Share
                                <AnimatePresence>
                                    {showCopied && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: -45 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute left-1/2 -translate-x-1/2 bg-white text-[10px] text-slate-900 px-3 py-1 rounded-full shadow-xl whitespace-nowrap font-black pointer-events-none"
                                        >
                                            LINK COPIED! 🔗
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </button>

                            <button onClick={() => {
                                const shareUrl = `${window.location.origin}/api/photos/download?photoId=${selectedPhoto.id}`;
                                navigator.clipboard.writeText(shareUrl).then(() => {
                                    setShowCopied(true);
                                    setTimeout(() => setShowCopied(false), 2000);
                                });
                            }} className="flex items-center gap-2 bg-slate-900/50 px-5 py-3 rounded-xl hover:bg-slate-800 transition-colors border border-slate-800 text-sm font-medium text-slate-300">
                                📋 Copy Link
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const ChevronLeftIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
);

const CloseIcon = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ShareIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 12.684a3 3 0 100-2.684 3 3 0 000 2.684z" />
    </svg>
);
