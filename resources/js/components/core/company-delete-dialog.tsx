import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

interface Company {
    id: number;
    name: string;
}

interface CompanyDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    company: Company | null;
    availableCompanies: Company[];
    ridingCompaniesCount?: number;
    demoReseller?: boolean;
}

export function CompanyDeleteDialog({
    open,
    onOpenChange,
    company,
    availableCompanies,
    ridingCompaniesCount = 0,
    demoReseller = false,
}: CompanyDeleteDialogProps) {
    const ridingLabel = demoReseller ? 'Reseller Companies' : 'Riding Companies';
    const [transferCompanyId, setTransferCompanyId] = useState<string>('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Reset transfer company when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setTransferCompanyId('');
            setIsDeleting(false);
        }
    }, [open]);

    const handleConfirm = () => {
        if (!company) {
            return;
        }

        // If there are riding companies, require transfer company selection
        if (ridingCompaniesCount > 0 && !transferCompanyId) {
            return;
        }

        setIsDeleting(true);

        const data: Record<string, any> = {};
        if (transferCompanyId) {
            data.transfer_company_id = transferCompanyId;
        }

        router.delete(`/core/companies/${company.id}`, {
            data,
            onSuccess: () => {
                onOpenChange(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
            onFinish: () => {
                setIsDeleting(false);
            },
        });
    };

    const hasRidingCompanies = ridingCompaniesCount > 0;
    const canDelete = !hasRidingCompanies || transferCompanyId !== '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <DialogTitle>Delete Reseller</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        {hasRidingCompanies ? (
                            <>
                                Are you sure you want to delete "{company?.name}"? This company has{' '}
                                <strong>{ridingCompaniesCount}</strong> {ridingLabel}. Please select a
                                company to transfer them to.
                            </>
                        ) : (
                            <>
                                Are you sure you want to delete "{company?.name}"? This action cannot be
                                undone and will remove all associated data including users, roles, and
                                permissions.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {hasRidingCompanies && (
                    <div className="space-y-2 py-4">
                        <Label htmlFor="transfer-company">
                            Transfer {ridingLabel} to:{' '}
                            <span className="text-red-600 dark:text-red-400">*</span>
                        </Label>
                        <Select
                            value={transferCompanyId}
                            onValueChange={setTransferCompanyId}
                            disabled={isDeleting}
                        >
                            <SelectTrigger id="transfer-company">
                                <SelectValue placeholder="Select a company..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCompanies
                                    .filter((c) => c.id !== company?.id)
                                    .map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            All {ridingLabel}, users, and leads will be transferred to the selected
                            company.
                        </p>
                    </div>
                )}

                <DialogFooter className="flex gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isDeleting || !canDelete}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
