import { Badge } from '@/components/ui/badge';
import { Role } from '@/types/core';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import axios from 'axios';

interface RoleTreeProps {
    roles: Role[];
    companyId: number;
}

interface RoleNodeProps {
    role: Role;
    level: number;
    companyId: number;
    isLast?: boolean;
    hasSiblings?: boolean;
}

function RoleNode({ role, level, companyId, isLast = false, hasSiblings = false }: RoleNodeProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    
    // Check both 'children' and 'all_children' properties
    const children = role.all_children || role.children || [];
    const hasChildren = children.length > 0;

    const handleDragStart = (e: React.DragEvent) => {
        // Allow dragging all roles, including root roles
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', role.id.toString());
        e.dataTransfer.setData('roleId', role.id.toString());
        
        // Add visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setIsDragging(false);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        // Prevent dropping on itself or its descendants
        const draggedRoleId = e.dataTransfer.getData('roleId');
        if (draggedRoleId && draggedRoleId !== role.id.toString()) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        
        const draggedRoleId = e.dataTransfer.getData('roleId');
        
        if (!draggedRoleId || draggedRoleId === role.id.toString()) {
            return;
        }

        // Move the role using axios for API call
        // Allow moving to any role, even if it's a descendant
        axios.post(`/core/companies/${companyId}/roles/${draggedRoleId}/move`, {
            parent_id: role.id,
        })
        .then(() => {
            // Reload both roles list and hierarchy to show updated data immediately
            router.reload({ only: ['roles', 'roleHierarchy'] });
        })
        .catch((error) => {
            const errorMessage = error.response?.data?.error || error.message || 'Failed to move role.';
            alert(errorMessage);
        });
    };

    return (
        <div className="relative">
            <div className="flex items-start">
                {/* Left side - lines and connectors */}
                {level > 0 && (
                    <div className="relative flex-shrink-0" style={{ width: `${level * 1.25}rem` }}>
                        {/* Vertical line from parent (top part) - thicker and more visible */}
                        <div
                            className="absolute bg-neutral-500 dark:bg-neutral-400"
                            style={{
                                left: `${(level - 1) * 1.25 + 0.625}rem`,
                                top: 0,
                                width: '2px',
                                height: '1.125rem',
                            }}
                        />
                        
                        {/* Horizontal connector line - thicker and more visible */}
                        <div
                            className="absolute bg-neutral-500 dark:bg-neutral-400"
                            style={{
                                left: `${(level - 1) * 1.25 + 0.625}rem`,
                                top: '1.125rem',
                                width: '0.625rem',
                                height: '2px',
                            }}
                        />
                        
                        {/* Vertical continuation line (if not last child) - complete line */}
                        {!isLast && (
                            <div
                                className="absolute bg-neutral-500 dark:bg-neutral-400"
                                style={{
                                    left: `${(level - 1) * 1.25 + 0.625}rem`,
                                    top: '1.125rem',
                                    width: '2px',
                                    bottom: 0,
                                }}
                            />
                        )}
                    </div>
                )}
                
                {/* Node content with compact box */}
                <div className="flex-1 min-w-0">
                    <div className="relative mb-0.5">
                        {/* Compact box container - VtigerCRM style with drag and drop */}
                        <div
                            draggable={true}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`inline-flex items-center gap-1.5 border rounded-md bg-white dark:bg-neutral-800 px-2 py-1 text-xs shadow-sm transition-all ${
                                dragOver
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                    : 'border-neutral-300 dark:border-neutral-600 hover:shadow hover:border-neutral-400 dark:hover:border-neutral-500'
                            } ${
                                'cursor-move hover:bg-neutral-50 dark:hover:bg-neutral-700'
                            } ${
                                isDragging ? 'opacity-50' : ''
                            }`}
                            title="Drag to move this role"
            >
                {hasChildren ? (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                                    className="flex-shrink-0 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0 -m-0.5"
                                    style={{ lineHeight: 1 }}
                                    onMouseDown={(e) => e.stopPropagation()}
                    >
                        {isExpanded ? (
                                        <ChevronDown className="h-3 w-3" />
                        ) : (
                                        <ChevronRight className="h-3 w-3" />
                        )}
                    </button>
                ) : (
                                <div className="w-3" />
                )}

                            <Link
                                href={`/core/companies/${companyId}/roles/${role.id}/edit`}
                                className="font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap hover:underline cursor-pointer"
                                onClick={(e) => {
                                    // Prevent drag when clicking on the link
                                    e.stopPropagation();
                                }}
                                onMouseDown={(e) => {
                                    // Prevent drag when clicking on the link
                                    e.stopPropagation();
                                }}
                            >
                                {role.name}
                            </Link>
                            
                            {role.is_root && !role.parent_id && (
                                <Badge variant="default" className="text-[10px] px-1 py-0 h-4 leading-none font-normal">
                                    Root
                                </Badge>
                            )}
                            
                        {role.module_name && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 leading-none font-normal">
                                {role.module_name}
                            </Badge>
                            )}
                            
                            {/* Add child role button */}
                            <Link
                                href={`/core/companies/${companyId}/roles/create?parent_id=${role.id}`}
                                className="flex-shrink-0 text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 -m-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                }}
                                title="Add child role"
                            >
                                <Plus className="h-3 w-3" />
                            </Link>
                        </div>
                        
                        {/* Display hierarchy_path outside the box */}
                        {role.hierarchy_path && (
                            <span className="ml-2 text-[10px] text-neutral-500 dark:text-neutral-400 font-mono whitespace-nowrap">
                                {role.hierarchy_path}
                            </span>
                        )}
                    </div>

                    {/* Children */}
                    {hasChildren && isExpanded && (
                        <div className="relative">
                            {children.map((child, index) => (
                                <RoleNode
                                    key={child.id}
                                    role={child}
                                    level={level + 1}
                                    companyId={companyId}
                                    isLast={index === children.length - 1}
                                    hasSiblings={children.length > 1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
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
        <div className="rounded-lg border p-3 bg-neutral-50 dark:bg-neutral-950">
            {roles.map((role, index) => (
                <RoleNode
                    key={role.id}
                    role={role}
                    level={0}
                    companyId={companyId}
                    isLast={index === roles.length - 1}
                    hasSiblings={roles.length > 1}
                />
            ))}
        </div>
    );
}
