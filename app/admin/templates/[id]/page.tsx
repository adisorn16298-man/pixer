"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const LANDSCAPE_IMG = "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1200&auto=format&fit=crop";
const PORTRAIT_IMG = "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop";

export default function TemplateEditor() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const isNew = !id || id === 'new';

    const [name, setName] = useState('');
    const [frameUrl, setFrameUrl] = useState('');
    const [watermarkUrl, setWatermarkUrl] = useState('');
    const [framePortraitUrl, setFramePortraitUrl] = useState('');
    const [watermarkPortraitUrl, setWatermarkPortraitUrl] = useState('');
    const [previewOrientation, setPreviewOrientation] = useState<'landscape' | 'portrait'>('landscape');

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(!isNew);
    const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

    const frameInputRef = useRef<HTMLInputElement>(null);
    const watermarkInputRef = useRef<HTMLInputElement>(null);
    const framePortraitInputRef = useRef<HTMLInputElement>(null);
    const watermarkPortraitInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isNew) {
            fetch(`/api/admin/templates/${id}`)
                .then(res => res.json())
                .then(data => {
                    setName(data.name || '');
                    setFrameUrl(data.frameUrl || '');
                    setWatermarkUrl(data.watermarkUrl || '');
                    setFramePortraitUrl(data.framePortraitUrl || '');
                    setWatermarkPortraitUrl(data.watermarkPortraitUrl || '');
                    setIsLoading(false);
                });
        }
    }, [id, isNew]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(prev => ({ ...prev, [type]: true }));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'template_asset');

        try {
            const res = await fetch('/api/admin/templates/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                if (type === 'frame') setFrameUrl(data.url);
                else if (type === 'watermark') setWatermarkUrl(data.url);
                else if (type === 'framePortrait') setFramePortraitUrl(data.url);
                else if (type === 'watermarkPortrait') setWatermarkPortraitUrl(data.url);
            } else {
                alert(`Failed to upload ${type}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error uploading file');
        } finally {
            setIsUploading(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleSave = async () => {
        if (!name) return alert('Please enter a template name');
        setIsSaving(true);
        const url = isNew ? '/api/admin/templates' : `/api/admin/templates/${id}`;
        const method = isNew ? 'POST' : 'PUT';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                frameUrl,
                watermarkUrl,
                framePortraitUrl,
                watermarkPortraitUrl
            }),
        });

        if (res.ok) {
            router.push('/admin/templates');
        } else {
            setIsSaving(false);
            alert('Failed to save template');
        }
    };

    if (isLoading) return <div className="p-20 text-center text-slate-500 animate-pulse">Loading template details...</div>;

    const currentFrame = previewOrientation === 'landscape' ? frameUrl : framePortraitUrl;
    const currentWatermark = previewOrientation === 'landscape' ? watermarkUrl : watermarkPortraitUrl;

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
                    <p className="text-slate-400">Configure branding for both landscape and portrait orientations.</p>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Landscape Assets */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="text-lg">↔</span> Landscape Assets
                                </h4>

                                {/* Frame Upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-500 uppercase">Frame Overlay</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => frameInputRef.current?.click()}
                                            disabled={isUploading.frame}
                                            className="w-full bg-slate-800 hover:bg-slate-700 p-3 rounded-xl text-white transition-all text-xs font-medium flex items-center justify-center gap-2 truncate"
                                        >
                                            {isUploading.frame ? '...' : (frameUrl ? '✅ Frame' : '📁 Upload Frame')}
                                        </button>
                                        <input type="file" ref={frameInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'frame')} />
                                    </div>
                                </div>

                                {/* Watermark Upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-500 uppercase">Watermark</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => watermarkInputRef.current?.click()}
                                            disabled={isUploading.watermark}
                                            className="w-full bg-slate-800 hover:bg-slate-700 p-3 rounded-xl text-white transition-all text-xs font-medium flex items-center justify-center gap-2 truncate"
                                        >
                                            {isUploading.watermark ? '...' : (watermarkUrl ? '✅ Watermark' : '📁 Upload Watermark')}
                                        </button>
                                        <input type="file" ref={watermarkInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'watermark')} />
                                    </div>
                                </div>
                            </div>

                            {/* Portrait Assets */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="text-lg">↕</span> Portrait Assets
                                </h4>

                                {/* Frame Portrait Upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-500 uppercase">Frame Overlay</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => framePortraitInputRef.current?.click()}
                                            disabled={isUploading.framePortrait}
                                            className="w-full bg-slate-800 hover:bg-slate-700 p-3 rounded-xl text-white transition-all text-xs font-medium flex items-center justify-center gap-2 truncate"
                                        >
                                            {isUploading.framePortrait ? '...' : (framePortraitUrl ? '✅ Frame' : '📁 Upload Frame')}
                                        </button>
                                        <input type="file" ref={framePortraitInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'framePortrait')} />
                                    </div>
                                </div>

                                {/* Watermark Portrait Upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-500 uppercase">Watermark</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => watermarkPortraitInputRef.current?.click()}
                                            disabled={isUploading.watermarkPortrait}
                                            className="w-full bg-slate-800 hover:bg-slate-700 p-3 rounded-xl text-white transition-all text-xs font-medium flex items-center justify-center gap-2 truncate"
                                        >
                                            {isUploading.watermarkPortrait ? '...' : (watermarkPortraitUrl ? '✅ Watermark' : '📁 Upload Watermark')}
                                        </button>
                                        <input type="file" ref={watermarkPortraitInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'watermarkPortrait')} />
                                    </div>
                                </div>
                            </div>
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
                <div className="space-y-6">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-lg font-bold text-slate-200 uppercase tracking-widest text-xs">Live Preview</h3>
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                            <button
                                onClick={() => setPreviewOrientation('landscape')}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${previewOrientation === 'landscape' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Landscape
                            </button>
                            <button
                                onClick={() => setPreviewOrientation('portrait')}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${previewOrientation === 'portrait' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Portrait
                            </button>
                        </div>
                    </div>

                    <div className={`bg-slate-950 border border-slate-800 rounded-3xl p-4 flex items-center justify-center relative overflow-hidden transition-all duration-500 ${previewOrientation === 'landscape' ? 'aspect-[3/2]' : 'aspect-[2/3]'}`}>
                        {/* The Mock Photo */}
                        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl bg-slate-900 flex items-center justify-center">
                            <img
                                src={previewOrientation === 'landscape' ? LANDSCAPE_IMG : PORTRAIT_IMG}
                                className="w-full h-full object-cover"
                                alt="Preview background"
                            />

                            {/* The Frame Layer */}
                            {currentFrame && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <img
                                        src={currentFrame}
                                        className="w-full h-full object-fill"
                                        alt="Frame"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                            )}

                            {/* The Watermark Layer */}
                            {currentWatermark && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <img
                                        src={currentWatermark}
                                        className="w-1/3 h-auto opacity-50"
                                        alt="Watermark"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                            )}

                            {!currentFrame && !currentWatermark && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                    <p className="text-white/60 text-[10px] font-medium text-center px-4">Upload {previewOrientation} assets to see preview</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

