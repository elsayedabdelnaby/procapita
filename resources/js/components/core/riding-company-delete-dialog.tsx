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

interface RidingCompany {
    id: number;
    name: string;
}

interface RidingCompanyDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ridingCompany: RidingCompany | null;
    availableRidingCompanies?: RidingCompany[];
    usersCount?: number;
}

export function RidingCompanyDeleteDialog({
    open,
    onOpenChange,
    ridingCompany,
    availableRidingCompanies = [],
    usersCount = 0,
}: RidingCompanyDeleteDialogProps) {
    const [transferRidingCompanyId, setTransferRidingCompanyId] = useState<string>('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Reset transfer riding company when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setTransferRidingCompanyId('');
            setIsDeleting(false);
        }
    }, [open]);

    const handleConfirm = () => {
        if (!ridingCompany) {
            return;
        }

        // If there are users, require transfer riding company selection
        if (usersCount > 0 && !transferRidingCompanyId) {
            return;
        }

        setIsDeleting(true);

        const data: Record<string, any> = {};
        if (transferRidingCompanyId) {
            data.transfer_riding_company_id = transferRidingCompanyId;
        }

        router.delete(`/ridingcarcompanies/riding-companies/${ridingCompany.id}`, {
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

    const hasUsers = usersCount > 0;
    const canDelete = !hasUsers || transferRidingCompanyId !== '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <DialogTitle>Delete Riding Company</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        {hasUsers ? (
                            <>
                                Are you sure you want to delete "{ridingCompany?.name}"? This riding company has{' '}
                                <strong>{usersCount}</strong> user{usersCount === 1 ? '' : 's'}. Please select a
                                riding company to transfer them to.
                            </>
                        ) : (
                            <>
                                Are you sure you want to delete "{ridingCompany?.name}"? This action cannot be
                                undone and will remove all associated data including stage templates, document
                                requirements, and integrations.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {hasUsers && (
                    <div className="space-y-2 py-4">
                        <Label htmlFor="transfer-riding-company">
                            Transfer Users to:{' '}
                            <span className="text-red-600 dark:text-red-400">*</span>
                        </Label>
                        <Select
                            value={transferRidingCompanyId}
                            onValueChange={setTransferRidingCompanyId}
                            disabled={isDeleting}
                        >
                            <SelectTrigger id="transfer-riding-company">
                                <SelectValue placeholder="Select a riding company..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(Array.isArray(availableRidingCompanies) ? availableRidingCompanies : [])
                                    .filter((rc) => rc.id !== ridingCompany?.id)
                                    .map((rc) => (
                                        <SelectItem key={rc.id} value={String(rc.id)}>
                                            {rc.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            All users, leads, follow-ups, and updates will be transferred to the selected riding
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
