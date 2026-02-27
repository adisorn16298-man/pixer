"use client";

import React, { useState, useEffect } from 'react';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';
import { motion, AnimatePresence } from 'framer-motion';

interface Photo {
    id: string;
    thumbnailUrl: string;
    watermarkedUrl: string;
    width: number;
    height: number;
    momentId?: string;
    downloadCount?: number;
    shareCount?: number;
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

    // Selection Mode
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDownloadingBulk, setIsDownloadingBulk] = useState(false);

    const toggleSelection = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkDownload = async () => {
        if (selectedIds.size === 0) return;
        setIsDownloadingBulk(true);
        try {
            const response = await fetch('/api/photos/bulk-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoIds: Array.from(selectedIds) }),
            });

            if (!response.ok) throw new Error('Bulk download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pixer-photos-${new Date().getTime()}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error('Bulk download error:', error);
            alert('Failed to download photos as ZIP. Please try again.');
        } finally {
            setIsDownloadingBulk(false);
        }
    };

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

    // Keyboard support and Auto-open from URL
    useEffect(() => {
        // Handle keyboard
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedPhoto) return;
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') setSelectedPhoto(null);
        };

        window.addEventListener('keydown', handleKeyDown);

        // Handle auto-open if photoId is in URL
        const params = new URLSearchParams(window.location.search);
        const photoId = params.get('photoId');
        if (photoId && !selectedPhoto) {
            const photo = photos.find(p => p.id === photoId);
            if (photo) setSelectedPhoto(photo);
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedPhoto, currentIndex, filteredPhotos, photos]);

    const handleDownload = (photo: Photo) => {
        console.log('[Gallery] Triggering download for photo:', photo.id);
        window.location.assign(`/api/photos/download?photoId=${photo.id}`);
    };

    const handleShare = async (photo: Photo) => {
        // Construct a preview URL instead of a direct download link
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('photoId', photo.id);
        const shareUrl = url.toString();

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
                // Track share
                fetch(`/api/photos/${photo.id}/share`, { method: 'POST' }).catch(err => console.error('Failed to track share:', err));

                await navigator.share({
                    title: `Check out this photo from ${brandName || 'our event'}!`,
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
            {/* Header / Moments Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar w-full md:w-auto">
                    <button
                        onClick={() => setActiveMoment('all')}
                        className={`px-6 py-2 rounded-full transition-all whitespace-nowrap text-sm font-bold ${activeMoment === 'all' ? 'text-white shadow-lg' : 'bg-slate-800 hover:bg-slate-700'}`}
                        style={activeMoment === 'all' ? { backgroundColor: primaryColor } : {}}
                    >
                        All Photos
                    </button>
                    {moments?.map(moment => (
                        <button
                            key={moment.id}
                            onClick={() => setActiveMoment(moment.id)}
                            className={`px-6 py-2 rounded-full transition-all whitespace-nowrap text-sm font-bold ${activeMoment === moment.id ? 'text-white shadow-lg' : 'bg-slate-800 hover:bg-slate-700'}`}
                            style={activeMoment === moment.id ? { backgroundColor: primaryColor } : {}}
                        >
                            {moment.name}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => {
                        setIsSelectionMode(!isSelectionMode);
                        if (isSelectionMode) setSelectedIds(new Set());
                    }}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${isSelectionMode ? 'bg-white text-slate-900 border-white' : 'bg-slate-900/50 text-white border-slate-700 hover:bg-slate-800'}`}
                >
                    {isSelectionMode ? 'Cancel Selection' : 'Select Photos'}
                </button>
            </div>

            <ResponsiveMasonry
                columnsCountBreakPoints={{ 350: 2, 750: 3, 900: 4 }}
            >
                <Masonry gutter="12px">
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
                                onClick={() => isSelectionMode ? toggleSelection(photo.id) : setSelectedPhoto(photo)}
                                className={`w-full h-auto block transition-all ${isSelectionMode ? 'scale-90 group-hover:scale-95' : 'group-hover:scale-105'}`}
                                loading="lazy"
                            />

                            {/* Selection Checkbox */}
                            {isSelectionMode && (
                                <div
                                    className={`absolute top-3 left-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.has(photo.id) ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-black/20 border-white/50'}`}
                                    onClick={(e) => toggleSelection(photo.id, e)}
                                >
                                    {selectedIds.has(photo.id) && <CheckIcon />}
                                </div>
                            )}
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
            </ResponsiveMasonry>

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
                                const url = new URL(window.location.origin + window.location.pathname);
                                url.searchParams.set('photoId', selectedPhoto.id);
                                const shareUrl = url.toString();
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
            {/* Bulk Actions Fixed Bar */}
            <AnimatePresence>
                {isSelectionMode && selectedIds.size > 0 && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg"
                    >
                        <div className="bg-slate-900 border border-indigo-500/50 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 backdrop-blur-xl">
                            <div className="pl-2">
                                <span className="text-white font-bold text-sm block">{selectedIds.size} Photos Selected</span>
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="text-[10px] text-slate-400 font-bold hover:text-white uppercase tracking-wider"
                                >
                                    Clear Selection
                                </button>
                            </div>
                            <button
                                onClick={handleBulkDownload}
                                disabled={isDownloadingBulk}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {isDownloadingBulk ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full"></div>
                                        Zipping...
                                    </>
                                ) : (
                                    <>
                                        <DownloadIcon />
                                        Download ZIP
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const CheckIcon = () => (
    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
    </svg>
);

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
