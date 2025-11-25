<?php

namespace Modules\Drivers\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Company;
use Modules\Drivers\app\Models\LeadSource;

class LeadSourcesSeeder extends Seeder
{
    public function run(?int $companyId = null): void
    {
        // If no company ID provided, seed for all companies
        $companies = $companyId 
            ? Company::where('id', $companyId)->get()
            : Company::all();

        if ($companies->isEmpty()) {
            $this->command->warn('No companies found. Please create a company first.');
            return;
        }

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

        foreach ($companies as $company) {
            foreach ($sources as $source) {
                LeadSource::firstOrCreate(
                    [
                        'company_id' => $company->id,
                        'slug' => \Illuminate\Support\Str::slug($source),
                    ],
                    [
                        'name' => $source,
                        'active' => true,
                    ]
                );
            }
        }
    }
}

