import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow, format } from 'date-fns';
import { Clock, User } from 'lucide-react';
import { RelativeDate } from './relative-date';

interface ActivityLogEntry {
    id: number;
    description: string;
    event?: string;
    properties?: {
        old?: Record<string, any>;
        attributes?: Record<string, any>;
    };
    causer?: {
        id: number;
        name: string;
        email?: string;
    } | null;
    created_at: string;
}

interface ActivityLogProps {
    activities: ActivityLogEntry[];
}

export function ActivityLog({ activities }: ActivityLogProps) {
    if (!activities || activities.length === 0) {
        return (
            <Card className="p-6">
                <div className="text-center text-muted-foreground">
                    <p>No activity logs found.</p>
                </div>
            </Card>
        );
    }

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) {
            return '<em>empty</em>';
        }
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    };

    const getFieldLabel = (field: string): string => {
        // Convert snake_case to Title Case
        return field
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="space-y-4">
            {activities.map((activity) => {
                const changes = activity.properties?.old && activity.properties?.attributes
                    ? Object.keys(activity.properties.attributes)
                          .filter((key) => {
                              const oldValue = activity.properties?.old[key];
                              const newValue = activity.properties?.attributes[key];
                              return oldValue !== newValue;
                          })
                          .map((key) => ({
                              field: key,
                              oldValue: activity.properties?.old[key],
                              newValue: activity.properties?.attributes[key],
                          }))
                    : [];

                return (
                    <Card key={activity.id} className="p-4">
                        <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="font-medium text-sm">
                                        {activity.description}
                                    </p>
                                    {activity.event && (
                                        <Badge variant="outline" className="mt-1 text-xs">
                                            {activity.event}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    {activity.causer && (
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span>{activity.causer.name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <RelativeDate date={activity.created_at} />
                                    </div>
                                </div>
                            </div>

                            {/* Changes */}
                            {changes.length > 0 && (
                                <div className="mt-3 space-y-2 border-t pt-3">
                                    {changes.map((change, index) => (
                                        <div
                                            key={index}
                                            className="grid grid-cols-1 gap-2 rounded-md bg-muted/50 p-2 text-sm md:grid-cols-3"
                                        >
                                            <div className="font-medium">
                                                {getFieldLabel(change.field)}
                                            </div>
                                            <div className="text-muted-foreground">
                                                <span className="font-medium">From:</span>{' '}
                                                <span
                                                    className="rounded bg-red-100 px-1.5 py-0.5 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                                                    dangerouslySetInnerHTML={{
                                                        __html: formatValue(change.oldValue),
                                                    }}
                                                />
                                            </div>
                                            <div className="text-muted-foreground">
                                                <span className="font-medium">To:</span>{' '}
                                                <span
                                                    className="rounded bg-green-100 px-1.5 py-0.5 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                                    dangerouslySetInnerHTML={{
                                                        __html: formatValue(change.newValue),
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}

