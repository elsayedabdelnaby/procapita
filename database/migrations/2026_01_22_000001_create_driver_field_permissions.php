<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
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

        $permissions = [];
        $now = now();

        foreach ($fields as $field) {
            foreach (['invisible', 'read', 'write'] as $type) {
                $action = "{$type}-{$field}";
                $name = "drivers.driverfields.{$action}";

                // Check if permission already exists
                $exists = DB::table('permissions')
                    ->where('name', $name)
                    ->where('guard_name', 'web')
                    ->exists();

                if (!$exists) {
                    $permissions[] = [
                        'name' => $name,
                        'guard_name' => 'web',
                        'module_name' => 'drivers',
                        'entity_name' => 'driverfields',
                        'action' => $action,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        if (!empty($permissions)) {
            DB::table('permissions')->insert($permissions);
        }
    }

    public function down(): void
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

        $names = [];
        foreach ($fields as $field) {
            foreach (['invisible', 'read', 'write'] as $type) {
                $names[] = "drivers.driverfields.{$type}-{$field}";
            }
        }

        DB::table('permissions')
            ->whereIn('name', $names)
            ->where('guard_name', 'web')
            ->delete();
    }
};
