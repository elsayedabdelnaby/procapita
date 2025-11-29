<?php

namespace Modules\Core\app\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\RidingCarCompanies\app\Models\RidingCompany;
use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    protected $fillable = [
        'name',
        'guard_name',
        'team_id',
        'riding_company_id',
        'parent_id',
        'hierarchy_path',
        'hierarchy_level',
        'is_root',
        'module_name',
        'entity_name',
    ];

    protected function casts(): array
    {
        return [
            'is_root' => 'boolean',
            'hierarchy_level' => 'integer',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'team_id');
    }

    public function ridingCompany(): BelongsTo
    {
        return $this->belongsTo(RidingCompany::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Role::class, 'parent_id');
    }

    public function descendants(): HasMany
    {
        return $this->hasMany(Role::class, 'parent_id')
            ->with('descendants');
    }

    // Alias for descendants (used in eager loading)
    public function allChildren(): HasMany
    {
        return $this->descendants();
    }

    public function ancestors()
    {
        $ancestors = collect();
        $current = $this->parent;

        while ($current) {
            $ancestors->push($current);
            $current = $current->parent;
        }

        return $ancestors;
    }

    public function updateHierarchy(): void
    {
        if ($this->parent_id) {
            $parent = $this->parent;
            
            // Get the hierarchical number for this role within the company
            $hierarchicalNumber = $this->getHierarchicalNumber();
            
            $this->hierarchy_path = $parent->hierarchy_path . ':H' . $hierarchicalNumber;
            $this->hierarchy_level = $parent->hierarchy_level + 1;
            $this->is_root = false;
        } else {
            // For root roles, get the next hierarchical number for root roles in this company
            $hierarchicalNumber = $this->getHierarchicalNumber();
            
            $this->hierarchy_path = 'H' . $hierarchicalNumber;
            $this->hierarchy_level = 1;
            $this->is_root = true;
        }

        $this->saveQuietly();

        // Update all children
        foreach ($this->children as $child) {
            $child->updateHierarchy();
        }
    }

    /**
     * Get the hierarchical number for this role within its company.
     * This ensures H1, H2, H3 are unique per company, not globally.
     * 
     * For root roles: H1, H2, H3 (sequential across company)
     * For child roles: parent_path + next number (e.g., H1:H2, H2:H3)
     */
    protected function getHierarchicalNumber(): int
    {
        // If role already has a hierarchy path, extract its number
        if ($this->hierarchy_path) {
            // Extract the last number from the path (e.g., "H1:H3" -> 3, "H2" -> 2)
            $parts = explode(':', $this->hierarchy_path);
            $lastPart = end($parts);
            if (preg_match('/H(\d+)/', $lastPart, $matches)) {
                return (int) $matches[1];
            }
        }

        // Get the highest hierarchical number used in this company
        $query = static::where('team_id', $this->team_id);
        
        // Exclude current role if updating
        if ($this->id) {
            $query->where('id', '!=', $this->id);
        }
        
        // Get ALL roles in the company
        $existingRoles = $query->get();
        
        // Find the highest H number used anywhere in this company
        $maxNumber = 0;
        
        foreach ($existingRoles as $role) {
            if ($role->hierarchy_path) {
                // Extract ALL numbers from the path
                preg_match_all('/H(\d+)/', $role->hierarchy_path, $matches);
                if (!empty($matches[1])) {
                    foreach ($matches[1] as $number) {
                        $num = (int) $number;
                        if ($num > $maxNumber) {
                            $maxNumber = $num;
                        }
                    }
                }
            }
        }
        
        // Return next available number
        return $maxNumber + 1;
    }

    public function isAncestorOf(Role $role): bool
    {
        return str_contains($role->hierarchy_path, $this->hierarchy_path);
    }

    public function isDescendantOf(Role $role): bool
    {
        return str_contains($this->hierarchy_path, $role->hierarchy_path);
    }

    public function isSiblingOf(Role $role): bool
    {
        return $this->parent_id === $role->parent_id && $this->id !== $role->id;
    }

    public function getHierarchyPathArray(): array
    {
        return array_filter(explode(':', $this->hierarchy_path ?? ''));
    }

    public function scopeRootRoles($query)
    {
        return $query->where('is_root', true);
    }

    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('team_id', $companyId);
    }

    public function scopeForModule($query, string $moduleName)
    {
        return $query->where('module_name', $moduleName);
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Role $role) {
            if (! $role->team_id && auth()->check()) {
                $role->team_id = auth()->user()->company_id;
            }
        });

        static::created(function (Role $role) {
            $role->updateHierarchy();
        });

        static::updated(function (Role $role) {
            if ($role->isDirty('parent_id')) {
                $role->updateHierarchy();
            }
        });
    }
}

