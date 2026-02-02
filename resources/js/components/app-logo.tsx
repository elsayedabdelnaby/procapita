import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { useState, useEffect, useMemo } from 'react';

export default function AppLogo() {
    const page = usePage<SharedData>();
    const [imageError, setImageError] = useState(false);
    
    // Safely get props with fallbacks
    const props = page?.props || {};
    const selectedCompany = props.selectedCompany || null;
    const auth = props.auth || null;
    const companies = Array.isArray(props.companies) ? props.companies : [];
    
    // Determine which company to show
    // Priority: selectedCompany > first company in list > auth.user.company > companies.find by company_id
    const currentCompany = selectedCompany || 
        (companies && companies.length > 0 ? companies[0] : null) ||
        auth?.user?.company || 
        (auth?.user?.company_id ? companies.find(c => c?.id === auth.user.company_id) : null);
    const companyName = currentCompany?.name || null;
    
    // Convert company name to logo filename
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
        
        // Strategy 1: Use logo_url if available (from database - this is the preferred method)
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
            // If it's a storage path, convert to URL
            if (currentCompany.logo.startsWith('storage/') || currentCompany.logo.startsWith('/storage/')) {
                const cleanPath = currentCompany.logo.startsWith('/') ? currentCompany.logo.substring(1) : currentCompany.logo;
                return `/storage/${cleanPath}`;
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
        
        // Strategy 5: Default to ProCapita logo
        return '/logos/procapita_logo.svg';
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
                    className="h-[calc(52px-2mm)] w-full max-w-full object-contain"
                    onError={() => {
                        console.log('Logo failed to load:', logoPath);
                        setImageError(true);
                    }}
                />
            ) : (
                <img src="/logos/procapita_logo.svg" alt="ProCapita Logo" className="h-[calc(45px-2mm)] w-full max-w-full object-contain" />
            )}
        </>
    );
}
