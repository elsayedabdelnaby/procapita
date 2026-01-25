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

interface LeadStatus {
    id: number;
    name: string;
}

interface LeadStatusDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadStatus: LeadStatus | null;
    availableLeadStatuses: LeadStatus[];
    driversCount?: number;
}

export function LeadStatusDeleteDialog({
    open,
    onOpenChange,
    leadStatus,
    availableLeadStatuses,
    driversCount = 0,
}: LeadStatusDeleteDialogProps) {
    const [transferLeadStatusId, setTransferLeadStatusId] = useState<string>('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Reset transfer lead status when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setTransferLeadStatusId('');
            setIsDeleting(false);
        }
    }, [open]);

    const handleConfirm = () => {
        if (!leadStatus) {
            return;
        }

        // If there are drivers, require transfer lead status selection
        if (driversCount > 0 && !transferLeadStatusId) {
            return;
        }

        setIsDeleting(true);

        const data: Record<string, any> = {};
        if (transferLeadStatusId) {
            data.transfer_lead_status_id = transferLeadStatusId;
        }

        router.delete(`/drivers/lead-statuses/${leadStatus.id}`, {
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

    const hasDrivers = driversCount > 0;
    const canDelete = !hasDrivers || transferLeadStatusId !== '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <DialogTitle>Delete Lead Status</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        {hasDrivers ? (
                            <>
                                Are you sure you want to delete "{leadStatus?.name}"? This lead status has{' '}
                                <strong>{driversCount}</strong> Driver{driversCount === 1 ? '' : 's'}. Please
                                select a lead status to transfer them to.
                            </>
                        ) : (
                            <>
                                Are you sure you want to delete "{leadStatus?.name}"? This action cannot be
                                undone.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {hasDrivers && (
                    <div className="space-y-2 py-4">
                        <Label htmlFor="transfer-lead-status">
                            Transfer Drivers to:{' '}
                            <span className="text-red-600 dark:text-red-400">*</span>
                        </Label>
                        <Select
                            value={transferLeadStatusId}
                            onValueChange={setTransferLeadStatusId}
                            disabled={isDeleting}
                        >
                            <SelectTrigger id="transfer-lead-status">
                                <SelectValue placeholder="Select a lead status..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableLeadStatuses
                                    .filter((ls) => ls.id !== leadStatus?.id)
                                    .map((ls) => (
                                        <SelectItem key={ls.id} value={String(ls.id)}>
                                            {ls.name}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            All drivers will be transferred to the selected lead status.
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
