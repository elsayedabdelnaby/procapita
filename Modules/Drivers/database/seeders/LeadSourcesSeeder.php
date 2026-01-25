<?php

namespace Modules\Drivers\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Company;
use Modules\Drivers\app\Models\LeadSource;

class LeadSourcesSeeder extends Seeder
{
    public function run(?int $companyId = null): void
    {
        // Lead Sources are now global, no need for company-specific seeding
        $sources = [
            'Facebook Ads',
            'Google Ads',
            'Referral',
            'Website',
            'Call Center',
            'Instagram Ads',
            'Twitter Ads',
            'LinkedIn Ads',
            'YouTube Ads',
            'Organic Search',
            'Direct',
            'Other',
        ];

        foreach ($sources as $source) {
            LeadSource::firstOrCreate(
                [
                    'name' => $source,
                ],
                [
                    'active' => true,
                ]
            );
        }
    }
}

