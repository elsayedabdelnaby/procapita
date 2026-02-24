<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Modules\RidingCarCompanies\app\Services\RidingCompanyService;

class DistributeDriversCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'drivers:distribute {--riding-company-id= : Specific riding company ID to process}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Distribute drivers from fresh-Leads users to assigned users based on active distribution scenarios';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $ridingCompanyId = $this->option('riding-company-id');

        $query = RidingCompany::query();

        if ($ridingCompanyId) {
            $query->where('id', $ridingCompanyId);
        }

        $ridingCompanies = $query->get();

        if ($ridingCompanies->isEmpty()) {
            $this->info('No reseller companies found to process.');

            return Command::SUCCESS;
        }

        $service = app(RidingCompanyService::class);
        $totalDistributed = 0;
        $processedCount = 0;

        foreach ($ridingCompanies as $ridingCompany) {
            // Check if distribution_scenarios exist and are configured
            $distributionScenarios = $ridingCompany->distribution_scenarios ?? [];

            if (empty($distributionScenarios) || ! is_array($distributionScenarios)) {
                continue; // Skip if no scenarios configured
            }

            // Filter only active scenarios
            $activeScenarios = array_filter($distributionScenarios, function ($scenario) {
                return ($scenario['active'] ?? true) === true;
            });

            if (empty($activeScenarios)) {
                continue; // Skip if no active scenarios
            }

            try {
                $result = $service->distributeDrivers($ridingCompany->id);

                if ($result['success']) {
                    $distributed = $result['distributed'] ?? 0;
                    $totalDistributed += $distributed;
                    $processedCount++;

                    if ($distributed > 0) {
                        $this->info("Reseller Company #{$ridingCompany->id} ({$ridingCompany->name}): Distributed {$distributed} driver(s)");
                    }
                } else {
                    $this->warn("Reseller Company #{$ridingCompany->id} ({$ridingCompany->name}): {$result['message']}");
                }
            } catch (\Exception $e) {
                $this->error("Error processing Reseller Company #{$ridingCompany->id}: {$e->getMessage()}");
            }
        }

        if ($processedCount > 0) {
            $this->info("Processed {$processedCount} reseller company(ies), total distributed: {$totalDistributed} driver(s)");
        } else {
            $this->info('No active distribution scenarios found to process.');
        }

        return Command::SUCCESS;
    }
}
