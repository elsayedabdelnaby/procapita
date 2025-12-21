import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
                <p className="text-neutral-600 dark:text-neutral-400">Welcome to your dashboard.</p>
            </div>
        </AppLayout>
    );
}
