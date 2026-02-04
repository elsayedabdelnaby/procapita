<?php

namespace Modules\Drivers\app\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Models\LeadStatus;

class ApplyLeadStatusDuration extends Command
{
    protected $signature = 'drivers:apply-lead-status-duration';

    protected $description = 'Auto-change lead status for drivers when duration has passed (based on lead_status_set_at)';

    public function handle(): int
    {
        if (! Schema::hasColumn('drivers', 'lead_status_set_at')) {
            return self::SUCCESS;
        }

        // Backfill: leads that have a status but no timestamp (e.g. existed before the column) — start countdown from now
        Driver::whereNotNull('lead_status_id')
            ->whereNull('lead_status_set_at')
            ->update(['lead_status_set_at' => now()]);

        $statuses = LeadStatus::whereNotNull('duration_value')
            ->whereNotNull('duration_unit')
            ->whereNotNull('change_to_lead_status_id')
            ->where('duration_value', '>', 0)
            ->get();

        $changed = 0;
        foreach ($statuses as $status) {
            $cutoff = $this->cutoffFromNow($status->duration_value, $status->duration_unit);
            if (! $cutoff) {
                continue;
            }

            $drivers = Driver::where('lead_status_id', $status->id)
                ->whereNotNull('lead_status_set_at')
                ->where('lead_status_set_at', '<=', $cutoff)
                ->get();

            foreach ($drivers as $driver) {
                $driver->update([
                    'lead_status_id' => $status->change_to_lead_status_id,
                    'lead_status_set_at' => now(),
                ]);
                $changed++;
            }
        }

        if ($changed > 0) {
            $this->info("Updated {$changed} lead(s) to new status by duration.");
        }

        return self::SUCCESS;
    }

    private function cutoffFromNow(int $value, string $unit): ?Carbon
    {
        return match ($unit) {
            'minutes' => now()->subMinutes($value),
            'hours' => now()->subHours($value),
            'days' => now()->subDays($value),
            default => null,
        };
    }
}
