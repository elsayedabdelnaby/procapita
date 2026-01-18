import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface AvailableField {
    value: string;
    label: string;
    type: string;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface DriverList {
    id?: number;
    name: string;
    columns?: string[];
    all_conditions?: any[];
    any_conditions?: any[];
    shared_with_users?: number[];
    is_shared?: boolean;
    is_default?: boolean;
    show_in_metrics?: boolean;
    default_sort_column?: string;
    default_sort_order?: string;
}

interface DriversListsEditProps {
    list: DriverList | null;
    availableFields: AvailableField[];
    users: User[];
    isEdit: boolean;
}

export default function DriversListsEdit({
    list,
    availableFields,
    users,
    isEdit,
}: DriversListsEditProps) {
    const getOperatorsForField = (fieldType: string) => {
        switch (fieldType) {
            case 'checkbox':
                return [
                    { value: 'is_enabled', label: 'Enabled' },
                    { value: 'is_disabled', label: 'Disabled' },
                ];
            case 'date':
            case 'datetime':
                return [
                    { value: 'equals', label: 'Equals' },
                    { value: 'not_equal_to', label: 'Not equal to' },
                    { value: 'between', label: 'Between' },
                    { value: 'before', label: 'Before' },
                    { value: 'after', label: 'After' },
                    { value: 'is_empty', label: 'Is empty' },
                    { value: 'is_not_empty', label: 'Is not empty' },
                    { value: 'less_than_days_ago', label: 'Less than days ago' },
                    { value: 'previous_week', label: 'Previous Week' },
                    { value: 'current_week', label: 'Current Week' },
                    { value: 'next_week', label: 'Next Week' },
                    { value: 'previous_month', label: 'Previous Month' },
                    { value: 'current_month', label: 'Current Month' },
                    { value: 'next_month', label: 'Next Month' },
                    { value: 'last_7_days', label: 'Last 7 Days' },
                    { value: 'last_14_days', label: 'Last 14 Days' },
                    { value: 'last_30_days', label: 'Last 30 Days' },
                    { value: 'last_60_days', label: 'Last 60 Days' },
                    { value: 'last_90_days', label: 'Last 90 Days' },
                    { value: 'last_120_days', label: 'Last 120 Days' },
                    { value: 'next_30_days', label: 'Next 30 Days' },
                    { value: 'next_60_days', label: 'Next 60 Days' },
                    { value: 'current_fy', label: 'Current FY' },
                    { value: 'next_fy', label: 'Next FY' },
                    { value: 'previous_fq', label: 'Previous FQ' },
                    { value: 'current_fq', label: 'Current FQ' },
                    { value: 'next_fq', label: 'Next FQ' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'today', label: 'Today' },
                    { value: 'tomorrow', label: 'Tomorrow' },
                    { value: 'more_than_days_ago', label: 'More than days ago' },
                    { value: 'in_less_than', label: 'In less than' },
                    { value: 'in_more_than', label: 'In more than' },
                    { value: 'days_ago', label: 'Days ago' },
                    { value: 'days_later', label: 'Days Later' },
                    { value: 'previous_fy', label: 'Previous FY' },
                ];
            case 'text':
            case 'email':
            case 'picklist':
                return [
                    { value: 'equals', label: 'Equals' },
                    { value: 'not_equal_to', label: 'Not equal to' },
                    { value: 'starts_with', label: 'Starts with' },
                    { value: 'ends_with', label: 'Ends with' },
                    { value: 'contains', label: 'Contains' },
                    { value: 'does_not_contain', label: 'Does not contain' },
                    { value: 'is_empty', label: 'Is empty' },
                    { value: 'is_not_empty', label: 'Is not empty' },
                ];
            case 'number':
            case 'integer':
                return [
                    { value: 'equals', label: 'Equals' },
                    { value: 'not_equal_to', label: 'Not equal to' },
                    { value: 'less_than', label: 'Less than' },
                    { value: 'greater_than', label: 'Greater than' },
                    { value: 'less_or_equal', label: 'Less or equal' },
                    { value: 'greater_or_equal', label: 'Greater or equal' },
                    { value: 'is_empty', label: 'Is empty' },
                    { value: 'is_not_empty', label: 'Is not empty' },
                ];
            case 'time':
                return [
                    { value: 'equals', label: 'Equals' },
                    { value: 'not_equal_to', label: 'Not equal to' },
                    { value: 'less_or_equal', label: 'Less or equal' },
                    { value: 'greater_or_equal', label: 'Greater or equal' },
                    { value: 'less_than', label: 'Less than' },
                    { value: 'greater_than', label: 'Greater than' },
                    { value: 'between', label: 'Between' },
                    { value: 'before', label: 'Before' },
                    { value: 'after', label: 'After' },
                    { value: 'is_empty', label: 'Is empty' },
                    { value: 'is_not_empty', label: 'Is not empty' },
                ];
            default:
                return [
                    { value: 'equals', label: 'Equals' },
                    { value: 'not_equal_to', label: 'Not equal to' },
                ];
        }
    };

    // Normalize conditions to ensure operator values are strings and valid
    const normalizeConditions = (conditions: any[]) => {
        if (!Array.isArray(conditions)) return [];
        return conditions.map(condition => {
            // Ensure operator is a string
            let operator = condition.operator ? String(condition.operator).trim() : '';
            
            // If field exists and operator exists, validate operator against available operators
            if (condition.field && operator) {
                const fieldType = availableFields.find(f => f.value === condition.field)?.type || 'text';
                const operators = getOperatorsForField(fieldType);
                const isValidOperator = operators.some(op => {
                    const opValue = String(op.value).trim();
                    const condOpValue = String(operator).trim();
                    return opValue === condOpValue;
                });
                
                // Only log warning but don't clear operator - preserve what was saved
                // The UI will handle invalid operators by showing "Select Operator"
                if (!isValidOperator) {
                    console.warn('Invalid operator found during normalization (preserving for debugging):', {
                        field: condition.field,
                        operator,
                        fieldType,
                        availableOperators: operators.map(op => op.value),
                        condition
                    });
                    // Don't clear operator - let it be preserved so we can debug
                    // The UI will show "Select Operator" if it's invalid
                }
            }
            
            return {
                field: condition.field || '',
                operator: operator, // Preserve operator even if invalid - UI will handle it
                value: condition.value !== undefined && condition.value !== null ? condition.value : '',
            };
        });
    };

    // Clean conditions before submitting - remove empty or invalid conditions
    const cleanConditions = (conditions: any[]) => {
        if (!Array.isArray(conditions)) return [];
        
        return conditions
            .filter(condition => {
                // Keep only conditions that have both field and operator
                const hasField = condition.field && String(condition.field).trim() !== '';
                const hasOperator = condition.operator && String(condition.operator).trim() !== '';
                return hasField && hasOperator;
            })
            .map(condition => ({
                field: String(condition.field).trim(),
                operator: String(condition.operator).trim(),
                value: condition.value !== undefined && condition.value !== null ? condition.value : '',
            }));
    };

    // Use useState for conditions to ensure proper reactivity
    const [allConditions, setAllConditions] = useState<any[]>(list?.all_conditions ? normalizeConditions(list.all_conditions) : []);
    const [anyConditions, setAnyConditions] = useState<any[]>(list?.any_conditions ? normalizeConditions(list.any_conditions) : []);
    const [selectedUserForShare, setSelectedUserForShare] = useState<string>('');

    const { data, setData, post, put, processing, errors, transform } = useForm({
        name: list?.name || '',
        columns: [],
        all_conditions: allConditions,
        any_conditions: anyConditions,
        shared_with_users: list?.shared_with_users || [],
        is_shared: list?.is_shared || false,
        is_default: list?.is_default || false,
        show_in_metrics: list?.show_in_metrics || false,
        default_sort_column: '',
        default_sort_order: 'asc',
    });

    // Sync form data with state when conditions change
    useEffect(() => {
        setData('all_conditions', allConditions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allConditions]);

    useEffect(() => {
        setData('any_conditions', anyConditions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anyConditions]);

    // Transform data before submitting to clean conditions
    transform((data) => ({
        ...data,
        all_conditions: cleanConditions(allConditions || []),
        any_conditions: cleanConditions(anyConditions || []),
    }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Debug: Log data before submitting
        console.log('Submitting list data:', {
            is_shared: data.is_shared,
            shared_with_users: data.shared_with_users,
            full_data: data,
        });

        if (isEdit && list?.id) {
            put(`/drivers/drivers/lists/${list.id}`, {
                onSuccess: () => {
                    router.visit('/drivers/drivers');
                },
                onError: (errors) => {
                    console.error('Error updating list:', errors);
                    if (errors && typeof errors === 'object') {
                        const errorMessages = Object.values(errors).flat();
                        alert('Error saving list: ' + errorMessages.join(', '));
                    } else {
                        alert('Error saving list. Please try again.');
                    }
                },
            });
        } else {
            post('/drivers/drivers/lists', {
                onSuccess: () => {
                    router.visit('/drivers/drivers');
                },
                onError: (errors) => {
                    console.error('Error creating list:', errors);
                    if (errors && typeof errors === 'object') {
                        const errorMessages = Object.values(errors).flat();
                        alert('Error saving list: ' + errorMessages.join(', '));
                    } else {
                        alert('Error saving list. Please try again.');
                    }
                },
            });
        }
    };

    const addCondition = (type: 'all' | 'any') => {
        const newCondition = {
            field: '',
            operator: '',
            value: '',
        };
        
        if (type === 'all') {
            setAllConditions([...allConditions, newCondition]);
        } else {
            setAnyConditions([...anyConditions, newCondition]);
        }
    };

    const removeCondition = (type: 'all' | 'any', index: number) => {
        if (type === 'all') {
            setAllConditions(allConditions.filter((_, i) => i !== index));
        } else {
            setAnyConditions(anyConditions.filter((_, i) => i !== index));
        }
    };

    const updateCondition = (type: 'all' | 'any', index: number, field: string, value: any) => {
        // Use functional update to ensure we get the latest state
        if (type === 'all') {
            setAllConditions(prevConditions => {
                const currentConditions = [...prevConditions];
                
                // Ensure the condition at index exists
                if (!currentConditions[index]) {
                    currentConditions[index] = { field: '', operator: '', value: '' };
                }
                
                // Update the specific field in the condition - create a new object to ensure reactivity
                currentConditions[index] = { ...currentConditions[index], [field]: value };
                
                return currentConditions;
            });
        } else {
            setAnyConditions(prevConditions => {
                const currentConditions = [...prevConditions];
                
                // Ensure the condition at index exists
                if (!currentConditions[index]) {
                    currentConditions[index] = { field: '', operator: '', value: '' };
                }
                
                // Update the specific field in the condition - create a new object to ensure reactivity
                currentConditions[index] = { ...currentConditions[index], [field]: value };
                
                return currentConditions;
            });
        }
    };

    const getFieldType = (fieldValue: string) => {
        const field = availableFields.find((f) => f.value === fieldValue);
        return field?.type || 'text';
    };

    const shouldShowValueField = (operator: string | undefined, fieldType: string) => {
        // If operator is empty or not set, don't show value field
        if (!operator || operator === '' || operator === null || operator === undefined) {
            return false;
        }

        // Convert operator to string to ensure comparison works
        const operatorStr = String(operator).trim();

        // For checkbox fields, don't show value field (operator itself determines the value)
        if (fieldType === 'checkbox') {
            return false;
        }

        // For non-date fields (including number, integer, text, email, picklist), hide value only for is_empty and is_not_empty
        if (fieldType !== 'date' && fieldType !== 'datetime') {
            const hideForNonDate = ['is_empty', 'is_not_empty'];
            return !hideForNonDate.includes(operatorStr);
        }

        // For date/datetime fields, hide value for these operators (they don't need a value)
        const hideValueOperators = [
            'is_empty', 
            'is_not_empty', 
            'previous_week', 
            'current_week', 
            'next_week',
            'previous_month', 
            'current_month', 
            'next_month', 
            'last_7_days', 
            'last_14_days',
            'last_30_days', 
            'last_60_days', 
            'last_90_days', 
            'last_120_days', 
            'next_30_days',
            'next_60_days', 
            'current_fy', 
            'next_fy', 
            'previous_fq', 
            'current_fq', 
            'next_fq',
            'yesterday', 
            'today', 
            'tomorrow', 
            'previous_fy'
        ];
        
        // Return false if operator is in hide list (hide the field), true otherwise (show the field)
        return !hideValueOperators.includes(operatorStr);
    };

    const getValueFieldType = (operator: string, fieldType: string) => {
        // For checkbox fields, use checkbox input
        if (fieldType === 'checkbox') {
            return 'checkbox';
        }

        // For number/integer fields, use number input
        if (fieldType === 'number' || fieldType === 'integer') {
            return 'number';
        }

        // For date/datetime fields
        if (fieldType === 'date' || fieldType === 'datetime') {
            // Number input for these operators
            const numberOperators = [
                'less_than_days_ago', 'more_than_days_ago', 'in_less_than',
                'in_more_than', 'days_ago', 'days_later'
            ];

            if (numberOperators.includes(operator)) {
                return 'number';
            }

            // Date input for these operators
            const dateOperators = ['equals', 'not_equal_to', 'before', 'after'];
            if (dateOperators.includes(operator)) {
                return 'date';
            }

            // Between needs two date inputs
            if (operator === 'between') {
                return 'between';
            }
        }

        // Default to text for other field types
        return 'text';
    };

    return (
        <AppLayout>
            <Head title={isEdit ? 'Edit List' : 'Create List'} />

            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">{isEdit ? 'Edit List' : 'Create List'}</h1>
                </div>

                <form onSubmit={handleSubmit}>
                    <Card className="p-6 space-y-6">
                        {/* List Name */}
                        <div>
                            <Label htmlFor="name">
                                List Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="mt-1"
                                required
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                            )}
                        </div>

                        {/* Choose List conditions */}
                        <div className="border rounded-lg p-4 space-y-4">
                            <h3 className="font-medium">Choose List conditions :</h3>

                            {/* All Conditions */}
                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm font-medium">All Conditions (AND - All conditions must be met)</p>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        All conditions must be met together (logical AND). Example: Status = "Closed" AND Source = "Website" AND Value &gt; 1000
                                    </p>
                                </div>
                                {allConditions.map((condition, index) => {
                                    const fieldType = getFieldType(condition.field);
                                    const operators = getOperatorsForField(fieldType);
                                    
                                    // Use condition.operator directly - it's already saved in the form data
                                    const operatorValue = condition.operator ? String(condition.operator).trim() : '';
                                    
                                    
                                    return (
                                        <div key={`all-condition-${index}-${condition.field}-${condition.operator}`} className="flex gap-2 items-end">
                                            <Select
                                                value={condition.field || undefined}
                                                onValueChange={(value) => {
                                                    const newFieldType = getFieldType(value);
                                                    const newOperators = getOperatorsForField(newFieldType);
                                                    const currentOperator = condition.operator;
                                                    
                                                    // If current operator is not valid for new field type, clear it
                                                    const isValidOperator = newOperators.some(op => String(op.value) === String(currentOperator));
                                                    if (currentOperator && !isValidOperator) {
                                                        updateCondition('all', index, 'operator', '');
                                                        updateCondition('all', index, 'value', '');
                                                    }
                                                    
                                                    updateCondition('all', index, 'field', value);
                                                }}
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Select Field" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableFields.filter((field) => field.value && field.value !== '').map((field) => (
                                                        <SelectItem key={field.value} value={field.value}>
                                                            {field.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {condition.field && (
                                                <>
                                                    <Select
                                                        key={`all-operator-${index}-${condition.field}`}
                                                        value={operatorValue || undefined}
                                                        onValueChange={(value) => {
                                                            console.log('onValueChange - operator selected:', {
                                                                value,
                                                                valueType: typeof value,
                                                                index,
                                                                field: condition.field,
                                                                currentOperator: condition.operator,
                                                                currentCondition: condition,
                                                                allConditions: data.all_conditions
                                                            });
                                                            
                                                            // Update the condition immediately
                                                            updateCondition('all', index, 'operator', value);
                                                            
                                                            // Clear value when operator changes to one that doesn't need it
                                                            const currentFieldType = getFieldType(condition.field || '');
                                                            if (!shouldShowValueField(value, currentFieldType)) {
                                                                updateCondition('all', index, 'value', '');
                                                            }
                                                            
                                                        }}
                                                    >
                                                        <SelectTrigger className="flex-1">
                                                            <SelectValue placeholder="Select Operator" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {operators.map(
                                                                (op) => (
                                                                    <SelectItem key={op.value} value={String(op.value)}>
                                                                        {op.label}
                                                                    </SelectItem>
                                                                )
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                {condition.operator && condition.field && shouldShowValueField(condition.operator, getFieldType(condition.field)) && (
                                                    getValueFieldType(condition.operator, getFieldType(condition.field)) === 'between' ? (
                                                        <div className="flex gap-2 flex-1">
                                                            <Input
                                                                type="date"
                                                                value={Array.isArray(condition.value) ? condition.value[0] || '' : ''}
                                                                onChange={(e) => {
                                                                    const currentValue = Array.isArray(condition.value) ? condition.value : ['', ''];
                                                                    updateCondition('all', index, 'value', [e.target.value, currentValue[1] || '']);
                                                                }}
                                                                placeholder="Start Date"
                                                                className="flex-1"
                                                            />
                                                            <Input
                                                                type="date"
                                                                value={Array.isArray(condition.value) ? condition.value[1] || '' : ''}
                                                                onChange={(e) => {
                                                                    const currentValue = Array.isArray(condition.value) ? condition.value : ['', ''];
                                                                    updateCondition('all', index, 'value', [currentValue[0] || '', e.target.value]);
                                                                }}
                                                                placeholder="End Date"
                                                                className="flex-1"
                                                            />
                                                        </div>
                                                    ) : (
                                                <Input
                                                            type={getValueFieldType(condition.operator, getFieldType(condition.field))}
                                                    value={condition.value || ''}
                                                    onChange={(e) =>
                                                        updateCondition('all', index, 'value', e.target.value)
                                                    }
                                                            placeholder={getValueFieldType(condition.operator, getFieldType(condition.field)) === 'number' ? (getFieldType(condition.field) === 'number' || getFieldType(condition.field) === 'integer' ? 'Enter number' : 'Number of days') : 'Value'}
                                                    className="flex-1"
                                                />
                                                    )
                                                )}
                                            </>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeCondition('all', index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    );
                                })}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addCondition('all')}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Condition
                                </Button>
                            </div>

                            {/* Any Conditions */}
                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm font-medium">Any Conditions (OR - At least one condition must be met)</p>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        It is sufficient that any condition is met (logical OR). Example: Status = "New" OR Source = "Referral" OR Value &gt; 5000
                                    </p>
                                </div>
                                {anyConditions.map((condition, index) => {
                                    const fieldType = getFieldType(condition.field || '');
                                    const operators = getOperatorsForField(fieldType);
                                    
                                    // Use condition.operator directly - it's already saved in the form data
                                    const operatorValue = condition.operator ? String(condition.operator).trim() : '';
                                    
                                    
                                    return (
                                        <div key={`any-condition-${index}-${condition.field}-${condition.operator}`} className="flex gap-2 items-end">
                                            <Select
                                                value={condition.field || undefined}
                                                onValueChange={(value) => {
                                                    const newFieldType = getFieldType(value);
                                                    const newOperators = getOperatorsForField(newFieldType);
                                                    const currentOperator = condition.operator;
                                                    
                                                    // If current operator is not valid for new field type, clear it
                                                    const isValidOperator = newOperators.some(op => String(op.value) === String(currentOperator));
                                                    if (currentOperator && !isValidOperator) {
                                                        updateCondition('any', index, 'operator', '');
                                                        updateCondition('any', index, 'value', '');
                                                    }
                                                    
                                                    updateCondition('any', index, 'field', value);
                                                }}
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Select Field" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableFields.filter((field) => field.value && field.value !== '').map((field) => (
                                                        <SelectItem key={field.value} value={field.value}>
                                                            {field.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {condition.field && (
                                                <>
                                                    <Select
                                                        key={`any-operator-${index}-${condition.field}`}
                                                        value={operatorValue || undefined}
                                                        onValueChange={(value) => {
                                                            updateCondition('any', index, 'operator', value);
                                                            // Clear value when operator changes to one that doesn't need it
                                                            const currentFieldType = getFieldType(condition.field || '');
                                                            if (!shouldShowValueField(value, currentFieldType)) {
                                                                updateCondition('any', index, 'value', '');
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="flex-1">
                                                            <SelectValue placeholder="Select Operator" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {operators.map(
                                                                (op) => (
                                                                    <SelectItem key={op.value} value={String(op.value)}>
                                                                        {op.label}
                                                                    </SelectItem>
                                                                )
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                {condition.operator && condition.field && shouldShowValueField(condition.operator, getFieldType(condition.field)) && (
                                                    getValueFieldType(condition.operator, getFieldType(condition.field)) === 'between' ? (
                                                        <div className="flex gap-2 flex-1">
                                                            <Input
                                                                type="date"
                                                                value={Array.isArray(condition.value) ? condition.value[0] || '' : ''}
                                                                onChange={(e) => {
                                                                    const currentValue = Array.isArray(condition.value) ? condition.value : ['', ''];
                                                                    updateCondition('any', index, 'value', [e.target.value, currentValue[1] || '']);
                                                                }}
                                                                placeholder="Start Date"
                                                                className="flex-1"
                                                            />
                                                            <Input
                                                                type="date"
                                                                value={Array.isArray(condition.value) ? condition.value[1] || '' : ''}
                                                                onChange={(e) => {
                                                                    const currentValue = Array.isArray(condition.value) ? condition.value : ['', ''];
                                                                    updateCondition('any', index, 'value', [currentValue[0] || '', e.target.value]);
                                                                }}
                                                                placeholder="End Date"
                                                                className="flex-1"
                                                            />
                                                        </div>
                                                    ) : (
                                                <Input
                                                            type={getValueFieldType(condition.operator, getFieldType(condition.field))}
                                                    value={condition.value || ''}
                                                    onChange={(e) =>
                                                        updateCondition('any', index, 'value', e.target.value)
                                                    }
                                                            placeholder={getValueFieldType(condition.operator, getFieldType(condition.field)) === 'number' ? (getFieldType(condition.field) === 'number' || getFieldType(condition.field) === 'integer' ? 'Enter number' : 'Number of days') : 'Value'}
                                                    className="flex-1"
                                                />
                                                    )
                                                )}
                                            </>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeCondition('any', index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    );
                                })}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addCondition('any')}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Condition
                                </Button>
                            </div>
                        </div>

                        {/* Share the list */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="is_shared"
                                    checked={data.is_shared}
                                    onCheckedChange={(checked) => setData('is_shared', checked as boolean)}
                                />
                                <Label htmlFor="is_shared">Share the list</Label>
                            </div>
                            {data.is_shared && (
                                <div className="ml-6 space-y-2">
                                    <Label>Select users to share with:</Label>
                                    <Select
                                        value={selectedUserForShare}
                                        onValueChange={(value) => {
                                            if (value && !data.shared_with_users.includes(Number(value))) {
                                                setData('shared_with_users', [
                                                    ...data.shared_with_users,
                                                    Number(value),
                                                ]);
                                                // Reset select to empty after selection
                                                setSelectedUserForShare('');
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select user..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users
                                                .filter((user) => !data.shared_with_users.includes(user.id))
                                                .map((user) => (
                                                    <SelectItem key={user.id} value={String(user.id)}>
                                                        {user.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {data.shared_with_users.map((userId) => {
                                            const user = users.find((u) => u.id === userId);
                                            return (
                                                <div
                                                    key={userId}
                                                    className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full"
                                                >
                                                    <X
                                                        className="h-4 w-4 cursor-pointer"
                                                        onClick={() =>
                                                            setData(
                                                                'shared_with_users',
                                                                data.shared_with_users.filter((id) => id !== userId)
                                                            )
                                                        }
                                                    />
                                                    <span className="text-sm">{user?.name || 'Unknown'}</span>
                                                </div>
                                            );
                                        })}
                                        {data.shared_with_users.length === 0 && (
                                            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
                                                <span className="text-sm">All Users</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Form Actions */}
                        <div className="flex gap-2 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.visit('/drivers/drivers')}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}

