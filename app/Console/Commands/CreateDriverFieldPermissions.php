<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Modules\Core\app\Models\Permission;

class CreateDriverFieldPermissions extends Command
{
    protected $signature = 'permissions:create-driver-fields';

    protected $description = 'Create driver field permissions (invisible, read, write)';

    public function handle(): int
    {
        $fields = [
            'assigned_to',
            'campaign',
            'cancel_reason',
            'car_or_scooter',
            'city',
            'current_stage',
            'email',
            'lead_status_comment',
            'has_worked_before',
            'lead_source',
            'lead_stage',
            'lead_status',
            'full_name',
            'next_follow_up',
            'phone',
            'vehicle_type',
            'vehicle_type_and_year',
            'whatsapp_phone',
            'worked_with_us_before',
        ];

        $created = 0;
        $skipped = 0;

        $this->info('Creating driver field permissions...');
        $this->newLine();

        foreach ($fields as $field) {
            foreach (['invisible', 'read', 'write'] as $type) {
                $action = "{$type}-{$field}";
                $name = "drivers.driverfields.{$action}";

                $permission = Permission::firstOrCreate(
                    [
                        'name' => $name,
                        'guard_name' => 'web',
                    ],
                    [
                        'module_name' => 'drivers',
                        'entity_name' => 'driverfields',
                        'action' => $action,
                    ]
                );

                if ($permission->wasRecentlyCreated) {
                    $created++;
                    $this->line("  ✓ Created: {$name}");
                } else {
                    $skipped++;
                    $this->line("  - Skipped (exists): {$name}");
                }
            }
        }

        $this->newLine();
        $this->info("Total created: {$created}");
        $this->info("Total skipped (already exist): {$skipped}");
        $this->info("Total: " . ($created + $skipped));

        return Command::SUCCESS;
    }
}
