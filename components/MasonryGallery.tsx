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

    const primaryColor = themeColor || '#6366f1';

    const filteredPhotos = activeMoment === 'all'
        ? photos
        : photos.filter(p => p.momentId === activeMoment);
    const handleDownload = (photo: Photo) => {
        console.log('[Gallery] Triggering download for photo:', photo.id);
        window.location.assign(`/api/photos/download?photoId=${photo.id}`);
    };

    const handleShare = (photo: Photo) => {
        if (navigator.share) {
            navigator.share({
                title: 'Check out this photo!',
                url: window.location.href,
            });
        } else {
            alert('Sharing is not supported on this browser');
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
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative max-w-full max-h-full flex items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <img
                                    src={selectedPhoto.watermarkedUrl}
                                    className="max-w-full max-h-[75vh] md:max-h-[85vh] rounded-lg shadow-2xl object-contain"
                                    style={{ boxShadow: `0 20px 50px ${primaryColor}44` }}
                                    alt="Selected"
                                />
                            </motion.div>
                        </div>

                        {/* Actions */}
                        <div className="py-6 flex gap-4 md:gap-8 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleDownload(selectedPhoto)} className="flex items-center gap-2 bg-slate-800 px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700 text-sm md:text-base font-medium">
                                <DownloadIcon /> Download
                            </button>
                            <button onClick={() => handleShare(selectedPhoto)} className="flex items-center gap-2 text-white px-6 py-3 rounded-xl transition-all shadow-lg text-sm md:text-base font-medium" style={{ backgroundColor: primaryColor }}>
                                <ShareIcon /> Share
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

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
