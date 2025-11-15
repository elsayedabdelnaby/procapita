<?php

namespace Modules\RidingCarCompanies\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

class RidingCompanyService
{
    public function getAllRidingCompanies(?int $companyId = null): Collection
    {
        $query = RidingCompany::query();

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->orderBy('name')->get();
    }

    public function getRidingCompanyById(int $id): ?RidingCompany
    {
        return RidingCompany::find($id);
    }

    public function createRidingCompany(array $data): RidingCompany
    {
        return RidingCompany::create($data);
    }

    public function updateRidingCompany(int $id, array $data): RidingCompany
    {
        $ridingCompany = RidingCompany::findOrFail($id);
        $ridingCompany->update($data);

        return $ridingCompany->fresh();
    }

    public function deleteRidingCompany(int $id): bool
    {
        $ridingCompany = RidingCompany::findOrFail($id);
        return $ridingCompany->delete();
    }

    public function toggleActive(int $id): RidingCompany
    {
        $ridingCompany = RidingCompany::findOrFail($id);
        $ridingCompany->update(['active' => ! $ridingCompany->active]);

        return $ridingCompany->fresh();
    }

    public function uploadLogo(int $id, UploadedFile $file): string
    {
        $ridingCompany = RidingCompany::findOrFail($id);

        // Delete old logo if exists
        if ($ridingCompany->logo_path && Storage::exists($ridingCompany->logo_path)) {
            Storage::delete($ridingCompany->logo_path);
        }

        // Store new logo
        $path = $file->store('riding-companies/logos', 'public');

        $ridingCompany->update(['logo_path' => $path]);

        return $path;
    }
}

