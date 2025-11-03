import { RoleTree } from '@/components/core/role-tree';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Role } from '@/types/core';
import { Head, Link } from '@inertiajs/react';

interface RoleHierarchyProps {
    hierarchy: Role[];
}

export default function RoleHierarchy({ hierarchy }: RoleHierarchyProps) {
    return (
        <AppLayout>
            <Head title="Role Hierarchy" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Role Hierarchy</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Visual representation of role structure
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/core/roles">
                            <Button variant="outline">Back to List</Button>
                        </Link>
                        <Link href="/core/roles/create">
                            <Button>Create Role</Button>
                        </Link>
                    </div>
                </div>

                <RoleTree roles={hierarchy} />
            </div>
        </AppLayout>
    );
}

