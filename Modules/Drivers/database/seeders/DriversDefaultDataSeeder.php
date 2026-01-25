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
        // Lead Sources and Lead Statuses are now global, seed once
        $this->seedForCompany(null);

        $this->command->info('Lead sources and lead statuses seeded globally.');
    }

    public function seedForCompany(?Company $company = null): void
    {
        // Lead Sources are now global, seed once for all companies
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

        // Lead Statuses are now global, seed once for all companies
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
                    'name' => $status['name'],
                ],
                [
                    'color' => $status['color'],
                    'order' => $status['order'],
                    'active' => true,
                ]
            );
        }
    }
}

