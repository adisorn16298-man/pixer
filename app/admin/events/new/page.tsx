"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewEventPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [templateId, setTemplateId] = useState('none');
    const [isFeatured, setIsFeatured] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetch('/api/admin/templates')
            .then(res => res.json())
            .then(data => setTemplates(data));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return alert('Please enter an event name');

        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, date, templateId, isFeatured }),
            });

            if (res.ok) {
                const event = await res.json();
                router.push(`/admin/events/${event.id}`);
            } else {
                alert('Failed to create event');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Error creating event');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-10 py-10">
            <div className="flex items-center gap-4">
                <Link href="/admin" className="p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-xl">
                    ←
                </Link>
                <div>
                    <h2 className="text-4xl font-extrabold text-white tracking-tight">Create New Event</h2>
                    <p className="text-slate-400">Launch a new gallery and start capturing moments.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl space-y-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-widest text-[10px]">Event Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl outline-none focus:ring-1 focus:ring-indigo-600 text-white"
                            placeholder="e.g. Smith & Doe Wedding"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-widest text-[10px]">Event Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl outline-none focus:ring-1 focus:ring-indigo-600 text-white"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-widest text-[10px]">Branding Template (Optional)</label>
                        <select
                            value={templateId}
                            onChange={e => setTemplateId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl outline-none focus:ring-1 focus:ring-indigo-600 text-white"
                        >
                            <option value="none">Defaults (Global Settings)</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-500 italic mt-1 px-1">
                            You can change this anytime later in the event settings.
                        </p>
                        <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 p-4 rounded-xl">
                            <input
                                type="checkbox"
                                id="isFeatured"
                                checked={isFeatured}
                                onChange={e => setIsFeatured(e.target.checked)}
                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="isFeatured" className="text-sm font-medium text-slate-300 cursor-pointer">
                                Show on Home Page (Galleries Viewer)
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-600/30 text-lg"
                    >
                        {isSaving ? 'Creating Event...' : '🚀 Launch Event'}
                    </button>
            </form>
        </div>
    );
}
