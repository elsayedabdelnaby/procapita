<?php

namespace Modules\Core\app\Models;

use Spatie\Permission\Models\Permission as SpatiePermission;

class Permission extends SpatiePermission
{
    protected $fillable = [
        'name',
        'guard_name',
        'module_name',
        'entity_name',
        'action',
    ];

    public function scopeForModule($query, string $moduleName)
    {
        return $query->where('module_name', $moduleName);
    }

    public function scopeForEntity($query, string $entityName)
    {
        return $query->where('entity_name', $entityName);
    }

    public function scopeForAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    public static function createForModule(
        string $moduleName,
        string $entityName,
        array $actions = ['create', 'read', 'update', 'delete']
    ): array {
        $permissions = [];

        foreach ($actions as $action) {
            $name = "{$moduleName}.{$entityName}.{$action}";

            $permissions[] = static::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
                [
                    'module_name' => $moduleName,
                    'entity_name' => $entityName,
                    'action' => $action,
                ]
            );
        }

        return $permissions;
    }
}

