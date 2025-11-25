<?php

namespace Modules\Drivers\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Company;
use Modules\Drivers\app\Models\LeadSource;
use Modules\Drivers\app\Models\LeadStatus;

class DriversDefaultDataSeeder extends Seeder
{
    public function run(): void
    {
        // Seed for all companies
        $companies = Company::all();

        foreach ($companies as $company) {
            $this->seedForCompany($company);
        }

        $this->command->info('Lead sources and lead statuses seeded for all companies.');
    }

    public function seedForCompany(Company $company): void
    {
        // Lead Sources
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
                    'company_id' => $company->id,
                    'slug' => \Illuminate\Support\Str::slug($source),
                ],
                [
                    'name' => $source,
                    'active' => true,
                ]
            );
        }

        // Lead Statuses
        $statuses = [
            ['name' => 'New', 'color' => '#3b82f6', 'order' => 1],
            ['name' => 'Contacted', 'color' => '#f59e0b', 'order' => 2],
            ['name' => 'Interested', 'color' => '#10b981', 'order' => 3],
            ['name' => 'Not Answering', 'color' => '#f97316', 'order' => 4],
            ['name' => 'Wrong Number', 'color' => '#ef4444', 'order' => 5],
            ['name' => 'Qualified', 'color' => '#10b981', 'order' => 6],
            ['name' => 'Rejected', 'color' => '#ef4444', 'order' => 7],
        ];

        foreach ($statuses as $status) {
            LeadStatus::firstOrCreate(
                [
                    'company_id' => $company->id,
                    'slug' => \Illuminate\Support\Str::slug($status['name']),
                ],
                [
                    'name' => $status['name'],
                    'color' => $status['color'],
                    'order' => $status['order'],
                    'active' => true,
                ]
            );
        }
    }
}

