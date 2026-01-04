<?php

namespace Modules\RidingCarCompanies\app\Console\Commands;

use Illuminate\Console\Command;
use Modules\RidingCarCompanies\app\Services\FacebookLeadsSyncService;

class SyncFacebookLeadsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'facebook:sync-leads {--riding-company-id= : Sync leads for a specific riding company ID}';

    /**
     * The console command description.
     */
    protected $description = 'Sync Facebook leads automatically for all active integrations or a specific riding company';

    /**
     * Execute the console command.
     */
    public function handle(FacebookLeadsSyncService $syncService): int
    {
        $ridingCompanyId = $this->option('riding-company-id');

        if ($ridingCompanyId) {
            $this->info("Syncing leads for riding company ID: {$ridingCompanyId}");
            $result = $syncService->syncLeadsForRidingCompany((int) $ridingCompanyId);
        } else {
            $this->info('Syncing leads for all active Facebook integrations...');
            $result = $syncService->syncAllActiveIntegrations();
        }

        if ($result['success']) {
            $this->info($result['message']);
            
            if (isset($result['created'])) {
                $this->line("Created: {$result['created']} leads");
            }
            if (isset($result['skipped'])) {
                $this->line("Skipped: {$result['skipped']} duplicate leads");
            }
            if (isset($result['total_created'])) {
                $this->line("Total Created: {$result['total_created']} leads");
                $this->line("Total Skipped: {$result['total_skipped']} duplicate leads");
                $this->line("Successful: {$result['success_count']} integration(s)");
                if (isset($result['error_count']) && $result['error_count'] > 0) {
                    $this->warn("Errors: {$result['error_count']} integration(s)");
                }
            }
            
            return Command::SUCCESS;
        } else {
            $this->error('Failed to sync leads: ' . ($result['error'] ?? 'Unknown error'));
            return Command::FAILURE;
        }
    }
}

