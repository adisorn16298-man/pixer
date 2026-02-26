"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import ConfirmModal from '@/components/ConfirmModal';

interface EventDetail {
    id: string;
    name: string;
    shortHash: string;
    moments: { id: string; name: string; _count: { photos: number } }[];
    photos: { id: string; thumbnailKey: string; momentId: string | null }[];
    template?: { id: string; name: string } | null;
    templateId?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    backgroundColor?: string | null;
    logoUrl?: string | null;
}

const THEME_PRESETS = [
    { name: 'Indigo', primary: '#6366f1', secondary: '#4f46e5' },
    { name: 'Rose', primary: '#f43f5e', secondary: '#e11d48' },
    { name: 'Amber', primary: '#f59e0b', secondary: '#d97706' },
    { name: 'Emerald', primary: '#10b981', secondary: '#059669' },
    { name: 'Sky', primary: '#0ea5e9', secondary: '#0284c7' },
    { name: 'Violet', primary: '#8b5cf6', secondary: '#7c3aed' },
];

export default function EventManagement() {
    const { id } = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<EventDetail | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ current: 0, total: 0, errors: 0 });
    const [isReprocessing, setIsReprocessing] = useState(false);
    const [reprocessStatus, setReprocessStatus] = useState({ current: 0, total: 0, message: '' });
    const [newMomentName, setNewMomentName] = useState('');
    const [editingMomentId, setEditingMomentId] = useState<string | null>(null);
    const [editingMomentName, setEditingMomentName] = useState('');
    const [selectedMomentId, setSelectedMomentId] = useState<string>('all');
    const [templates, setTemplates] = useState<any[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfig, setDeleteConfig] = useState<{ type: 'event' | 'moment' | 'photo', id: string, name?: string } | null>(null);
    const [isEditingEvent, setIsEditingEvent] = useState(false);
    const [editEventData, setEditEventData] = useState({ name: '', date: '' });
    const qrRef = useRef<HTMLDivElement>(null);

    const fetchEvent = () => {
        fetch(`/api/admin/events/${id}`)
            .then(res => res.json())
            .then(data => {
                setEvent(data);
                setEditEventData({ name: data.name, date: data.date?.split('T')[0] || '' });
            });
    };

    useEffect(() => {
        fetchEvent();

        fetch('/api/admin/templates')
            .then(res => res.json())
            .then(data => setTemplates(data));
    }, [id]);

    useEffect(() => {
        if (event?.name) {
            document.title = `${event.name} | Manage Event`;
        }
    }, [event?.name]);

    const publicUrl = event ? `${typeof window !== 'undefined' ? window.location.origin : ''}/g/${event.shortHash}` : '';

    const handleDownloadQR = () => {
        const svg = qrRef.current?.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width + 40;
            canvas.height = img.height + 40;
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 20, 20);
                const pngFile = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.download = `QR-${event?.name}.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
            }
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    };

    const filteredPhotos = event
        ? (selectedMomentId === 'all'
            ? event.photos
            : event.photos.filter(p => p.momentId === selectedMomentId))
        : [];

    const handleCreateMoment = async () => {
        if (!newMomentName) return;
        const res = await fetch('/api/admin/moments', {
            method: 'POST',
            body: JSON.stringify({ name: newMomentName, eventId: id }),
        });
        const moment = await res.json();
        setEvent(prev => prev ? { ...prev, moments: [...prev.moments, { ...moment, _count: { photos: 0 } }] } : null);
        setNewMomentName('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadStatus({ current: 0, total: files.length, errors: 0 });

        try {
            const { compressImage } = await import('@/lib/image-client-utils');

            for (let i = 0; i < files.length; i++) {
                setUploadStatus(prev => ({ ...prev, current: i + 1 }));
                const originalFile = files[i];
                console.log(`[Upload] Processing file ${i + 1}/${files.length}: ${originalFile.name}`);

                let retryCount = 0;
                const MAX_RETRIES = 3;
                let success = false;

                while (retryCount <= MAX_RETRIES && !success) {
                    try {
                        // Compress if needed
                        const fileToUpload = await compressImage(originalFile);

                        const formData = new FormData();
                        formData.append('file', fileToUpload);
                        formData.append('eventId', id as string);
                        if (selectedMomentId && selectedMomentId !== 'all') formData.append('momentId', selectedMomentId);

                        const res = await fetch('/api/admin/photos/upload', {
                            method: 'POST',
                            body: formData,
                        });

                        if (!res.ok) {
                            const errorData = await res.json().catch(() => ({ error: 'Upload failed' }));
                            throw new Error(errorData.error || `Upload failed with status ${res.status}`);
                        }

                        const photo = await res.json();
                        setEvent(prev => prev ? { ...prev, photos: [photo, ...prev.photos] } : null);
                        success = true;
                    } catch (error: any) {
                        retryCount++;
                        console.warn(`[Upload] Attempt ${retryCount} failed for ${originalFile.name}:`, error.message);
                        if (retryCount > MAX_RETRIES) {
                            setUploadStatus(prev => ({ ...prev, errors: prev.errors + 1 }));
                            console.error(`[Upload] All retries failed for ${originalFile.name}`);
                        } else {
                            // Wait a bit before retry
                            await new Promise(r => setTimeout(r, 1000 * retryCount));
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error('Critical upload loop error:', error);
            alert(`Critical error during upload batch: ${error.message}`);
        } finally {
            setIsUploading(false);
            // Refresh event data to ensure UI is in sync
            fetchEvent();
        }
    };

    const handleReprocessBranding = async () => {
        if (!confirm('Are you sure you want to update branding for ALL photos in this event? This will use the current watermark and frame settings.')) return;

        setIsReprocessing(true);
        setReprocessStatus({ current: 0, total: 0, message: 'Fetching IDs...' });

        try {
            // 1. Get the list of photo IDs to reprocess
            const listRes = await fetch(`/api/admin/events/${id}/reprocess`, { method: 'POST' });
            if (!listRes.ok) throw new Error('Failed to fetch photo list');

            const { photos: photoIds, total } = await listRes.json();
            setReprocessStatus({ current: 0, total, message: `Processing 0 of ${total}` });

            let successCount = 0;
            let failCount = 0;

            // 2. Process each photo individually to prevent 504 Timeouts
            for (let i = 0; i < photoIds.length; i++) {
                const photoId = photoIds[i];
                setReprocessStatus(prev => ({
                    ...prev,
                    current: i + 1,
                    message: `Processing photo ${i + 1} of ${total}`
                }));

                try {
                    const res = await fetch(`/api/admin/photos/${photoId}/reprocess`, { method: 'POST' });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || 'Failed');
                    }
                    successCount++;
                } catch (err) {
                    console.error(`Failed to reprocess photo ${photoId}:`, err);
                    failCount++;
                }
            }

            alert(`Branding update complete!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`);
        } catch (error: any) {
            console.error('Reprocess error:', error);
            alert(`Error during update: ${error.message}`);
        } finally {
            setIsReprocessing(false);
            fetchEvent();
        }
    };


    const handleTemplateChange = async (templateId: string) => {
        const res = await fetch(`/api/admin/events/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ templateId }),
        });
        if (res.ok) {
            setEvent(prev => prev ? { ...prev, templateId: templateId === 'none' ? null : templateId } : null);
        }
    };

    const handleColorChange = async (primary: string, secondary: string, background?: string) => {
        const bg = background || event?.backgroundColor || '#020617';
        const res = await fetch(`/api/admin/events/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ primaryColor: primary, secondaryColor: secondary, backgroundColor: bg }),
        });
        if (res.ok) {
            setEvent(prev => prev ? { ...prev, primaryColor: primary, secondaryColor: secondary, backgroundColor: bg } : null);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'logo');

        try {
            const res = await fetch('/api/admin/templates/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.url) {
                const patchRes = await fetch(`/api/admin/events/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ logoUrl: data.url })
                });
                if (patchRes.ok) {
                    setEvent(prev => prev ? { ...prev, logoUrl: data.url } : null);
                }
            }
        } catch (error) {
            console.error('Logo upload error:', error);
            alert('Failed to upload logo');
        }
    };

    const handleRemoveLogo = async () => {
        const res = await fetch(`/api/admin/events/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ logoUrl: null })
        });
        if (res.ok) {
            setEvent(prev => prev ? { ...prev, logoUrl: null } : null);
        }
    };

    const handleOpenIngestFolder = async () => {
        try {
            const res = await fetch(`/api/admin/events/${id}/ingest`, { method: 'POST' });
            const data = await res.json();

            if (!res.ok) {
                if (data.isRemote) {
                    alert('This feature requires PIXER to be running on your local computer.\n\nSince you are using the web version, please use the FTP upload method or the web upload button instead.');
                } else {
                    throw new Error(data.error || 'Failed to open folder');
                }
                return;
            }
            // Show a temporary success state if needed
        } catch (error) {
            console.error('Open folder error:', error);
            alert('Could not open ingest folder. Please ensure the system is running locally.');
        }
    };

    const handleUpdateEventDetails = async () => {
        const res = await fetch(`/api/admin/events/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(editEventData),
        });
        if (res.ok) {
            setEvent(prev => prev ? { ...prev, name: editEventData.name } : null);
            setIsEditingEvent(false);
        }
    };

    const handleUpdateMoment = async (momentId: string) => {
        const res = await fetch(`/api/admin/moments/${momentId}`, {
            method: 'PATCH',
            body: JSON.stringify({ name: editingMomentName }),
        });
        if (res.ok) {
            setEvent(prev => prev ? {
                ...prev,
                moments: prev.moments.map(m => m.id === momentId ? { ...m, name: editingMomentName } : m)
            } : null);
            setEditingMomentId(null);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfig) return;
        setIsDeleting(true);
        try {
            let url = '';
            let method = 'DELETE';

            if (deleteConfig.type === 'event') {
                url = `/api/admin/events/${id}`;
            } else if (deleteConfig.type === 'moment') {
                url = `/api/admin/moments/${deleteConfig.id}`;
            } else if (deleteConfig.type === 'photo') {
                url = `/api/admin/photos/${deleteConfig.id}`;
            }

            const res = await fetch(url, { method });
            if (res.ok) {
                if (deleteConfig.type === 'event') {
                    router.push('/admin');
                } else {
                    setDeleteConfig(null);
                    fetchEvent();
                }
            } else {
                alert('Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!event) return <div className="p-20 text-center animate-pulse text-slate-500">Loading Event...</div>;

    const currentPrimary = event.primaryColor || '#6366f1';

    return (
        <div className="space-y-10">
            <div className="flex justify-between items-start">
                <div>
                    {isEditingEvent ? (
                        <div className="flex flex-col gap-2">
                            <input
                                type="text"
                                value={editEventData.name}
                                onChange={e => setEditEventData({ ...editEventData, name: e.target.value })}
                                className="text-3xl font-extrabold bg-slate-950 border border-slate-800 p-2 rounded-xl text-white w-full max-w-md outline-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleUpdateEventDetails}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => setIsEditingEvent(false)}
                                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="group flex items-center gap-3">
                            <h2 className="text-4xl font-extrabold text-white tracking-tight">{event.name}</h2>
                            <button
                                onClick={() => setIsEditingEvent(true)}
                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-800 rounded-lg transition-all"
                            >
                                ✏️
                            </button>
                        </div>
                    )}
                    <p className="mt-2 font-mono" style={{ color: currentPrimary }}>Public URL: g/{event.shortHash}</p>
                </div>
                <div className="flex gap-4">
                    {/* Ingest Folder Button */}
                    <button
                        onClick={handleOpenIngestFolder}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-bold transition-all border border-slate-700 flex items-center gap-3 shadow-xl"
                    >
                        📸 Open Ingest Folder
                    </button>

                    {/* Upload Button */}
                    <label
                        className={`cursor-pointer text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl flex items-center gap-3 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        style={{ backgroundColor: currentPrimary, boxShadow: `0 20px 25px -5px ${currentPrimary}4d` }}
                    >
                        <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                        {isUploading ? '📤 Uploading...' : '📤 Upload Photos'}
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Upload Progress Overlay */}
                {isUploading && (
                    <div className="fixed bottom-10 right-10 z-50 animate-in slide-in-from-bottom-5">
                        <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-2xl flex items-center gap-6 min-w-[320px]">
                            <div className="relative h-16 w-16">
                                <svg className="h-full w-full transform -rotate-90">
                                    <circle
                                        cx="32" cy="32" r="28"
                                        stroke="currentColor" strokeWidth="4" fill="transparent"
                                        className="text-slate-800"
                                    />
                                    <circle
                                        cx="32" cy="32" r="28"
                                        stroke="currentColor" strokeWidth="4" fill="transparent"
                                        strokeDasharray={175.9}
                                        strokeDashoffset={175.9 * (1 - uploadStatus.current / uploadStatus.total)}
                                        className="transition-all duration-500"
                                        style={{ color: currentPrimary }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                                    {Math.round((uploadStatus.current / uploadStatus.total) * 100)}%
                                </div>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-bold mb-1">Uploading Photos</h4>
                                <p className="text-xs text-slate-400">
                                    Processing {uploadStatus.current} of {uploadStatus.total}
                                    {uploadStatus.errors > 0 && <span className="text-red-500 ml-2">({uploadStatus.errors} errors)</span>}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reprocess Progress Overlay */}
                {isReprocessing && (
                    <div className="fixed bottom-10 right-10 z-50 animate-in slide-in-from-bottom-5">
                        <div className="bg-slate-900 border border-indigo-500/50 p-6 rounded-3xl shadow-2xl flex items-center gap-6 min-w-[340px]">
                            <div className="relative h-14 w-14">
                                <svg className="h-full w-full transform -rotate-90">
                                    <circle
                                        cx="28" cy="28" r="24"
                                        stroke="currentColor" strokeWidth="4" fill="transparent"
                                        className="text-slate-800"
                                    />
                                    <circle
                                        cx="28" cy="28" r="24"
                                        stroke="currentColor" strokeWidth="4" fill="transparent"
                                        strokeDasharray={150.8}
                                        strokeDashoffset={reprocessStatus.total > 0 ? 150.8 * (1 - reprocessStatus.current / reprocessStatus.total) : 150.8}
                                        className="transition-all duration-300"
                                        style={{ color: currentPrimary }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                                    {reprocessStatus.total > 0 ? Math.round((reprocessStatus.current / reprocessStatus.total) * 100) : 0}%
                                </div>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-bold text-sm mb-0.5">Updating Branding</h4>
                                <p className="text-[10px] text-slate-400 font-medium">{reprocessStatus.message}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Moments Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    {/* QR Code Section */}
                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex flex-col items-center gap-6">
                        <h3 className="w-full text-lg font-bold text-slate-200 uppercase tracking-widest text-xs">Share Gallery</h3>
                        <div ref={qrRef} className="bg-white p-3 rounded-2xl shadow-xl">
                            <QRCode
                                size={180}
                                value={publicUrl}
                                viewBox={`0 0 180 180`}
                            />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-[10px] text-slate-500 font-medium">Scan to view the public gallery</p>
                            <button
                                onClick={handleDownloadQR}
                                className="text-xs font-bold transition-colors"
                                style={{ color: currentPrimary }}
                            >
                                📥 Download QR Code
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
                        <h3 className="text-lg font-bold text-slate-200 mb-4 uppercase tracking-widest text-xs">Event Moments</h3>
                        <div className="space-y-2 mb-6">
                            <button
                                onClick={() => setSelectedMomentId('all')}
                                className={`w-full text-left p-4 rounded-xl transition-all border ${selectedMomentId === 'all' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                                    }`}
                                style={selectedMomentId === 'all' ? { backgroundColor: currentPrimary, borderColor: currentPrimary } : {}}
                            >
                                <div className="font-bold">All Moments</div>
                                <div className="text-xs opacity-60">{event.photos.length} photos</div>
                            </button>
                            {event.moments.map(m => (
                                <div key={m.id} className="relative group/moment">
                                    <button
                                        onClick={() => setSelectedMomentId(m.id)}
                                        className={`w-full text-left p-4 rounded-xl transition-all border ${selectedMomentId === m.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                                            }`}
                                        style={selectedMomentId === m.id ? { backgroundColor: currentPrimary, borderColor: currentPrimary } : {}}
                                    >
                                        {editingMomentId === m.id ? (
                                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                <input
                                                    autoFocus
                                                    value={editingMomentName}
                                                    onChange={e => setEditingMomentName(e.target.value)}
                                                    className="flex-1 bg-slate-900 border border-slate-700 p-1 rounded text-sm text-white outline-none"
                                                />
                                                <button onClick={() => handleUpdateMoment(m.id)} className="text-xs font-bold text-white">Save</button>
                                                <button onClick={() => setEditingMomentId(null)} className="text-xs font-bold text-slate-400">Esc</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="font-bold">{m.name}</div>
                                                <div className="text-xs opacity-60">{m._count.photos} photos</div>
                                            </>
                                        )}
                                    </button>

                                    {editingMomentId !== m.id && (
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/moment:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingMomentId(m.id);
                                                    setEditingMomentName(m.name);
                                                }}
                                                className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-[10px]"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteConfig({ type: 'moment', id: m.id, name: m.name });
                                                }}
                                                className="p-1.5 bg-red-950/80 hover:bg-red-900 rounded-lg text-[10px] text-red-500"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="New Moment Name"
                                value={newMomentName}
                                onChange={e => setNewMomentName(e.target.value)}
                                className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none focus:ring-1 text-white"
                                style={{ '--tw-ring-color': currentPrimary } as any}
                            />
                            <button
                                onClick={handleCreateMoment}
                                className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Branding & Theme Settings */}
                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-200 mb-4 uppercase tracking-widest text-xs">Event Theme</h3>
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {THEME_PRESETS.map(theme => (
                                    <button
                                        key={theme.name}
                                        onClick={() => handleColorChange(theme.primary, theme.secondary)}
                                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${event.primaryColor === theme.primary && event.secondaryColor === theme.secondary ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <div
                                            className="w-8 h-8 rounded-full shadow-inner"
                                            style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                                        />
                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">{theme.name}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-800">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Event Logo</h4>
                                <div className="flex items-center gap-4">
                                    {event.logoUrl ? (
                                        <div className="relative group">
                                            <img src={event.logoUrl} alt="Event Logo" className="h-16 w-16 object-contain rounded-xl bg-slate-800 p-2" />
                                            <button
                                                onClick={handleRemoveLogo}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="h-16 w-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl hover:border-indigo-500 cursor-pointer transition-colors group">
                                            <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                                            <span className="text-xl group-hover:scale-110 transition-transform">➕</span>
                                        </label>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-400">Custom logo for this event gallery. If not set, global brand logo will be used.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-800">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custom Colors</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Button / Accent</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={event.primaryColor || '#6366f1'}
                                                onChange={(e) => handleColorChange(e.target.value, event.secondaryColor || '#4f46e5')}
                                                className="w-8 h-8 bg-transparent border-none cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={event.primaryColor || '#6366f1'}
                                                onChange={(e) => handleColorChange(e.target.value, event.secondaryColor || '#4f46e5')}
                                                className="flex-1 bg-slate-950 border border-slate-800 p-2 rounded-lg text-[10px] font-mono text-white outline-none focus:ring-1"
                                                style={{ '--tw-ring-color': currentPrimary } as any}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Secondary</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={event.secondaryColor || '#4f46e5'}
                                                onChange={(e) => handleColorChange(event.primaryColor || '#6366f1', e.target.value)}
                                                className="w-8 h-8 bg-transparent border-none cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={event.secondaryColor || '#4f46e5'}
                                                onChange={(e) => handleColorChange(event.primaryColor || '#6366f1', e.target.value)}
                                                className="flex-1 bg-slate-950 border border-slate-800 p-2 rounded-lg text-[10px] font-mono text-white outline-none focus:ring-1"
                                                style={{ '--tw-ring-color': currentPrimary } as any}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Main Background</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={event.backgroundColor || '#020617'}
                                                onChange={(e) => handleColorChange(event.primaryColor || '#6366f1', event.secondaryColor || '#4f46e5', e.target.value)}
                                                className="w-8 h-8 bg-transparent border-none cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={event.backgroundColor || '#020617'}
                                                onChange={(e) => handleColorChange(event.primaryColor || '#6366f1', event.secondaryColor || '#4f46e5', e.target.value)}
                                                className="flex-1 bg-slate-950 border border-slate-800 p-2 rounded-lg text-[10px] font-mono text-white outline-none focus:ring-1"
                                                style={{ '--tw-ring-color': currentPrimary } as any}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-slate-200 mb-4 uppercase tracking-widest text-xs">Event Branding</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Selected Template</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm outline-none focus:ring-1 text-white"
                                        style={{ '--tw-ring-color': currentPrimary } as any}
                                        value={event.templateId || 'none'}
                                        onChange={(e) => handleTemplateChange(e.target.value)}
                                    >
                                        <option value="none">Defaults (Global Settings)</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-[10px] text-slate-500 italic">
                                    {event.templateId
                                        ? "Photos in this event will use the specific frame/watermark from this template."
                                        : "Using global brand settings defined in the Settings menu."}
                                </p>
                                <button
                                    onClick={handleReprocessBranding}
                                    disabled={isReprocessing || event.photos.length === 0}
                                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-2"
                                >
                                    ✨ {isReprocessing ? 'Updating...' : 'Update Branding for All Photos'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Photos Grid */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl min-h-[500px]">
                        <h3 className="text-lg font-bold text-slate-200 mb-6 uppercase tracking-widest text-xs">Photo Library</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {filteredPhotos.length === 0 ? (
                                <div className="col-span-3 py-20 text-center text-slate-600 italic">
                                    No photos found in this moment. Start uploading!
                                </div>
                            ) : (
                                filteredPhotos.map(p => (
                                    <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 group">
                                        <img src={process.env.NEXT_PUBLIC_S3_PUBLIC_URL ? `${process.env.NEXT_PUBLIC_S3_PUBLIC_URL}/${p.thumbnailKey}` : `/${p.thumbnailKey}`} className="w-full h-full object-cover" alt="Event" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            <span className="text-[10px] text-slate-300 font-mono">{p.momentId ? 'Assigned' : 'Unassigned'}</span>
                                            <button
                                                onClick={() => setDeleteConfig({ type: 'photo', id: p.id })}
                                                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold shadow-lg"
                                            >
                                                Delete Photo
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!deleteConfig}
                onClose={() => setDeleteConfig(null)}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
                title={deleteConfig?.type === 'moment' ? 'Delete Moment?' : 'Delete Photo?'}
                message={
                    deleteConfig?.type === 'moment'
                        ? `Are you sure you want to delete "${deleteConfig.name}"? Photos in this moment will be moved to "Unassigned".`
                        : "Are you sure you want to permanently delete this photo? This cannot be undone."
                }
                confirmText={deleteConfig?.type === 'moment' ? 'Delete Moment' : 'Delete Permanently'}
            />
        </div>
    );
}
