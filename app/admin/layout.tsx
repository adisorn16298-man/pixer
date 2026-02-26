import AdminShell from '@/components/AdminShell';
import prisma from '@/lib/prisma';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await prisma.user.findFirst();
    const photographerName = user?.name || 'Photographer';

    return (
        <AdminShell photographerName={photographerName}>
            {children}
        </AdminShell>
    );
}
