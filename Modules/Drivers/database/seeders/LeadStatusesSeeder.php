<?php

namespace Modules\Drivers\database\seeders;

use Illuminate\Database\Seeder;
use Modules\Core\app\Models\Company;
use Modules\Drivers\app\Models\LeadStatus;

class LeadStatusesSeeder extends Seeder
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

        $statuses = [
            ['name' => 'New', 'color' => 'blue', 'order' => 1],
            ['name' => 'Contacted', 'color' => 'yellow', 'order' => 2],
            ['name' => 'Interested', 'color' => 'green', 'order' => 3],
            ['name' => 'Not Answering', 'color' => 'orange', 'order' => 4],
            ['name' => 'Wrong Number', 'color' => 'red', 'order' => 5],
            ['name' => 'Qualified', 'color' => 'green', 'order' => 6],
            ['name' => 'Rejected', 'color' => 'red', 'order' => 7],
        ];

        foreach ($companies as $company) {
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
}

