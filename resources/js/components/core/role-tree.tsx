import { Badge } from '@/components/ui/badge';
import { Role } from '@/types/core';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface RoleTreeProps {
    roles: Role[];
    companyId: number;
}

interface RoleNodeProps {
    role: Role;
    level: number;
    companyId: number;
}

function RoleNode({ role, level, companyId }: RoleNodeProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    
    // Check both 'children' and 'all_children' properties
    const children = role.all_children || role.children || [];
    const hasChildren = children.length > 0;

    return (
        <div>
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
                        <span className="font-medium">{role.name}</span>
                        {role.is_root && <Badge variant="default">Root</Badge>}
                        <span className="text-xs text-neutral-500">{role.hierarchy_path}</span>
                        {role.module_name && (
                            <Badge variant="outline" className="text-xs">
                                {role.module_name}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div className="mt-1">
                    {children.map((child) => (
                        <RoleNode key={child.id} role={child} level={level + 1} companyId={companyId} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function RoleTree({ roles, companyId }: RoleTreeProps) {
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
                <RoleNode key={role.id} role={role} level={0} companyId={companyId} />
            ))}
        </div>
    );
}

