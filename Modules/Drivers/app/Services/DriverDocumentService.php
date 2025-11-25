<?php

namespace Modules\Drivers\app\Services;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Modules\Drivers\app\Models\DriverDocument;

class DriverDocumentService
{
    public function getAllDriverDocuments(?int $driverId = null): Collection
    {
        $query = DriverDocument::with(['driver', 'documentTemplate', 'reviewer'])
            ->whereHas('driver', function ($q) {
                // Only show documents for non-deleted drivers
                $q->whereNull('deleted_at');
            });

        if ($driverId) {
            $query->where('driver_id', $driverId);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function getDriverDocumentById(int $id): ?DriverDocument
    {
        return DriverDocument::with(['driver', 'documentTemplate', 'reviewer'])->find($id);
    }

    public function createDriverDocument(array $data): DriverDocument
    {
        return DriverDocument::create($data);
    }

    public function updateDriverDocument(int $id, array $data): DriverDocument
    {
        $driverDocument = DriverDocument::findOrFail($id);
        $driverDocument->update($data);

        return $driverDocument->fresh();
    }

    public function deleteDriverDocument(int $id): bool
    {
        $driverDocument = DriverDocument::findOrFail($id);
        return $driverDocument->delete();
    }

    public function uploadFile(int $id, UploadedFile $file, int $driverId, int $companyId): string
    {
        $driverDocument = DriverDocument::findOrFail($id);
        return $driverDocument->uploadFile($file, $driverId, $companyId);
    }

    public function approveDocument(int $id, int $reviewerId, ?string $notes = null): DriverDocument
    {
        $driverDocument = DriverDocument::findOrFail($id);
        $driverDocument->approve($reviewerId, $notes);

        return $driverDocument->fresh();
    }

    public function rejectDocument(int $id, int $reviewerId, ?string $notes = null): DriverDocument
    {
        $driverDocument = DriverDocument::findOrFail($id);
        $driverDocument->reject($reviewerId, $notes);

        return $driverDocument->fresh();
    }

    public function updateStatus(int $id, string $status, ?int $reviewerId = null, ?string $notes = null): DriverDocument
    {
        $driverDocument = DriverDocument::findOrFail($id);
        
        $updateData = ['status' => $status];
        
        if ($reviewerId) {
            $updateData['reviewer_id'] = $reviewerId;
        }
        
        if ($notes !== null) {
            $updateData['notes'] = $notes;
        }
        
        $driverDocument->update($updateData);

        return $driverDocument->fresh();
    }
}

