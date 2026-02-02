import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { resolveUrl } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { type NavigationItem } from '@/types';
import { usePermissions } from '@/hooks/use-permissions';

interface NavMainProps {
    navigation: NavigationItem[];
}

const STORAGE_KEY = 'sidebar_open_groups';

export function NavMain({ navigation }: NavMainProps) {
    const page = usePage<SharedData>();
    const { hasEntityPermission } = usePermissions();
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';

    // Filter navigation items based on permissions
    const filteredNavigation = useMemo(() => {
        return navigation
            .map((group) => {
                // If it's a single item (has href), check permission
                if (group.href) {
                    // If no permission metadata, show the item (for backward compatibility)
                    if (!group.permission_module || !group.permission_entity) {
                        return group;
                    }
                    
                    if (!hasEntityPermission(group.permission_module, group.permission_entity)) {
                        return null;
                    }
                    return group;
                }

                // If it's a group with items, filter the items
                if (group.items && group.items.length > 0) {
                    const filteredItems = group.items.filter((item) => {
                        // If no permission metadata, show the item (for backward compatibility)
                        if (!item.permission_module || !item.permission_entity) {
                            return true;
                        }
                        return hasEntityPermission(item.permission_module, item.permission_entity);
                    });

                    // Only return the group if it has visible items
                    if (filteredItems.length === 0) {
                        return null;
                    }

                    return {
                        ...group,
                        items: filteredItems,
                    };
                }

                return group;
            })
            .filter((item): item is NavigationItem => item !== null);
    }, [navigation, hasEntityPermission]);
    
    // Load saved state from localStorage or default to ['Core']
    const getInitialOpenGroups = (): string[] => {
        if (typeof window === 'undefined') {
            return ['Core'];
        }
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Error loading sidebar state:', e);
        }
        return ['Core'];
    };

    const [openGroups, setOpenGroups] = useState<string[]>(getInitialOpenGroups);

    // Save to localStorage whenever openGroups changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
            } catch (e) {
                console.error('Error saving sidebar state:', e);
            }
        }
    }, [openGroups]);

    const getIcon = (iconName?: string) => {
        if (!iconName) return null;
        const Icon = LucideIcons[iconName as keyof typeof LucideIcons] as any;
        return Icon ? <Icon className="h-4 w-4" /> : null;
    };

    const toggleGroup = (title: string) => {
        setOpenGroups((prev) => {
            const newGroups = prev.includes(title)
                ? prev.filter((g) => g !== title)
                : [...prev, title];
            return newGroups;
        });
    };

    return (
        <>
            {filteredNavigation.map((group) => {
                // If item has href, it's a single item
                if (group.href) {
                    return (
                        <SidebarGroup key={group.title} className="px-2 py-0">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={page.url.startsWith(resolveUrl(group.href))}
                                        tooltip={{ children: group.title }}
                                    >
                                        <Link href={group.href} prefetch>
                                            {getIcon(group.icon)}
                                            <span>{group.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                    );
                }

                // If item has items array, it's a collapsible group
                if (group.items && group.items.length > 0) {
                    const isOpen = openGroups.includes(group.title);

                    // In collapsed state, show icons directly for all groups
                    if (isCollapsed) {
                        return (
                            <SidebarGroup key={group.title} className="px-2 py-0">
                                <SidebarMenu>
                                    {group.items.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={
                                                    !!(
                                                    item.href &&
                                                    page.url.startsWith(
                                                        resolveUrl(item.href)
                                                        )
                                                    )
                                                }
                                                tooltip={{ children: item.title }}
                                            >
                                                <Link href={item.href || '#'} prefetch>
                                                    {getIcon(item.icon)}
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroup>
                        );
                    }

                    return (
                        <Collapsible
                            key={group.title}
                            open={isOpen}
                            onOpenChange={() => toggleGroup(group.title)}
                            className="group/collapsible"
                        >
                            <SidebarGroup className="px-2 py-0">
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton
                                                tooltip={{ children: group.title }}
                                            >
                                                {getIcon(group.icon)}
                                                <span>{group.title}</span>
                                                <ChevronRight
                                                    className={`ml-auto h-4 w-4 transition-transform ${
                                                        isOpen ? 'rotate-90' : ''
                                                    }`}
                                                />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {group.items.map((item) => (
                                                    <SidebarMenuSubItem key={item.title}>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={
                                                                !!(
                                                                item.href &&
                                                                page.url.startsWith(
                                                                    resolveUrl(item.href)
                                                                    )
                                                                )
                                                            }
                                                        >
                                                            <Link href={item.href || '#'} prefetch>
                                                                {getIcon(item.icon)}
                                                                <span>{item.title}</span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroup>
                        </Collapsible>
                    );
                }

                return null;
            })}
        </>
    );
}
