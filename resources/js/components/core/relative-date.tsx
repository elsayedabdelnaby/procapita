import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow, format } from 'date-fns';

interface RelativeDateProps {
    date: string | Date;
    className?: string;
    showIcon?: boolean;
}

export function RelativeDate({ date, className = '', showIcon = false }: RelativeDateProps) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const relativeDate = formatDistanceToNow(dateObj, { addSuffix: true });
    const fullDate = format(dateObj, 'PPpp'); // Full date with time: "Nov 28, 2025 at 6:25 PM"

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className={`cursor-help ${className}`}>
                    {relativeDate}
                </span>
            </TooltipTrigger>
            <TooltipContent>
                <p>{fullDate}</p>
            </TooltipContent>
        </Tooltip>
    );
}

