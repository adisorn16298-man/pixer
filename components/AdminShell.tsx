"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import { usePathname } from 'next/navigation';

interface AdminShellProps {
    children: React.ReactNode;
    photographerName: string;
}

export default function AdminShell({ children, photographerName }: AdminShellProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Close sidebar automatically when navigating to a new page on mobile
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden relative">
            <Sidebar
                photographerName={photographerName}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto bg-slate-950">
                    <div className="p-4 md:p-8 max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
