<?php

namespace Modules\Marketing\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Company;
use Modules\Marketing\app\Models\CampaignChannel;
use Modules\Marketing\app\Models\CampaignStatus;
use Modules\Marketing\app\Models\CampaignType;

class CampaignTypesSeeder extends Seeder
{
    public function run(): void
    {
        // Seed for all companies
        $companies = Company::all();

        foreach ($companies as $company) {
            $this->seedForCompany($company);
        }

        $this->command->info('Campaign types, statuses, and channels seeded for all companies.');
    }

    public function seedForCompany(Company $company): void
    {
        // Campaign Types
        $types = [
            ['name' => 'Email', 'slug' => 'email', 'icon' => 'Mail', 'color' => 'blue'],
            ['name' => 'Social Media', 'slug' => 'social', 'icon' => 'Share2', 'color' => 'purple'],
            ['name' => 'SMS', 'slug' => 'sms', 'icon' => 'MessageSquare', 'color' => 'green'],
            ['name' => 'Direct Mail', 'slug' => 'direct_mail', 'icon' => 'Send', 'color' => 'orange'],
            ['name' => 'Event', 'slug' => 'event', 'icon' => 'Calendar', 'color' => 'red'],
            ['name' => 'Webinar', 'slug' => 'webinar', 'icon' => 'Video', 'color' => 'indigo'],
            ['name' => 'Paid Ads', 'slug' => 'paid_ads', 'icon' => 'DollarSign', 'color' => 'yellow'],
        ];

        foreach ($types as $index => $typeData) {
            CampaignType::firstOrCreate(
                ['company_id' => $company->id, 'slug' => $typeData['slug']],
                array_merge($typeData, ['sort_order' => $index])
            );
        }

        // Campaign Statuses
        $statuses = [
            ['name' => 'Draft', 'slug' => 'draft', 'color' => 'gray', 'is_final' => false],
            ['name' => 'Scheduled', 'slug' => 'scheduled', 'color' => 'blue', 'is_final' => false],
            ['name' => 'Active', 'slug' => 'active', 'color' => 'green', 'is_final' => false],
            ['name' => 'Paused', 'slug' => 'paused', 'color' => 'yellow', 'is_final' => false],
            ['name' => 'Completed', 'slug' => 'completed', 'color' => 'indigo', 'is_final' => true],
            ['name' => 'Cancelled', 'slug' => 'cancelled', 'color' => 'red', 'is_final' => true],
        ];

        foreach ($statuses as $index => $statusData) {
            CampaignStatus::firstOrCreate(
                ['company_id' => $company->id, 'slug' => $statusData['slug']],
                array_merge($statusData, ['sort_order' => $index])
            );
        }

        // Campaign Channels - Based on Type
        $channels = [
            'email' => [
                ['name' => 'MailChimp', 'slug' => 'mailchimp'],
                ['name' => 'SendGrid', 'slug' => 'sendgrid'],
                ['name' => 'Constant Contact', 'slug' => 'constant_contact'],
                ['name' => 'HubSpot', 'slug' => 'hubspot'],
                ['name' => 'Custom SMTP', 'slug' => 'custom_smtp'],
            ],
            'social' => [
                ['name' => 'Facebook', 'slug' => 'facebook', 'icon' => 'Facebook'],
                ['name' => 'Instagram', 'slug' => 'instagram', 'icon' => 'Instagram'],
                ['name' => 'Twitter/X', 'slug' => 'twitter', 'icon' => 'Twitter'],
                ['name' => 'LinkedIn', 'slug' => 'linkedin', 'icon' => 'Linkedin'],
                ['name' => 'TikTok', 'slug' => 'tiktok'],
                ['name' => 'YouTube', 'slug' => 'youtube', 'icon' => 'Youtube'],
            ],
            'sms' => [
                ['name' => 'SMS Misr', 'slug' => 'sms_misr'],
                ['name' => 'Vodafone SMS', 'slug' => 'vodafone_sms'],
                ['name' => 'Orange SMS', 'slug' => 'orange_sms'],
                ['name' => 'Etisalat SMS', 'slug' => 'etisalat_sms'],
                ['name' => 'Twilio', 'slug' => 'twilio'],
            ],
            'paid_ads' => [
                ['name' => 'Google Ads', 'slug' => 'google_ads', 'icon' => 'Globe'],
                ['name' => 'Facebook Ads', 'slug' => 'facebook_ads', 'icon' => 'Facebook'],
                ['name' => 'Instagram Ads', 'slug' => 'instagram_ads', 'icon' => 'Instagram'],
                ['name' => 'LinkedIn Ads', 'slug' => 'linkedin_ads', 'icon' => 'Linkedin'],
                ['name' => 'Twitter Ads', 'slug' => 'twitter_ads', 'icon' => 'Twitter'],
            ],
        ];

        foreach ($channels as $typeSlug => $typeChannels) {
            $campaignType = CampaignType::where('company_id', $company->id)
                ->where('slug', $typeSlug)
                ->first();

            if ($campaignType) {
                foreach ($typeChannels as $index => $channelData) {
                    CampaignChannel::firstOrCreate(
                        [
                            'company_id' => $company->id,
                            'campaign_type_id' => $campaignType->id,
                            'slug' => $channelData['slug'],
                        ],
                        array_merge($channelData, ['sort_order' => $index])
                    );
                }
            }
        }
    }
}

