import MasonryGallery from '@/components/MasonryGallery';

// Mock data for the demo
const mockPhotos = [
    {
        id: '1',
        thumbnailUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=400&q=60',
        watermarkedUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
        width: 1200,
        height: 800,
    },
    {
        id: '2',
        thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=60',
        watermarkedUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
        width: 800,
        height: 1200,
    },
    {
        id: '3',
        thumbnailUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=400&q=60',
        watermarkedUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80',
        width: 1200,
        height: 1200,
    },
    {
        id: '4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=400&q=60',
        watermarkedUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
        width: 1200,
        height: 600,
    },
    {
        id: '5',
        thumbnailUrl: 'https://images.unsplash.com/photo-1505232458567-cc4b48159df7?auto=format&fit=crop&w=400&q=60',
        watermarkedUrl: 'https://images.unsplash.com/photo-1505232458567-cc4b48159df7?auto=format&fit=crop&w=1200&q=80',
        width: 600,
        height: 1200,
    },
    {
        id: '6',
        thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=60',
        watermarkedUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
        width: 1200,
        height: 900,
    }
];

export default function DemoPage() {
    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <header className="p-8 text-center bg-gradient-to-b from-slate-900 to-transparent">
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-4">
                    Wedding Night 2026
                </h1>
                <p className="text-lg leading-8 text-slate-300">
                    Professional event photos, delivered instantly.
                </p>
            </header>

            <div className="max-w-7xl mx-auto py-12 px-4">
                <MasonryGallery initialPhotos={mockPhotos} eventId="wedding-2026" />
            </div>

            <footer className="p-12 text-center text-slate-500 text-sm">
                &copy; 2026 Instant Gallery Platform. All rights reserved.
            </footer>
        </main>
    );
}
