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
        if (value === null || value === undefined || value === '') {
            return 'empty';
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
        const fieldLabels: Record<string, string> = {
            'full_name': 'Full Name',
            'phone': 'Phone',
            'whatsapp_phone': 'WhatsApp Phone',
            'email': 'Email',
            'riding_company_id': 'Reseller',
            'campaign_id': 'Campaign',
            'lead_source_id': 'Lead Source',
            'assigned_to': 'Assigned To',
            'assigned_users': 'Assigned Users',
            'lead_status_id': 'Lead Status',
            'lead_status_comment': 'Lead Status Comment',
            'next_follow_up': 'Next Follow-up',
            'last_follow_up': 'Last Follow-up',
            'lead_stage_id': 'Lead Stage',
            'notes': 'Notes',
        };
        return fieldLabels[field] || field
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

                // Format date and time for tooltip
                const fullDateTime = new Date(activity.created_at);
                const dateTimeString = `${fullDateTime.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })} at ${fullDateTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                })}`;

                return (
                    <div key={activity.id} className="border-l-2 border-blue-500 pl-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-r">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                                {activity.causer && (
                                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                        Updated by <span className="font-semibold">{activity.causer.name}</span>
                                    </p>
                                )}
                                
                                {changes.length > 0 ? (
                                    <div className="space-y-1">
                                        {changes.map((change, index) => {
                                            const fieldLabel = getFieldLabel(change.field);
                                            const oldValue = formatValue(change.oldValue);
                                            const newValue = formatValue(change.newValue);
                                            
                                            return (
                                                <div key={index} className="text-sm">
                                                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                                        {fieldLabel}:
                                                    </span>{' '}
                                                    <span className="text-neutral-600 dark:text-neutral-400">
                                                        Changed from{' '}
                                                        <span className="line-through text-red-600 dark:text-red-400">
                                                            {oldValue}
                                                        </span>
                                                        {' '}to{' '}
                                                        <span className="text-green-600 dark:text-green-400 font-medium">
                                                            {newValue}
                                                        </span>
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                        {activity.description}
                                    </p>
                                )}
                                
                                <p 
                                    className="text-xs text-neutral-400 mt-2 cursor-help" 
                                    title={dateTimeString}
                                >
                                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                </p>
                            </div>
                            {activity.event && (
                                <Badge variant="outline" className="flex-shrink-0">
                                    {activity.event}
                                </Badge>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

