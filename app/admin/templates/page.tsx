"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<any | null>(null);

    useEffect(() => {
        fetch('/api/admin/templates')
            .then(res => res.json())
            .then(data => {
                setTemplates(data);
                setIsLoading(false);
            });
    }, []);

    const handleDelete = async () => {
        if (!templateToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/templates/${templateToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                setTemplates(templates.filter(t => t.id !== templateToDelete.id));
                setTemplateToDelete(null);
            }
        } catch (error) {
            console.error('Delete template error:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) return <div className="p-20 text-center text-slate-500 animate-pulse">Loading templates...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-extrabold text-white tracking-tight">Branding Templates</h2>
                    <p className="text-slate-400 mt-2">Manage reusable frame and watermark combinations.</p>
                </div>
                <Link
                    href="/admin/templates/new"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20"
                >
                    + Create New Template
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                    <div key={template.id} className="group bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all flex flex-col">
                        <div className="aspect-video bg-slate-950 relative overflow-hidden flex items-center justify-center p-4">
                            {/* Simple Preview Thumbnail */}
                            <div className="w-full h-full border border-slate-800 rounded-xl relative overflow-hidden bg-slate-900 flex items-center justify-center text-slate-700 text-xs italic">
                                Placeholder Image
                                {template.frameUrl && (
                                    <img src={template.frameUrl} className="absolute inset-0 w-full h-full object-fill pointer-events-none" alt="" />
                                )}
                                {template.watermarkUrl && (
                                    <img src={template.watermarkUrl} className="absolute w-1/4 h-auto opacity-50 pointer-events-none" alt="" />
                                )}
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">{template.name}</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {template.frameUrl ? '✅ Frame' : '❌ No Frame'} • {template.watermarkUrl ? '✅ Watermark' : '❌ No Watermark'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href={`/admin/templates/${template.id}`}
                                    className="flex-1 text-center bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-xl text-sm font-medium transition-all"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => setTemplateToDelete(template)}
                                    className="px-4 py-2 bg-red-950/30 hover:bg-red-900/50 text-red-500 rounded-xl text-sm font-medium transition-all"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {templates.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl text-center">
                        <p className="text-slate-500">No templates created yet.</p>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={!!templateToDelete}
                onClose={() => setTemplateToDelete(null)}
                onConfirm={handleDelete}
                isLoading={isDeleting}
                title="Delete Template?"
                message={`Are you sure you want to delete "${templateToDelete?.name}"? Events using this template will revert to global default settings.`}
                confirmText="Delete Template"
            />
        </div>
    );
}
