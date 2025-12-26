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

        // Default statuses for all companies
        $defaultStatuses = [
            ['name' => 'New', 'color' => 'blue', 'order' => 1],
        ];

        // Extended statuses for specific companies (تريد واى and كابتن مصر)
        $extendedStatuses = [
            ['name' => 'No Answer 1st Call', 'color' => 'orange', 'order' => 2],
            ['name' => 'Probleme with link', 'color' => 'red', 'order' => 3],
            ['name' => 'Whats app Message', 'color' => 'green', 'order' => 4],
            ['name' => 'Follow Documents', 'color' => 'yellow', 'order' => 5],
            ['name' => 'Follow Up', 'color' => 'blue', 'order' => 6],
            ['name' => 'Need Recall', 'color' => 'orange', 'order' => 7],
            ['name' => 'Rejected', 'color' => 'red', 'order' => 8],
            ['name' => 'Link Not Done', 'color' => 'red', 'order' => 9],
            ['name' => 'Missing Documents', 'color' => 'orange', 'order' => 10],
            ['name' => 'Waiting Activation', 'color' => 'yellow', 'order' => 11],
            ['name' => 'Need To Visit GL', 'color' => 'blue', 'order' => 12],
            ['name' => 'Active', 'color' => 'green', 'order' => 13],
            ['name' => 'Sign Up', 'color' => 'green', 'order' => 14],
            ['name' => 'Sign up Cities', 'color' => 'green', 'order' => 15],
            ['name' => 'DFT', 'color' => 'blue', 'order' => 16],
            ['name' => 'Complete 50', 'color' => 'green', 'order' => 17],
            ['name' => 'Complete 100', 'color' => 'green', 'order' => 18],
            ['name' => 'Complete 120', 'color' => 'green', 'order' => 19],
            ['name' => 'Deleted lead', 'color' => 'red', 'order' => 20],
            ['name' => 'DFT Old', 'color' => 'gray', 'order' => 21],
            ['name' => 'Expired Account', 'color' => 'red', 'order' => 22],
            ['name' => 'Fresh stage', 'color' => 'blue', 'order' => 23],
        ];

        // Company names that should get extended statuses
        // Include both English and Arabic names
        $extendedCompanies = ['Tradeway', 'Captain Masr'];

        foreach ($companies as $company) {
            // Determine which statuses to use for this company
            $shouldUseExtended = in_array($company->name, $extendedCompanies);
            $statusesToUse = $shouldUseExtended 
                ? array_merge($defaultStatuses, $extendedStatuses)
                : $defaultStatuses;

            // Get all slugs that should exist
            $expectedSlugs = array_map(function($status) {
                return \Illuminate\Support\Str::slug($status['name']);
            }, $statusesToUse);

            // Delete all statuses that are not in the expected list (including soft deleted)
            LeadStatus::withTrashed()
                ->where('company_id', $company->id)
                ->whereNotIn('slug', $expectedSlugs)
                ->forceDelete();

            // Create or update all statuses
            foreach ($statusesToUse as $status) {
                $slug = \Illuminate\Support\Str::slug($status['name']);
                
                // Check if status exists (including soft deleted)
                $existingStatus = LeadStatus::withTrashed()
                    ->where('company_id', $company->id)
                    ->where('slug', $slug)
                    ->first();
                
                if ($existingStatus) {
                    // Restore if soft deleted
                    if ($existingStatus->trashed()) {
                        $existingStatus->restore();
                    }
                    // Update existing status
                    $existingStatus->update([
                        'name' => $status['name'],
                        'color' => $status['color'],
                        'order' => $status['order'],
                        'active' => true,
                    ]);
                } else {
                    // Create new status
                    LeadStatus::create([
                        'company_id' => $company->id,
                        'name' => $status['name'],
                        'slug' => $slug,
                        'color' => $status['color'],
                        'order' => $status['order'],
                        'active' => true,
                    ]);
                }
            }
        }
    }
}

