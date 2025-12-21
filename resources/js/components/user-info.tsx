import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
}: {
    user: User;
    showEmail?: boolean;
}) {
    const getInitials = useInitials();

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                {showEmail && (
                    <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                    </span>
                )}
                {user.company && (
                    <div className="flex items-center gap-2 mt-1">
                        {user.company.logo_url && (
                            <img 
                                src={user.company.logo_url} 
                                alt={user.company.name}
                                className="h-4 w-4 object-contain"
                            />
                        )}
                        <span className="truncate text-xs text-muted-foreground">
                            {user.company.name}
                        </span>
                    </div>
                )}
                {user.riding_company && (
                    <span className="truncate text-xs text-muted-foreground">
                        {user.riding_company.name}
                    </span>
                )}
            </div>
        </>
    );
}
