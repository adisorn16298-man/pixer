"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Events', href: '/admin', icon: '📅' },
        { name: 'Templates', href: '/admin/templates', icon: '🎨' },
        { name: 'Settings (Branding)', href: '/admin/settings', icon: '⚙️' },
        { name: 'Galleries Viewer', href: '/', icon: '🖼️' },
    ];

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-xl font-bold text-indigo-400 tracking-tighter">pixer<span className="text-slate-200"> dashboard</span></h1>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 font-medium'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-slate-800">
                <div className="bg-slate-800/50 p-3 rounded-xl">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Photographer</p>
                    <p className="text-sm font-medium text-slate-200">John Photographer</p>
                </div>
            </div>
        </aside>
    );
}
