"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';

interface Event {
    id: string;
    name: string;
    slug: string;
    shortHash: string;
    date: string;
    isFeatured: boolean;
    _count: { photos: number; moments: number };
}

export default function AdminDashboard() {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

    const fetchEvents = () => {
        setIsLoading(true);
        fetch('/api/admin/events')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setEvents(data);
                } else {
                    setEvents([]);
                }
                setIsLoading(false);
            });
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleDeleteEvent = async () => {
        if (!eventToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/events/${eventToDelete.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setEventToDelete(null);
                fetchEvents();
            } else {
                alert('Failed to delete event');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error deleting event');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleFeatured = async (event: Event) => {
        const newStatus = !event.isFeatured;
        // Optimistic update
        setEvents(prev => prev.map(e => ({
            ...e,
            isFeatured: e.id === event.id ? newStatus : (newStatus ? false : e.isFeatured)
        })));

        try {
            const res = await fetch(`/api/admin/events/${event.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ isFeatured: newStatus }),
            });
            if (!res.ok) {
                // Revert on failure
                fetchEvents();
                alert('Failed to update featured status');
            }
        } catch (error) {
            fetchEvents();
            alert('Error updating featured status');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Your Events</h2>
                    <p className="text-slate-400 mt-1">Manage your photography galleries and moments.</p>
                </div>
                <Link
                    href="/admin/events/new"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20"
                >
                    + New Event
                </Link>
            </div>

            {isLoading ? (
                <div className="animate-pulse flex flex-col gap-4">
                    <div className="h-24 bg-slate-800/50 rounded-2xl w-full"></div>
                    <div className="h-24 bg-slate-800/50 rounded-2xl w-full"></div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {events.length === 0 ? (
                        <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                            <p className="text-slate-500 font-medium">No events found. Create your first event to get started!</p>
                        </div>
                    ) : (
                        events.map((event) => (
                            <div
                                key={event.id}
                                className="group bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-indigo-600/50 transition-all hover:bg-slate-900 flex items-center justify-between"
                            >
                                <div className="flex gap-6 items-center">
                                    <button
                                        onClick={() => handleToggleFeatured(event)}
                                        className={`h-16 w-16 rounded-xl flex items-center justify-center text-2xl transition-all border ${event.isFeatured
                                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'
                                            }`}
                                        title={event.isFeatured ? "Featured on Home Page" : "Click to feature on Home Page"}
                                    >
                                        {event.isFeatured ? '🌟' : '📅'}
                                    </button>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-100">{event.name}</h3>
                                        <p className="text-sm text-slate-500 mb-2">/g/{event.shortHash}</p>
                                        <div className="flex gap-4">
                                            <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-400 uppercase tracking-widest font-bold">
                                                {event._count.photos} Photos
                                            </span>
                                            <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-400 uppercase tracking-widest font-bold">
                                                {event._count.moments} Moments
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Link
                                        href={`/g/${event.shortHash}`}
                                        target="_blank"
                                        className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all"
                                    >
                                        👁️ View
                                    </Link>
                                    <button
                                        onClick={() => setEventToDelete(event)}
                                        className="p-3 bg-red-950/30 hover:bg-red-900/50 text-red-500 rounded-xl transition-all"
                                    >
                                        🗑️
                                    </button>
                                    <Link
                                        href={`/admin/events/${event.id}`}
                                        className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold"
                                    >
                                        ⚙️ Manage
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <ConfirmModal
                isOpen={!!eventToDelete}
                onClose={() => setEventToDelete(null)}
                onConfirm={handleDeleteEvent}
                isLoading={isDeleting}
                title="Delete Event?"
                message={`Are you sure you want to delete "${eventToDelete?.name}"? This will permanently remove all photos and moments associated with this event.`}
                confirmText="Permanently Delete"
            />
        </div>
    );
}
