<?php

namespace Modules\Marketing\app\Traits;

use Illuminate\Support\Str;

trait HasSlug
{
    protected static function bootHasSlug(): void
    {
        static::creating(function ($model) {
            // Generate slug from name if not provided
            // Use riding_company_id if available, otherwise fall back to company_id
            $tableName = $model->getTable();
            $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn($tableName, 'riding_company_id');
            $hasCompanyId = \Illuminate\Support\Facades\Schema::hasColumn($tableName, 'company_id');
            
            $scopeId = null;
            if ($hasRidingCompanyId && isset($model->riding_company_id)) {
                $scopeId = $model->riding_company_id;
            } elseif ($hasCompanyId && isset($model->company_id)) {
                $scopeId = $model->company_id;
            }
            
            if (empty($model->slug)) {
                $model->slug = static::generateUniqueSlug($model->name, $scopeId);
            } else {
                // Normalize slug (trim and convert to lowercase slug format)
                $providedSlug = trim($model->slug);
                $normalizedSlug = Str::slug($providedSlug);
                
                // Always ensure slug is unique, even if provided
                $model->slug = static::generateUniqueSlug($normalizedSlug, $scopeId);
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('name') && empty($model->slug)) {
                // Use riding_company_id if available, otherwise fall back to company_id
                $tableName = $model->getTable();
                $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn($tableName, 'riding_company_id');
                $hasCompanyId = \Illuminate\Support\Facades\Schema::hasColumn($tableName, 'company_id');
                
                $scopeId = null;
                if ($hasRidingCompanyId && isset($model->riding_company_id)) {
                    $scopeId = $model->riding_company_id;
                } elseif ($hasCompanyId && isset($model->company_id)) {
                    $scopeId = $model->company_id;
                }
                
                $model->slug = static::generateUniqueSlug($model->name, $scopeId);
            }
        });
    }

    public static function generateUniqueSlug(string $name, ?int $scopeId = null): string
    {
        $slug = Str::slug($name);
        $originalSlug = $slug;
        $counter = 1;

        // Check uniqueness based on riding_company_id if it exists in the model, otherwise use company_id
        $query = static::query();
        
        // Check if columns exist in database schema
        $tableName = (new static)->getTable();
        $hasRidingCompanyId = \Illuminate\Support\Facades\Schema::hasColumn($tableName, 'riding_company_id');
        $hasCompanyId = \Illuminate\Support\Facades\Schema::hasColumn($tableName, 'company_id');
        
        if ($hasRidingCompanyId && $scopeId !== null) {
            $query->where('riding_company_id', $scopeId);
        } elseif ($hasCompanyId && $scopeId !== null) {
            $query->where('company_id', $scopeId);
        }
        // If neither column exists or scopeId is null, check globally (no scoping)
        
        while ($query->where('slug', $slug)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }
}

