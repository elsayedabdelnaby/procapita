import { type Company } from './core';

export interface CampaignType {
    id: number;
    company_id: number;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface CampaignStatus {
    id: number;
    company_id: number;
    name: string;
    slug: string;
    description?: string;
    color?: string;
    is_active: boolean;
    is_final: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface CampaignChannel {
    id: number;
    company_id: number;
    campaign_type_id: number;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    settings?: Record<string, any>;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface Campaign {
    id: number;
    company_id: number;
    name: string;
    slug: string;
    description?: string;
    campaign_type_id: number;
    campaign_status_id: number;
    campaign_channel_id: number;
    start_date: string;
    end_date?: string;
    
    // Expected metrics
    expected_budget?: number;
    expected_roi?: number;
    expected_leads?: number;
    expected_conversions?: number;
    expected_conversion_rate?: number;
    expected_reach?: number;
    expected_impressions?: number;
    expected_clicks?: number;
    expected_ctr?: number;
    expected_revenue?: number;
    
    // Actual metrics
    actual_spend?: number;
    actual_roi?: number;
    actual_leads?: number;
    actual_conversions?: number;
    actual_conversion_rate?: number;
    actual_reach?: number;
    actual_impressions?: number;
    actual_clicks?: number;
    actual_ctr?: number;
    actual_revenue?: number;
    
    assigned_to?: number;
    created_by?: number;
    created_at: string;
    updated_at: string;
    
    // Relationships
    company?: Company;
    type?: CampaignType;
    status?: CampaignStatus;
    channel?: CampaignChannel;
    metrics?: CampaignMetric[];
}

export interface CampaignMetric {
    id: number;
    campaign_id: number;
    date: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    ctr?: number;
    conversion_rate?: number;
    roi?: number;
    created_at: string;
    updated_at: string;
    
    // Relationships
    campaign?: Campaign;
}

export interface MarketingList {
    id: number;
    company_id: number;
    name: string;
    description?: string;
    type: 'static' | 'dynamic' | 'imported' | 'segmented';
    status: 'active' | 'inactive' | 'archived';
    total_contacts: number;
    criteria?: Record<string, any>;
    created_at: string;
    updated_at: string;
    
    // Relationships
    company?: Company;
}

export interface MarketingTemplate {
    id: number;
    company_id: number;
    name: string;
    type: 'email' | 'sms' | 'social_post' | 'landing_page' | 'ad' | 'other';
    subject?: string;
    content: string;
    variables?: Record<string, any>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    
    // Relationships
    company?: Company;
}

