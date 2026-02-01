import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, XCircle, RefreshCw, SkipForward } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { DataTable } from '@/components/core/data-table';

interface ImportResult {
    total_scanned: number;
    imported: number;
    updated: number;
    skipped: number;
    errors_count: number;
    created_records: Array<{
        row: number;
        data: Record<string, any>;
        driver_id: number;
    }>;
    skipped_records: Array<{
        row: number;
        data: Record<string, any>;
        existing_id: number;
        reason: string;
    }>;
    updated_records: Array<{
        row: number;
        data: Record<string, any>;
        driver_id: number;
    }>;
    errors: string[];
}

interface ImportResultsProps {
    importResults: ImportResult;
}

export default function ImportResults({ importResults }: ImportResultsProps) {
    const [detailsDialog, setDetailsDialog] = useState<{
        open: boolean;
        type: 'created' | 'skipped' | 'updated' | null;
        records: any[];
    }>({
        open: false,
        type: null,
        records: [],
    });

    const handleViewDetails = (type: 'created' | 'skipped' | 'updated') => {
        let records: any[] = [];
        switch (type) {
            case 'created':
                records = importResults.created_records || [];
                break;
            case 'skipped':
                records = importResults.skipped_records || [];
                break;
            case 'updated':
                records = importResults.updated_records || [];
                break;
        }
        setDetailsDialog({ open: true, type, records });
    };

    const totalSuccess = importResults.imported + importResults.updated;
    const successRate = importResults.total_scanned > 0 
        ? ((totalSuccess / importResults.total_scanned) * 100).toFixed(1) 
        : '0';

    return (
        <AppLayout>
            <Head title="Import Results" />

            <div className="p-4 sm:p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-2">Import Results</h1>
                    <p className="text-sm text-muted-foreground">
                        Summary of the import process
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                    Total Records Scanned
                                </p>
                                <p className="text-2xl font-bold">{importResults.total_scanned}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                <RefreshCw className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                    Successfully Imported
                                </p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {totalSuccess} / {importResults.total_scanned}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {successRate}% success rate
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                    Records Created
                                </p>
                                <p className="text-2xl font-bold">{importResults.imported}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                    Records Skipped
                                </p>
                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                    {importResults.skipped}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                                <SkipForward className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Detailed Results */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {/* Records Created */}
                    <Card className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Records Created</h3>
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                                {importResults.imported}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            New records that were successfully created
                        </p>
                        {importResults.created_records.length > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails('created')}
                                className="w-full"
                            >
                                View Details
                            </Button>
                        )}
                    </Card>

                    {/* Records Skipped */}
                    <Card className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Records Skipped</h3>
                            <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                                {importResults.skipped}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Duplicate records that were skipped
                        </p>
                        {importResults.skipped_records.length > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails('skipped')}
                                className="w-full"
                            >
                                View Details
                            </Button>
                        )}
                    </Card>

                    {/* Records Updated */}
                    <Card className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Records Updated</h3>
                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                {importResults.updated}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Existing records that were updated
                        </p>
                        {importResults.updated_records.length > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails('updated')}
                                className="w-full"
                            >
                                View Details
                            </Button>
                        )}
                    </Card>
                </div>

                {/* Errors */}
                {importResults.errors_count > 0 && (
                    <Card className="p-4 sm:p-6 border-destructive/20">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-destructive">Errors</h3>
                            <Badge variant="destructive">{importResults.errors_count}</Badge>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {importResults.errors.map((error, index) => (
                                <div key={index} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                                    {error}
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {/* Actions */}
                <div className="mt-6 flex gap-2 justify-end">
                    <Link href="/drivers/drivers">
                        <Button variant="outline">Back to Leads</Button>
                    </Link>
                    <Button onClick={() => router.reload()}>Import Another File</Button>
                </div>

                {/* Details Dialog */}
                <Dialog open={detailsDialog.open} onOpenChange={(open) => setDetailsDialog({ open, type: null, records: [] })}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                            <DialogTitle>
                                {detailsDialog.type === 'created' && 'Created Records Details'}
                                {detailsDialog.type === 'skipped' && 'Skipped Records Details'}
                                {detailsDialog.type === 'updated' && 'Updated Records Details'}
                            </DialogTitle>
                            <DialogDescription>
                                View detailed information about the {detailsDialog.type} records
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {detailsDialog.records.length > 0 ? (
                                <DataTable
                                    data={detailsDialog.records}
                                    columns={[
                                        {
                                            header: 'Row',
                                            accessor: (row) => row.row,
                                        },
                                        {
                                            header: 'Full Name',
                                            accessor: (row) => row.data?.full_name || '-',
                                        },
                                        {
                                            header: 'Phone',
                                            accessor: (row) => row.data?.phone || '-',
                                        },
                                        {
                                            header: 'Email',
                                            accessor: (row) => row.data?.email || '-',
                                        },
                                        {
                                            header: 'Driver ID',
                                            accessor: (row) => row.driver_id || row.existing_id || '-',
                                        },
                                        ...(detailsDialog.type === 'skipped' ? [{
                                            header: 'Reason',
                                            accessor: (row) => row.reason || '-',
                                        }] : []),
                                    ]}
                                />
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    No records found
                                </p>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t flex-shrink-0 flex justify-end gap-2">
                            <Button onClick={() => setDetailsDialog({ open: false, type: null, records: [] })}>
                                Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

