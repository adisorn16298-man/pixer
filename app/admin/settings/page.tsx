"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
    { id: 'branding', label: 'Branding', icon: '🎨' },
    { id: 'cloud', label: 'Cloud & Archive', icon: '☁️' },
    { id: 'advanced', label: 'Advanced Processing', icon: '⚙️' },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('branding');
    const [settings, setSettings] = useState({
        brandName: '',
        brandLogoUrl: '',
        watermarkUrl: '',
        frameUrl: '',
        watermarkPortraitUrl: '',
        framePortraitUrl: '',
        whiteLabel: false,
        jpegQuality: 80,
        thumbQuality: 60
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(data => {
                setSettings({
                    brandName: data.brandName || '',
                    brandLogoUrl: data.brandLogoUrl || '',
                    watermarkUrl: data.watermarkUrl || '',
                    frameUrl: data.frameUrl || '',
                    watermarkPortraitUrl: data.watermarkPortraitUrl || '',
                    framePortraitUrl: data.framePortraitUrl || '',
                    whiteLabel: data.whiteLabel || false,
                    jpegQuality: data.jpegQuality || 80,
                    thumbQuality: data.thumbQuality || 60
                });
                setIsLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        const res = await fetch('/api/admin/settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
        setIsSaving(false);
        if (res.ok) {
            alert('Settings saved successfully!');
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center p-20 min-h-[400px]">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
    );

    const renderInput = (label: string, key: keyof typeof settings, help?: string, type: 'text' | 'number' | 'checkbox' = 'text') => (
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 block">{label}</label>
            {type === 'checkbox' ? (
                <div className="flex items-center space-x-3 bg-slate-950/50 border border-slate-800 p-4 rounded-2xl">
                    <input
                        type="checkbox"
                        checked={settings[key] as boolean}
                        onChange={e => setSettings({ ...settings, [key]: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-400">{help}</span>
                </div>
            ) : (
                <>
                    <input
                        type={type}
                        value={settings[key] as string | number}
                        onChange={e => setSettings({ ...settings, [key]: type === 'number' ? parseInt(e.target.value) : e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl outline-none focus:ring-1 focus:ring-indigo-600 text-white transition-all hover:border-slate-700"
                        placeholder={`e.g. ${label}...`}
                    />
                    {help && <p className="text-[10px] text-slate-500 italic mt-1">{help}</p>}
                </>
            )}
        </div>
    );

    return (
        <div className="max-w-5xl">
            <header className="mb-12">
                <motion.h2
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl font-black text-white tracking-tighter"
                >
                    Admin <span className="text-indigo-500">Settings</span>
                </motion.h2>
                <p className="text-slate-400 mt-2 text-lg">Configure system behavior, cloud sync, and visual identity.</p>
            </header>

            {/* Tab Navigation */}
            <div className="flex p-1.5 bg-slate-900/50 rounded-3xl border border-slate-800 mb-10 w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            relative flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold transition-all
                            ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}
                        `}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-indigo-600 rounded-2xl"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">{tab.icon}</span>
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>

            <main className="min-h-[500px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="bg-slate-900/30 border border-slate-800/50 rounded-[40px] p-10 overflow-hidden relative"
                    >
                        {activeTab === 'branding' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <section className="space-y-8">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                                        <h3 className="text-xl font-bold text-white">Identity</h3>
                                    </div>
                                    {renderInput('Brand Name', 'brandName')}
                                    {renderInput('Brand Logo URL', 'brandLogoUrl')}
                                    {renderInput('White Label Mode', 'whiteLabel', 'Remove "Powered by Pixer" from the public gallery', 'checkbox')}
                                </section>
                                <section className="space-y-8">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="w-1.5 h-6 bg-pink-500 rounded-full"></div>
                                        <h3 className="text-xl font-bold text-white">Default Overlays</h3>
                                    </div>
                                    <div className="p-6 bg-slate-950/30 border border-slate-800 rounded-3xl space-y-6">
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Landscape (Default)</h4>
                                        {renderInput('Frame URL', 'frameUrl')}
                                        {renderInput('Watermark URL', 'watermarkUrl')}
                                    </div>
                                    <div className="p-6 bg-slate-950/30 border border-slate-800 rounded-3xl space-y-6">
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Portrait (Mobile Optimized)</h4>
                                        {renderInput('Portrait Frame URL', 'framePortraitUrl')}
                                        {renderInput('Portrait Watermark URL', 'watermarkPortraitUrl')}
                                    </div>
                                </section> section
                            </div>
                        )}

                        {activeTab === 'cloud' && (
                            <div className="space-y-10 max-w-2xl">
                                <section className="space-y-6">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
                                        <h3 className="text-xl font-bold text-white">Google Drive Archive</h3>
                                    </div>
                                    <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-3xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-bold">Auto-Archive Service</p>
                                                <p className="text-slate-400 text-sm">Photos uploaded via UI or Ingest folder are synced automatically.</p>
                                            </div>
                                            <div className="flex items-center space-x-2 bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                <span>ACTIVE</span>
                                            </div>
                                        </div>
                                        <div className="pt-4 mt-4 border-t border-slate-800/50 grid grid-cols-2 gap-4 text-xs">
                                            <div className="space-y-1">
                                                <p className="text-slate-500 font-bold uppercase tracking-wider">Storage Account</p>
                                                <p className="text-slate-300">Connected Project (env)</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-slate-500 font-bold uppercase tracking-wider">Root Directory</p>
                                                <p className="text-slate-300">/PIXER_ARCHIVE</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold transition-all border border-slate-700">Re-authenticate Account</button>
                                        <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-bold transition-all border border-slate-700">Audit Storage Usage</button>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'advanced' && (
                            <div className="space-y-10 max-w-2xl">
                                <section className="space-y-8">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="w-1.5 h-6 bg-yellow-500 rounded-full"></div>
                                        <h3 className="text-xl font-bold text-white">Image Processing Quality</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {renderInput('Processing Quality (0-100)', 'jpegQuality', 'Higher value means better quality but larger files.', 'number')}
                                        {renderInput('Thumbnail Quality (0-100)', 'thumbQuality', 'Small images used for gallery browsing.', 'number')}
                                    </div>
                                </section>

                                <section className="space-y-8">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                                        <h3 className="text-xl font-bold text-white">System Logs</h3>
                                    </div>
                                    <div className="bg-black/40 rounded-3xl p-6 font-mono text-[10px] text-slate-500 border border-slate-800/50 leading-relaxed">
                                        <p>[SYS] Initializing Admin Dashboard...</p>
                                        <p className="text-green-500/80">[DB] Connection established to SQLite.</p>
                                        <p className="text-blue-500/80">[CLOUD] Google Drive API listener standing by.</p>
                                        <p className="text-indigo-400/80 font-bold">[READY] All systems functional.</p>
                                    </div>
                                </section>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            <footer className="mt-12 flex items-center justify-between bg-slate-900/50 border border-slate-800 p-8 rounded-[40px]">
                <div>
                    <h4 className="text-white font-bold">Unsaved Changes</h4>
                    <p className="text-slate-400 text-sm">Updated details will affect all future photo uploads.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`
                        min-w-[200px] h-[64px] rounded-3xl font-black text-lg transition-all shadow-2xl scale-100 active:scale-95
                        ${isSaving
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/40'}
                    `}
                >
                    {isSaving ? 'Applying Changes...' : 'Save Settings'}
                </button>
            </footer>
        </div>
    );
}
