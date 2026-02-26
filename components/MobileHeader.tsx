"use client";

import React from 'react';

interface MobileHeaderProps {
    onMenuClick: () => void;
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
    return (
        <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <h1 className="text-lg font-bold text-indigo-400 tracking-tighter">pixer<span className="text-slate-200 ml-1">dashboard</span></h1>
            </div>
        </header>
    );
}
