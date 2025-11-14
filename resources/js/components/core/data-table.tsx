import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import React from 'react';

interface Column<T> {
    header: string;
    accessor: keyof T | ((row: T) => React.ReactNode);
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    actions?: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: number | string }>({
    data,
    columns,
    actions,
}: DataTableProps<T>) {
    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                        {columns.map((column, index) => (
                            <th
                                key={index}
                                className="px-4 py-3 text-left text-sm font-medium text-neutral-700 dark:text-neutral-300"
                            >
                                {column.header}
                            </th>
                        ))}
                        {actions && (
                            <th className="px-4 py-3 text-right text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                Actions
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length + (actions ? 1 : 0)}
                                className="px-4 py-8 text-center text-sm text-neutral-500"
                            >
                                No data available
                            </td>
                        </tr>
                    ) : (
                        data.map((row) => (
                            <tr
                                key={row.id}
                                className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                            >
                                {columns.map((column, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className={`px-4 py-3 text-sm ${column.className || ''}`}
                                    >
                                        {typeof column.accessor === 'function'
                                            ? column.accessor(row)
                                            : String(row[column.accessor] ?? '')}
                                    </td>
                                ))}
                                {actions && (
                                    <td className="px-4 py-3 text-right text-sm">
                                        <div className="flex justify-end gap-2">
                                            {actions(row)}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

