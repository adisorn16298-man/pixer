import Sidebar from '@/components/Sidebar';
import prisma from '@/lib/prisma';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await prisma.user.findFirst();
    const photographerName = user?.name || 'Photographer';

    return (
        <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
            <Sidebar photographerName={photographerName} />
            <main className="flex-1 overflow-y-auto bg-slate-950">
                <div className="p-8 max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
