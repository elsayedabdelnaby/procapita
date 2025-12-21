<?php

namespace Modules\Drivers\app\Console\Commands;

use Illuminate\Console\Command;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Services\DriverService;

class CalculateDriverDuplicates extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'drivers:calculate-duplicates';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Calculate duplicate count for all drivers';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Calculating duplicate counts for all drivers...');
        
        $driverService = app(DriverService::class);
        $drivers = Driver::all();
        $total = $drivers->count();
        $bar = $this->output->createProgressBar($total);
        $bar->start();
        
        $updated = 0;
        foreach ($drivers as $driver) {
            $duplicateCount = $driverService->calculateDuplicateCount($driver);
            if (($driver->duplicate ?? 0) != $duplicateCount) {
                $driver->updateQuietly(['duplicate' => $duplicateCount]);
                $updated++;
            }
            $bar->advance();
        }
        
        $bar->finish();
        $this->newLine();
        $this->info("Updated duplicate count for {$updated} out of {$total} drivers.");
        
        return Command::SUCCESS;
    }
}

