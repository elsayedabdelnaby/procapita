<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Modules\Core\app\Models\Permission;

class CreateDriverFieldPermissionsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $user = Auth::user();
        if (!$user || !$user->is_super_admin) {
            abort(403);
        }
        
        // Execute the artisan command
        \Artisan::call('permissions:create-driver-fields');
        $output = \Artisan::output();
        
        // Also get the results directly
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
        $results = [];
        
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
                    $results[] = "Created: {$name}";
                } else {
                    $skipped++;
                    $results[] = "Skipped (exists): {$name}";
                }
            }
        }
        
        return response()->json([
            'success' => true,
            'created' => $created,
            'skipped' => $skipped,
            'total' => count($fields) * 3,
            'results' => $results,
            'output' => $output,
        ]);
    }
}
