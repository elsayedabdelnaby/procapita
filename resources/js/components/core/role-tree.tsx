import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Role } from '@/types/core';
import { Link } from '@inertiajs/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface RoleTreeProps {
    roles: Role[];
}

interface RoleNodeProps {
    role: Role;
    level: number;
}

function RoleNode({ role, level }: RoleNodeProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = role.children && role.children.length > 0;

    return (
        <div className="ml-4">
            <div
                className="flex items-center gap-2 rounded-md p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                style={{ paddingLeft: `${level * 1.5}rem` }}
            >
                {hasChildren ? (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex-shrink-0"
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                ) : (
                    <div className="w-4" />
                )}

                <div className="flex flex-1 items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link
                            href={`/core/roles/${role.id}`}
                            className="font-medium hover:underline"
                        >
                            {role.name}
                        </Link>
                        {role.is_root && <Badge variant="default">Root</Badge>}
                        <span className="text-sm text-neutral-500">
                            Level {role.hierarchy_level}
                        </span>
                        {role.module_name && (
                            <Badge variant="outline">{role.module_name}</Badge>
                        )}
                    </div>
                    <div className="flex gap-1">
                        <Link href={`/core/roles/${role.id}/edit`}>
                            <Button variant="ghost" size="sm">
                                Edit
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="mt-1">
                    {role.children!.map((child) => (
                        <RoleNode key={child.id} role={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function RoleTree({ roles }: RoleTreeProps) {
    if (roles.length === 0) {
        return (
            <div className="rounded-lg border p-8 text-center text-neutral-500">
                No roles found
            </div>
        );
    }

    return (
        <div className="rounded-lg border p-4">
            {roles.map((role) => (
                <RoleNode key={role.id} role={role} level={0} />
            ))}
        </div>
    );
}

