import { FacebookIntegrationContent } from '@/components/facebook/FacebookIntegrationContent';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';

interface FacebookForm {
    form_id: string;
    campaign_id: string | null;
    field_mapping: Record<string, string>;
    name: string | null;
    status: string | null;
}

interface FacebookIntegrationProps {
    ridingCompany: {
        id: number;
        name: string;
    };
    integration: {
        id: number;
        type: string;
        active: boolean;
        facebook_user_id: string | null;
        facebook_page_id: string | null;
        facebook_form_id: string | null;
        facebook_field_mapping: Record<string, string> | null;
        facebook_forms?: FacebookForm[];
        has_access_token: boolean;
        facebook_user_name?: string | null;
    };
}

export default function FacebookIntegrationShow({ ridingCompany, integration }: FacebookIntegrationProps) {
    return (
        <AppLayout>
            <Head title={`Facebook Integration - ${ridingCompany.name}`} />
            <FacebookIntegrationContent ridingCompany={ridingCompany} integration={integration} />
        </AppLayout>
    );
}
