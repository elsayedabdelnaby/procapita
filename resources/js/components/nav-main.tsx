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
} from '@/components/ui/sidebar';
import { resolveUrl } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useState } from 'react';

interface NavigationItem {
    title: string;
    href?: string;
    icon?: string;
    items?: NavigationItem[];
}

interface NavMainProps {
    navigation: NavigationItem[];
}

export function NavMain({ navigation }: NavMainProps) {
    const page = usePage();
    const [openGroups, setOpenGroups] = useState<string[]>(['Core']); // Core open by default

    const getIcon = (iconName?: string) => {
        if (!iconName) return null;
        const Icon = LucideIcons[iconName as keyof typeof LucideIcons] as any;
        return Icon ? <Icon className="h-4 w-4" /> : null;
    };

    const toggleGroup = (title: string) => {
        setOpenGroups((prev) =>
            prev.includes(title) ? prev.filter((g) => g !== title) : [...prev, title]
        );
    };

    return (
        <>
            {navigation.map((group) => {
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
                                                                item.href &&
                                                                page.url.startsWith(
                                                                    resolveUrl(item.href)
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
