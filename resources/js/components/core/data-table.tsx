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
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <table className="w-full">
                <thead>
                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-b-2 border-blue-200 dark:border-blue-800/50">
                        {columns.map((column, index) => (
                            <th
                                key={index}
                                className="px-4 py-4 text-left text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide"
                            >
                                {column.header}
                            </th>
                        ))}
                        {actions && (
                            <th className="px-4 py-4 text-right text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                                Actions
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                    {data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length + (actions ? 1 : 0)}
                                className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-950"
                            >
                                No data available
                            </td>
                        </tr>
                    ) : (
                        data.map((row, index) => (
                            <tr
                                key={row.id}
                                className={`
                                    transition-all duration-200 ease-in-out
                                    ${
                                        index % 2 === 0
                                            ? 'bg-white dark:bg-neutral-950 hover:bg-blue-50/30 dark:hover:bg-blue-950/20'
                                            : 'bg-neutral-50/60 dark:bg-neutral-900/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/30'
                                    }
                                `}
                            >
                                {columns.map((column, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className={`px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 ${column.className || ''}`}
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

