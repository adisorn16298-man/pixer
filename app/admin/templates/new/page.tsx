"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const PLACEHOLDER_IMG = "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1200&auto=format&fit=crop";

export default function TemplateEditor() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;
    const isNew = !id || id === 'new';

    const [name, setName] = useState('');
    const [frameUrl, setFrameUrl] = useState('');
    const [watermarkUrl, setWatermarkUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(!isNew);

    useEffect(() => {
        if (!isNew) {
            fetch(`/api/admin/templates/${id}`)
                .then(res => res.json())
                .then(data => {
                    setName(data.name || '');
                    setFrameUrl(data.frameUrl || '');
                    setWatermarkUrl(data.watermarkUrl || '');
                    setIsLoading(false);
                });
        }
    }, [id, isNew]);

    const handleSave = async () => {
        if (!name) return alert('Please enter a template name');
        setIsSaving(true);
        const url = isNew ? '/api/admin/templates' : `/api/admin/templates/${id}`;
        const method = isNew ? 'POST' : 'PUT';

        const res = await fetch(url, {
            method,
            body: JSON.stringify({ name, frameUrl, watermarkUrl }),
        });

        if (res.ok) {
            router.push('/admin/templates');
        } else {
            setIsSaving(false);
            alert('Failed to save template');
        }
    };

    if (isLoading) return <div className="p-20 text-center text-slate-500 animate-pulse">Loading template details...</div>;

    return (
        <div className="space-y-10">
            <div className="flex items-center gap-4">
                <Link href="/admin/templates" className="p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-xl">
                    ←
                </Link>
                <div>
                    <h2 className="text-4xl font-extrabold text-white tracking-tight">
                        {isNew ? 'New Template' : 'Edit Template'}
                    </h2>
                    <p className="text-slate-400">Configure your branding layers and preview them instantly.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Configuration */}
                <div className="space-y-8">
                    <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 uppercase tracking-widest text-[10px]">Template Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl outline-none focus:ring-1 focus:ring-indigo-600 text-white"
                                placeholder="e.g. Wedding Minimalist"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 uppercase tracking-widest text-[10px]">Frame URL (Overlay)</label>
                            <input
                                type="text"
                                value={frameUrl}
                                onChange={e => setFrameUrl(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl outline-none focus:ring-1 focus:ring-indigo-600 text-white"
                                placeholder="/frame.png"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 uppercase tracking-widest text-[10px]">Watermark URL</label>
                            <input
                                type="text"
                                value={watermarkUrl}
                                onChange={e => setWatermarkUrl(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl outline-none focus:ring-1 focus:ring-indigo-600 text-white"
                                placeholder="/watermark.png"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/30"
                    >
                        {isSaving ? 'Saving...' : (isNew ? 'Create Template' : 'Save Changes')}
                    </button>
                </div>

                {/* Preview System */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-200 uppercase tracking-widest text-xs px-2">Live Preview</h3>
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 aspect-[3/2] flex items-center justify-center relative overflow-hidden">
                        {/* The Mock Photo */}
                        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl bg-slate-900 flex items-center justify-center">
                            <img
                                src={PLACEHOLDER_IMG}
                                className="w-full h-full object-cover"
                                alt="Preview background"
                            />

                            {/* The Frame Layer */}
                            {frameUrl && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <img
                                        src={frameUrl}
                                        className="w-full h-full object-fill"
                                        alt="Frame"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                            )}

                            {/* The Watermark Layer */}
                            {watermarkUrl && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <img
                                        src={watermarkUrl}
                                        className="w-1/3 h-auto opacity-50"
                                        alt="Watermark"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                            )}

                            {!frameUrl && !watermarkUrl && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                    <p className="text-white/60 text-sm font-medium">Add Frame or Watermark URL to see preview</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
