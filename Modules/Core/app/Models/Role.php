<?php

namespace Modules\Core\app\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    protected $fillable = [
        'name',
        'guard_name',
        'team_id',
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
            $this->hierarchy_path = $parent->hierarchy_path . ':H' . $this->id;
            $this->hierarchy_level = $parent->hierarchy_level + 1;
            $this->is_root = false;
        } else {
            $this->hierarchy_path = 'H' . $this->id;
            $this->hierarchy_level = 1;
            $this->is_root = true;
        }

        $this->saveQuietly();

        // Update all children
        foreach ($this->children as $child) {
            $child->updateHierarchy();
        }
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

