"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface FeaturedEvent {
    id: string;
    name: string;
    shortHash: string;
    date: string;
    primaryColor: string;
    photographer: {
        brandName: string;
        brandLogoUrl: string;
    };
    _count: { photos: number };
}

export default function HomePage() {
    const [events, setEvents] = useState<FeaturedEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/events/featured')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setEvents(data);
                } else {
                    console.error('Expected array from featured events API, got:', data);
                    setEvents([]);
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Fetch error:', err);
                setIsLoading(false);
            });
    }, []);

    return (
        <main className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">
            <header className="relative py-24 px-8 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-50"></div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10"
                >
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
                        PIXER <span className="text-indigo-500 text-3xl md:text-5xl align-top">LITE</span>
                    </h1>
                    <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                        Professional event photography, delivered with speed and style.
                        Explore our featured public galleries.
                    </p>
                </motion.div>
            </header>

            <div className="max-w-7xl mx-auto px-8 pb-32">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-slate-900/50 rounded-[32px] animate-pulse border border-slate-800"></div>
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/30 rounded-[40px] border border-slate-800 border-dashed">
                        <p className="text-slate-500 font-medium text-lg">No public galleries are currently featured.</p>
                        <p className="text-slate-600 text-sm mt-2">Check back soon for new event photos!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {events.map((event, index) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link
                                    href={`/g/${event.shortHash}`}
                                    className="group block relative bg-slate-900 border border-slate-800 rounded-[40px] p-8 hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 overflow-hidden"
                                >
                                    <div
                                        className="absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-16 -mt-16 opacity-20 transition-opacity group-hover:opacity-40"
                                        style={{ backgroundColor: event.primaryColor || '#6366f1' }}
                                    ></div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-10">
                                            {event.photographer?.brandLogoUrl ? (
                                                <img src={event.photographer.brandLogoUrl} className="h-8 opacity-60 grayscale group-hover:grayscale-0 transition-all" alt="Logo" />
                                            ) : (
                                                <div className="h-8 w-8 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500">P</div>
                                            )}
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                {event._count.photos} Photos
                                            </span>
                                        </div>

                                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                                            {event.name}
                                        </h3>
                                        <p className="text-slate-500 text-sm font-medium mb-6">
                                            {new Date(event.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                        </p>

                                        <div
                                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                                            style={{ color: event.primaryColor || '#6366f1' }}
                                        >
                                            View Gallery <span>→</span>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <footer className="p-12 text-center text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em] border-t border-slate-900/50">
                &copy; 2026 PIXER LITE • DIRECT DELIVERY ENGINE
            </footer>
        </main>
    );
}
