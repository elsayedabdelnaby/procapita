import { DeleteDialog } from '@/components/core/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';

interface Company {
    id: number;
    name: string;
}

interface DocumentRequirement {
    id: number;
    name: string;
    type: string;
    required: boolean;
    instructions?: string;
    active: boolean;
    default_status?: string;
    created_at?: string;
}

interface DocumentRequirementsIndexProps {
    company: Company;
    documentRequirements: DocumentRequirement[];
}

export default function DocumentRequirementsIndex({ company, documentRequirements }: DocumentRequirementsIndexProps) {
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; requirement: DocumentRequirement | null }>({
        open: false,
        requirement: null,
    });

    const handleDelete = (requirement: DocumentRequirement) => {
        setDeleteDialog({ open: true, requirement });
    };

    const confirmDelete = () => {
        if (deleteDialog.requirement) {
            router.delete(`/core/document-requirements/${deleteDialog.requirement.id}`, {
                onSuccess: () => setDeleteDialog({ open: false, requirement: null }),
            });
        }
    };

    return (
        <AppLayout>
            <Head title={`Documents Required - ${company.name}`} />

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <Link
                            href={`/core/companies/${company.id}`}
                            className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Reseller
                        </Link>
                        <h1 className="text-2xl font-bold">Documents Required</h1>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Manage document requirements for reseller: <strong>{company.name}</strong>
                        </p>
                    </div>
                    <Link href={`/core/companies/${company.id}/document-requirements/create`}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Document Requirement
                        </Button>
                    </Link>
                </div>

                <Card className="p-6">
                    {documentRequirements.length > 0 ? (
                        <div className="space-y-3">
                            {documentRequirements.map((req) => (
                                <div
                                    key={req.id}
                                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                                >
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link
                                                href={`/core/document-requirements/${req.id}/edit`}
                                                className="font-medium hover:underline"
                                            >
                                                {req.name}
                                            </Link>
                                            <Badge variant={req.active ? 'default' : 'secondary'} className="text-xs">
                                                {req.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                            {req.required && (
                                                <Badge variant="destructive" className="text-xs">
                                                    Required
                                                </Badge>
                                            )}
                                            <span className="text-xs text-neutral-500 capitalize">{req.type}</span>
                                        </div>
                                        {req.instructions && (
                                            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-1">
                                                {req.instructions}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={`/core/document-requirements/${req.id}/edit`}>
                                            <Button variant="outline" size="sm">
                                                Edit
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            onClick={() => handleDelete(req)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-neutral-500">
                            <p className="mb-4">No document requirements for this reseller yet.</p>
                            <Link href={`/core/companies/${company.id}/document-requirements/create`}>
                                <Button>Create First Document Requirement</Button>
                            </Link>
                        </div>
                    )}
                </Card>
            </div>

            <DeleteDialog
                open={deleteDialog.open}
                onOpenChange={(open) => !open && setDeleteDialog({ open: false, requirement: null })}
                onConfirm={confirmDelete}
                title="Delete document requirement"
                description={
                    deleteDialog.requirement
                        ? `Are you sure you want to delete "${deleteDialog.requirement.name}"?`
                        : ''
                }
            />
        </AppLayout>
    );
}
