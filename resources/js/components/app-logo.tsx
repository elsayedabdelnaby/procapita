import AppLogoIcon from './app-logo-icon';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { useState, useEffect, useMemo } from 'react';
import { Car } from 'lucide-react';

export default function AppLogo() {
    const page = usePage<SharedData>();
    const [imageError, setImageError] = useState(false);
    
    // Safely get props with fallbacks
    const props = page?.props || {};
    const selectedCompany = props.selectedCompany || null;
    const auth = props.auth || null;
    const companies = Array.isArray(props.companies) ? props.companies : [];
    
    // Determine which company to show
    const currentCompany = selectedCompany || (auth?.user?.company_id ? companies.find(c => c?.id === auth.user.company_id) : null);
    const companyName = currentCompany?.name || null;
    
    // Convert company name to logo filename
    // Example: "Tradeway" -> "tradeway-logo.png", "Captain Masr" -> "captain-masr-logo.png"
    const getLogoFilename = (name: string | null | undefined): string | null => {
        if (!name) return null;
        
        // Convert to lowercase and replace spaces with hyphens
        const slug = name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        
        return `/logos/${slug}-logo.png`;
    };
    
    // Get logo path with multiple fallback strategies
    const logoPath = useMemo(() => {
        if (!currentCompany) return null;
        
        // Strategy 1: Use logo_url if available (from database)
        if (currentCompany.logo_url) {
            return currentCompany.logo_url;
        }
        
        // Strategy 2: Use logo field if available (from database)
        if (currentCompany.logo) {
            // If it's a full URL
            if (currentCompany.logo.startsWith('http://') || currentCompany.logo.startsWith('https://')) {
                return currentCompany.logo;
            }
            // If it's already a path starting with /logos/
            if (currentCompany.logo.startsWith('/logos/') || currentCompany.logo.startsWith('logos/')) {
                return currentCompany.logo.startsWith('/') ? currentCompany.logo : `/${currentCompany.logo}`;
            }
            // If it's a storage path
            if (currentCompany.logo.startsWith('storage/') || currentCompany.logo.startsWith('/storage/')) {
                return currentCompany.logo.startsWith('/') ? currentCompany.logo : `/${currentCompany.logo}`;
            }
        }
        
        // Strategy 3: Use slug to build path
        if (currentCompany.slug) {
            return `/logos/${currentCompany.slug}-logo.png`;
        }
        
        // Strategy 4: Use company name to build path (convert to slug format)
        if (companyName) {
            return getLogoFilename(companyName);
        }
        
        return null;
    }, [currentCompany, companyName]);
    
    const shouldShowImage = logoPath && !imageError;
    
    // Reset error state when company changes
    useEffect(() => {
        setImageError(false);
    }, [currentCompany?.id]);
    
    return (
        <>
            {shouldShowImage ? (
                <img 
                    src={logoPath} 
                    alt={companyName || 'Company Logo'} 
                    className="h-[52px] w-auto max-w-[234px] object-contain"
                    onError={() => {
                        console.log('Logo failed to load:', logoPath);
                        setImageError(true);
                    }}
                />
            ) : (
                <>
                    <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                        {companyName ? (
                            <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
                        ) : (
                            <Car className="size-5 text-white dark:text-black" />
                        )}
                    </div>
                    <div className="ml-1 grid flex-1 text-left text-sm">
                        <span className="mb-0.5 truncate leading-tight font-semibold">
                            {companyName || 'Riding Companies'}
                        </span>
                    </div>
                </>
            )}
        </>
    );
}
