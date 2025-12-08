import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface ImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    importStoreUrl: string;
    availableFields: Array<{ 
        value: string; 
        label: string; 
        type?: 'text' | 'email' | 'phone' | 'date' | 'picklist' | 'textarea';
        options?: Array<{ value: string | number; label: string }>;
    }>;
    entityName: string;
}

type Step = 1 | 2 | 3;

export function ImportModal({
    open,
    onOpenChange,
    importStoreUrl,
    availableFields,
    entityName,
}: ImportModalProps) {
    const [step, setStep] = useState<Step>(1);
    const [file, setFile] = useState<File | null>(null);
    const [hasHeader, setHasHeader] = useState(true);
    const [encoding, setEncoding] = useState('UTF-8');
    const [delimiter, setDelimiter] = useState('comma');
    const [duplicateHandling, setDuplicateHandling] = useState('skip');
    const [matchingFields, setMatchingFields] = useState<string[]>(['phone']); // Default to phone
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvFirstRow, setCsvFirstRow] = useState<string[]>([]);
    const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const delimiterMap: Record<string, string> = {
        comma: ',',
        semicolon: ';',
        pipe: '|',
        caret: '^',
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const parseCSV = async (file: File, delimiter: string, encoding: string) => {
        return new Promise<{ headers: string[]; firstRow: string[] }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const lines = text.split('\n').filter((line) => line.trim());
                    if (lines.length === 0) {
                        reject(new Error('CSV file is empty'));
                        return;
                    }

                    const delimiterChar = delimiterMap[delimiter] || ',';
                    const firstLine = lines[0].split(delimiterChar).map((cell) => cell.trim().replace(/^"|"$/g, ''));
                    const secondLine = lines.length > 1 ? lines[1].split(delimiterChar).map((cell) => cell.trim().replace(/^"|"$/g, '')) : [];

                    resolve({
                        headers: firstLine,
                        firstRow: secondLine,
                    });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file, encoding as any);
        });
    };

    const handleNext = async () => {
        if (step === 1) {
            if (!file) {
                setError('Please select a CSV file');
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const result = await parseCSV(file, delimiter, encoding);
                setCsvHeaders(result.headers);
                setCsvFirstRow(result.firstRow);
                setStep(2);
            } catch (err: any) {
                setError(err.message || 'Failed to parse CSV file');
            } finally {
                setLoading(false);
            }
        } else if (step === 2) {
            if (duplicateHandling === 'update' && matchingFields.length === 0) {
                setError('Please select at least one matching field');
                return;
            }
            // Auto-match headers with CRM fields when moving to step 3
            const autoMapping: Record<string, string> = { ...fieldMapping };
            csvHeaders.forEach((header) => {
                // Skip if already mapped
                if (autoMapping[header] && autoMapping[header] !== '__skip__') {
                    return;
                }

                // Normalize header for exact matching (trim, lowercase)
                const normalizedHeader = header.trim().toLowerCase();
                
                // Try to find exact match (case-insensitive, trimmed)
                const exactMatch = availableFields.find(
                    (field) => {
                        const fieldLabelNormalized = field.label.trim().toLowerCase();
                        const fieldValueNormalized = field.value.trim().toLowerCase();
                        
                        // Exact match: header matches field label or value exactly
                        return fieldLabelNormalized === normalizedHeader ||
                               fieldValueNormalized === normalizedHeader;
                    }
                );

                if (exactMatch) {
                    autoMapping[header] = exactMatch.value;
                } else {
                    // Try partial match (header contains field label or vice versa)
                    const partialMatch = availableFields.find(
                        (field) => {
                            const fieldLabelLower = field.label.toLowerCase();
                            const fieldValueLower = field.value.toLowerCase();
                            const headerLower = header.toLowerCase();
                            return fieldLabelLower.includes(headerLower) ||
                                   headerLower.includes(fieldLabelLower) ||
                                   fieldValueLower.includes(normalizedHeader) ||
                                   normalizedHeader.includes(fieldValueLower);
                        }
                    );
                    if (partialMatch) {
                        autoMapping[header] = partialMatch.value;
                    }
                }
            });
            setFieldMapping(autoMapping);
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep((step - 1) as Step);
            setError(null);
        }
    };

    const handleSkip = () => {
        if (step === 2) {
            // Skip duplicate handling - set default values
            setDuplicateHandling('skip');
            setMatchingFields([]);
            setStep(3);
        }
    };

    const handleImport = () => {
        if (!file) {
            setError('Please select a CSV file');
            return;
        }

        setLoading(true);
        setError(null);

        // Filter out skip fields from mapping and include headers order
        const cleanFieldMapping: Record<string, string> = {};
        const headersOrder: string[] = [];
        
        csvHeaders.forEach((header) => {
            const field = fieldMapping[header];
            if (field && field !== '__skip__') {
                cleanFieldMapping[header] = field;
                headersOrder.push(header);
            }
        });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('has_header', hasHeader ? '1' : '0');
        formData.append('encoding', encoding);
        formData.append('delimiter', delimiter);
        formData.append('duplicate_handling', duplicateHandling);
        formData.append('matching_fields', JSON.stringify(matchingFields));
        formData.append('field_mapping', JSON.stringify(cleanFieldMapping));
        formData.append('headers_order', JSON.stringify(headersOrder));
        
        // Also include default values
        const defaultValues: Record<string, string> = {};
        Object.keys(fieldMapping).forEach((key) => {
            if (key.endsWith('_default') && fieldMapping[key]) {
                const header = key.replace('_default', '');
                defaultValues[header] = fieldMapping[key];
            }
        });
        formData.append('default_values', JSON.stringify(defaultValues));

        router.post(importStoreUrl, formData, {
            forceFormData: true,
            onSuccess: () => {
                onOpenChange(false);
                setStep(1);
                setFile(null);
                setFieldMapping({});
                setMatchingFields([]);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
            onError: (errors) => {
                setError(Object.values(errors).flat().join(', ') || 'Import failed');
                setLoading(false);
            },
        });
    };

    const handleClose = () => {
        onOpenChange(false);
        setStep(1);
        setFile(null);
        setFieldMapping({});
        setMatchingFields([]);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const toggleMatchingField = (field: string) => {
        setMatchingFields((prev) =>
            prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
        );
    };

    // Auto-match headers with CRM fields when step 3 is loaded or when csvHeaders/availableFields change
    useEffect(() => {
        if (step === 3 && csvHeaders.length > 0 && availableFields.length > 0) {
            const autoMapping: Record<string, string> = { ...fieldMapping };
            let hasNewMatches = false;

            csvHeaders.forEach((header) => {
                // Skip if already mapped
                if (autoMapping[header] && autoMapping[header] !== '__skip__') {
                    return;
                }

                // Normalize header for exact matching (trim, lowercase)
                const normalizedHeader = header.trim().toLowerCase();
                
                // Try to find exact match (case-insensitive, trimmed)
                const exactMatch = availableFields.find(
                    (field) => {
                        const fieldLabelNormalized = field.label.trim().toLowerCase();
                        const fieldValueNormalized = field.value.trim().toLowerCase();
                        
                        // Exact match: header matches field label or value exactly
                        return fieldLabelNormalized === normalizedHeader ||
                               fieldValueNormalized === normalizedHeader;
                    }
                );

                if (exactMatch) {
                    autoMapping[header] = exactMatch.value;
                    hasNewMatches = true;
                } else {
                    // Try partial match (header contains field label or vice versa)
                    const partialMatch = availableFields.find(
                        (field) => {
                            const fieldLabelLower = field.label.toLowerCase();
                            const fieldValueLower = field.value.toLowerCase();
                            const headerLower = header.toLowerCase();
                            return fieldLabelLower.includes(headerLower) ||
                                   headerLower.includes(fieldLabelLower) ||
                                   fieldValueLower.includes(normalizedHeader) ||
                                   normalizedHeader.includes(fieldValueLower);
                        }
                    );
                    if (partialMatch) {
                        autoMapping[header] = partialMatch.value;
                        hasNewMatches = true;
                    }
                }
            });

            if (hasNewMatches) {
                setFieldMapping(autoMapping);
            }
        }
    }, [step, csvHeaders, availableFields]);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="!max-w-[90rem] w-[98vw] max-h-[98vh] overflow-hidden flex flex-col p-0 gap-0 sm:!max-w-[90rem] md:!max-w-[90rem] lg:!max-w-[90rem] xl:!max-w-[90rem] 2xl:!max-w-[90rem]">
                <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b flex-shrink-0">
                    <DialogTitle className="text-lg sm:text-xl font-semibold">Import from CSV file</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Import {entityName} from a CSV file. Follow the steps below to complete the import.
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Steps */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0 bg-muted/30">
                    <div className="flex items-center justify-center gap-1.5 sm:gap-4 flex-wrap">
                        <div className={`flex items-center gap-1 sm:gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                {step > 1 ? '✓' : '1'}
                            </div>
                            <span className="text-xs sm:text-sm font-medium hidden sm:inline">Upload CSV File</span>
                            <span className="text-xs font-medium sm:hidden">Upload</span>
                        </div>
                        <div className={`w-6 sm:w-16 h-0.5 transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                        <div className={`flex items-center gap-1 sm:gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                {step > 2 ? '✓' : '2'}
                            </div>
                            <span className="text-xs sm:text-sm font-medium hidden sm:inline">Duplicate Handling</span>
                            <span className="text-xs font-medium sm:hidden">Duplicates</span>
                        </div>
                        <div className={`w-6 sm:w-16 h-0.5 transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
                        <div className={`flex items-center gap-1 sm:gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                3
                            </div>
                            <span className="text-xs sm:text-sm font-medium hidden sm:inline">Field Mapping</span>
                            <span className="text-xs font-medium sm:hidden">Mapping</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 bg-destructive/10 text-destructive p-2 sm:p-3 rounded-md text-xs sm:text-sm border border-destructive/20 flex-shrink-0">
                        {error}
                    </div>
                )}

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
                {/* Step 1: Upload CSV File */}
                {step === 1 && (
                    <Card className="p-3 sm:p-4 md:p-6">
                        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">1 Upload CSV File</h3>
                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <Label htmlFor="file">Select CSV file</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={handleFileSelect}
                                    ref={fileInputRef}
                                    className="mt-1 border-green-200 dark:border-green-800 focus-visible:border-green-400 dark:focus-visible:border-green-600"
                                />
                                {file && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Selected: {file.name}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="hasHeader"
                                    checked={hasHeader}
                                    onChange={(e) => setHasHeader(e.target.checked)}
                                    className="rounded"
                                />
                                <Label htmlFor="hasHeader" className="cursor-pointer">
                                    Has Header
                                </Label>
                            </div>

                            <div>
                                <Label htmlFor="encoding">Character Encoding</Label>
                                <Select value={encoding} onValueChange={setEncoding}>
                                    <SelectTrigger id="encoding" className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="UTF-8">UTF-8</SelectItem>
                                        <SelectItem value="ISO-8859-1">ISO-8859-1</SelectItem>
                                        <SelectItem value="Windows-1252">Windows-1252</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="delimiter">Delimiter</Label>
                                <Select value={delimiter} onValueChange={setDelimiter}>
                                    <SelectTrigger id="delimiter" className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="comma">Comma</SelectItem>
                                        <SelectItem value="semicolon">Semicolon</SelectItem>
                                        <SelectItem value="pipe">Pipe</SelectItem>
                                        <SelectItem value="caret">Caret</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Step 2: Duplicate Handling */}
                {step === 2 && (
                    <Card className="p-3 sm:p-4 md:p-6">
                        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">2 Duplicate Handling</h3>
                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <Label htmlFor="duplicateHandling">Select how duplicate records should be handled</Label>
                                <Select value={duplicateHandling} onValueChange={setDuplicateHandling}>
                                    <SelectTrigger id="duplicateHandling" className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="skip">Skip duplicate records</SelectItem>
                                        <SelectItem value="update">Update existing records</SelectItem>
                                        <SelectItem value="create">Create new records anyway</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {(duplicateHandling === 'update' || duplicateHandling === 'skip') && (
                                <div className="mt-4">
                                    <Label className="text-sm font-medium mb-3 block">
                                        Select the matching fields to find duplicate records
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-start">
                                        {/* Available Fields */}
                                        <div>
                                            <p className="text-xs sm:text-sm font-medium mb-2 text-muted-foreground">
                                                Available Fields
                                            </p>
                                            <div className="border rounded-md p-2 sm:p-3 space-y-1 max-h-48 sm:max-h-64 overflow-y-auto bg-background">
                                                {availableFields
                                                    .filter((field) => !matchingFields.includes(field.value))
                                                    .map((field) => (
                                                        <button
                                                            key={field.value}
                                                            type="button"
                                                            onClick={() => toggleMatchingField(field.value)}
                                                            className="w-full text-left px-3 py-2 hover:bg-muted rounded text-xs sm:text-sm transition-colors flex items-center justify-between group"
                                                        >
                                                            <span>{field.label}</span>
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </button>
                                                    ))}
                                                {availableFields.filter((field) => !matchingFields.includes(field.value)).length === 0 && (
                                                    <p className="text-xs sm:text-sm text-muted-foreground p-2 text-center">
                                                        All fields selected
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Arrow Icons */}
                                        <div className="flex flex-col items-center justify-center gap-2 pt-8">
                                            <ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
                                            <ChevronLeft className="h-5 w-5 text-muted-foreground hidden sm:block" />
                                            <div className="flex flex-row gap-2 sm:hidden">
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>

                                        {/* Fields to be matched on */}
                                        <div>
                                            <p className="text-xs sm:text-sm font-medium mb-2 text-muted-foreground">
                                                Fields to be matched on
                                            </p>
                                            <div className="border rounded-md p-2 sm:p-3 space-y-1 max-h-48 sm:max-h-64 overflow-y-auto bg-muted/30">
                                                {matchingFields.length === 0 ? (
                                                    <p className="text-xs sm:text-sm text-muted-foreground p-2 text-center">
                                                        No fields selected
                                                    </p>
                                                ) : (
                                                    matchingFields.map((field) => {
                                                        const fieldLabel = availableFields.find((f) => f.value === field)?.label || field;
                                                        return (
                                                            <button
                                                                key={field}
                                                                type="button"
                                                                onClick={() => toggleMatchingField(field)}
                                                                className="w-full text-left px-3 py-2 hover:bg-muted rounded text-xs sm:text-sm transition-colors flex items-center justify-between group bg-background"
                                                            >
                                                                <span>{fieldLabel}</span>
                                                                <ChevronLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Step 3: Field Mapping */}
                {step === 3 && (
                    <Card className="p-3 sm:p-4 md:p-6">
                        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">3 Field Mapping</h3>
                        <div className="space-y-3 sm:space-y-4">
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Map the columns to CRM fields. Headers matching CRM fields are automatically mapped.
                            </p>
                            {csvHeaders.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No CSV headers found. Please go back and upload a CSV file.</p>
                                </div>
                            ) : (
                                <div className="border rounded-md overflow-x-auto">
                                    <table className="w-full min-w-[400px] sm:min-w-[500px] md:min-w-[600px] lg:min-w-[700px]">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium whitespace-nowrap">Header</th>
                                                <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium whitespace-nowrap hidden sm:table-cell">Row 1</th>
                                                <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium whitespace-nowrap">CRM Fields</th>
                                                <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm font-medium whitespace-nowrap hidden md:table-cell">Default Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {csvHeaders.map((header, index) => (
                                            <tr key={index} className="border-t hover:bg-muted/50 transition-colors">
                                                <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap">{header}</td>
                                                <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">
                                                    <span className="truncate block max-w-[150px]" title={csvFirstRow[index] || '-'}>
                                                        {csvFirstRow[index] || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-2 sm:px-4 py-2">
                                                    <Select
                                                        value={fieldMapping[header] ? String(fieldMapping[header]) : undefined}
                                                        onValueChange={(value) => {
                                                            if (value === '__skip__') {
                                                                const newMapping = { ...fieldMapping };
                                                                delete newMapping[header];
                                                                delete newMapping[`${header}_default`];
                                                                setFieldMapping(newMapping);
                                                            } else {
                                                                setFieldMapping((prev) => ({
                                                                    ...prev,
                                                                    [header]: value,
                                                                }));
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full text-xs sm:text-sm">
                                                            <SelectValue placeholder="Select field" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="__skip__">-- Skip --</SelectItem>
                                                            {availableFields.map((field) => (
                                                                <SelectItem key={field.value} value={field.value}>
                                                                    {field.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 hidden md:table-cell">
                                                    {(() => {
                                                        const selectedField = fieldMapping[header];
                                                        const field = availableFields.find((f) => f.value === selectedField);
                                                        const fieldType = field?.type || 'text';
                                                        const defaultValue = fieldMapping[`${header}_default`] || '';

                                                        // Picklist field - show Select dropdown
                                                        if (fieldType === 'picklist' && field?.options && field.options.length > 0) {
                                                            return (
                                                                <Select
                                                                    value={defaultValue ? String(defaultValue) : undefined}
                                                                    onValueChange={(value) => {
                                                                        if (value === '__none__') {
                                                                            setFieldMapping((prev) => {
                                                                                const newMapping = { ...prev };
                                                                                delete newMapping[`${header}_default`];
                                                                                return newMapping;
                                                                            });
                                                                        } else {
                                                                            setFieldMapping((prev) => ({
                                                                                ...prev,
                                                                                [`${header}_default`]: value,
                                                                            }));
                                                                        }
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="w-full text-xs sm:text-sm">
                                                                        <SelectValue placeholder="Select default value" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="__none__">-- None --</SelectItem>
                                                                        {field.options.map((option) => (
                                                                            <SelectItem key={String(option.value)} value={String(option.value)}>
                                                                                {option.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            );
                                                        }

                                                        // Date field - show date picker
                                                        if (fieldType === 'date') {
                                                            return (
                                                                <Input
                                                                    type="date"
                                                                    placeholder="Select date"
                                                                    className="w-full text-xs sm:text-sm"
                                                                    value={defaultValue}
                                                                    onChange={(e) => {
                                                                        setFieldMapping((prev) => ({
                                                                            ...prev,
                                                                            [`${header}_default`]: e.target.value,
                                                                        }));
                                                                    }}
                                                                />
                                                            );
                                                        }

                                                        // Email field - show email input
                                                        if (fieldType === 'email') {
                                                            return (
                                                                <Input
                                                                    type="email"
                                                                    placeholder="email@example.com"
                                                                    className="w-full text-xs sm:text-sm"
                                                                    value={defaultValue}
                                                                    onChange={(e) => {
                                                                        setFieldMapping((prev) => ({
                                                                            ...prev,
                                                                            [`${header}_default`]: e.target.value,
                                                                        }));
                                                                    }}
                                                                />
                                                            );
                                                        }

                                                        // Phone field - show tel input
                                                        if (fieldType === 'phone') {
                                                            return (
                                                                <Input
                                                                    type="tel"
                                                                    placeholder="Phone number"
                                                                    className="w-full text-xs sm:text-sm"
                                                                    value={defaultValue}
                                                                    onChange={(e) => {
                                                                        setFieldMapping((prev) => ({
                                                                            ...prev,
                                                                            [`${header}_default`]: e.target.value,
                                                                        }));
                                                                    }}
                                                                />
                                                            );
                                                        }

                                                        // Textarea field - show textarea
                                                        if (fieldType === 'textarea') {
                                                            return (
                                                                <textarea
                                                                    placeholder="Default value"
                                                                    className="w-full min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-xs sm:text-sm resize-y"
                                                                    value={defaultValue}
                                                                    onChange={(e) => {
                                                                        setFieldMapping((prev) => ({
                                                                            ...prev,
                                                                            [`${header}_default`]: e.target.value,
                                                                        }));
                                                                    }}
                                                                />
                                                            );
                                                        }

                                                        // Default - text input
                                                        return (
                                                            <Input
                                                                type="text"
                                                                placeholder="Default value"
                                                                className="w-full text-xs sm:text-sm"
                                                                value={defaultValue}
                                                                onChange={(e) => {
                                                                    setFieldMapping((prev) => ({
                                                                        ...prev,
                                                                        [`${header}_default`]: e.target.value,
                                                                    }));
                                                                }}
                                                            />
                                                        );
                                                    })()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            )}
                        </div>
                    </Card>
                )}
                </div>

                <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t flex-shrink-0 bg-muted/30">
                    <div className="flex justify-between w-full flex-col sm:flex-row gap-2 sm:gap-3">
                        <div className="flex justify-start">
                            {step > 1 && (
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={handleBack} 
                                    disabled={loading}
                                    className="w-full sm:w-auto"
                                >
                                    Back
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2 flex-col sm:flex-row">
                            {step < 3 && (
                                <>
                                    {step === 2 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleSkip}
                                            disabled={loading}
                                            className="w-full sm:w-auto order-2 sm:order-1"
                                        >
                                            Skip this step
                                        </Button>
                                    )}
                                    <Button 
                                        type="button" 
                                        onClick={handleNext} 
                                        disabled={loading || (step === 1 && !file)}
                                        className="w-full sm:w-auto order-1 sm:order-2"
                                    >
                                        {loading ? 'Processing...' : 'Next'}
                                    </Button>
                                </>
                            )}
                            {step === 3 && (
                                <Button 
                                    type="button" 
                                    onClick={handleImport} 
                                    disabled={loading}
                                    className="w-full sm:w-auto"
                                >
                                    {loading ? 'Importing...' : 'Import Leads'}
                                </Button>
                            )}
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handleClose} 
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

