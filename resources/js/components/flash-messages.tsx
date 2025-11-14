import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function FlashMessages() {
    const { flash } = usePage<SharedData>().props;
    const [visible, setVisible] = useState({ success: true, error: true, info: true });

    useEffect(() => {
        setVisible({ success: true, error: true, info: true });

        // Auto-dismiss success and info messages after 5 seconds
        const timer = setTimeout(() => {
            setVisible((prev) => ({ ...prev, success: false, info: false }));
        }, 5000);

        return () => clearTimeout(timer);
    }, [flash]);

    if (!flash.success && !flash.error && !flash.info) {
        return null;
    }

    return (
        <div className="fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
            {flash.success && visible.success && (
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 shadow-lg dark:border-green-800 dark:bg-green-900/20">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                    <p className="flex-1 break-words text-sm text-green-900 dark:text-green-100">
                        {flash.success}
                    </p>
                    <button
                        onClick={() => setVisible((prev) => ({ ...prev, success: false }))}
                        className="flex-shrink-0 rounded p-1 hover:bg-green-100 dark:hover:bg-green-800"
                    >
                        <X className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </button>
                </div>
            )}

            {flash.error && visible.error && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 shadow-lg dark:border-red-800 dark:bg-red-900/20">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                    <p className="flex-1 break-words text-sm text-red-900 dark:text-red-100">
                        {flash.error}
                    </p>
                    <button
                        onClick={() => setVisible((prev) => ({ ...prev, error: false }))}
                        className="flex-shrink-0 rounded p-1 hover:bg-red-100 dark:hover:bg-red-800"
                    >
                        <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </button>
                </div>
            )}

            {flash.info && visible.info && (
                <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-lg dark:border-blue-800 dark:bg-blue-900/20">
                    <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                    <p className="flex-1 break-words text-sm text-blue-900 dark:text-blue-100">
                        {flash.info}
                    </p>
                    <button
                        onClick={() => setVisible((prev) => ({ ...prev, info: false }))}
                        className="flex-shrink-0 rounded p-1 hover:bg-blue-100 dark:hover:bg-blue-800"
                    >
                        <X className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </button>
                </div>
            )}
        </div>
    );
}

