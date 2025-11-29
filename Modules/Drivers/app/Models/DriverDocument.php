<?php

namespace Modules\Drivers\app\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Modules\RidingCarCompanies\app\Models\RidingCompanyDocumentRequirement;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class DriverDocument extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'driver_id',
        'document_template_id',
        'uploaded_path',
        'original_filename',
        'status',
        'reviewer_id',
        'notes',
    ];

    protected static function newFactory()
    {
        return \Modules\Drivers\database\factories\DriverDocumentFactory::new();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'uploaded_path', 'reviewer_id', 'notes'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    // Relationships
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function documentTemplate(): BelongsTo
    {
        return $this->belongsTo(RidingCompanyDocumentRequirement::class, 'document_template_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    // Helper methods
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    public function approve(int $reviewerId, ?string $notes = null): void
    {
        $this->update([
            'status' => 'approved',
            'reviewer_id' => $reviewerId,
            'notes' => $notes,
        ]);
    }

    public function reject(int $reviewerId, ?string $notes = null): void
    {
        $this->update([
            'status' => 'rejected',
            'reviewer_id' => $reviewerId,
            'notes' => $notes,
        ]);
    }

    // File upload methods
    public function uploadFile(UploadedFile $file, int $driverId, int $companyId): string
    {
        // Delete old file if exists
        if ($this->uploaded_path && Storage::disk('public')->exists($this->uploaded_path)) {
            Storage::disk('public')->delete($this->uploaded_path);
        }

        // Determine file type from document template
        $documentType = $this->documentTemplate?->type ?? 'file';
        $extension = $file->getClientOriginalExtension();
        $originalFilename = $file->getClientOriginalName();

        // Store file with organized path: drivers/{company_id}/{driver_id}/{document_type}/{filename}
        $path = $file->storeAs(
            "drivers/{$companyId}/{$driverId}/{$documentType}",
            $this->id . '_' . time() . '.' . $extension,
            'public'
        );

        $updateData = [
            'uploaded_path' => $path,
            'status' => 'pending', // Reset to pending when new file is uploaded
            'reviewer_id' => null,
            'notes' => null,
        ];
        
        // Only include original_filename if column exists
        if (Schema::hasColumn('driver_documents', 'original_filename')) {
            $updateData['original_filename'] = $originalFilename;
        }
        
        $this->update($updateData);

        return $path;
    }

    public function deleteFile(): bool
    {
        if ($this->uploaded_path) {
            // Try to delete file from storage if it exists
            if (Storage::disk('public')->exists($this->uploaded_path)) {
                Storage::disk('public')->delete($this->uploaded_path);
            }
            
            // Always update the database to clear the file reference
            $updateData = [
                'uploaded_path' => null,
                'status' => 'pending',
                'reviewer_id' => null,
                'notes' => null,
            ];
            
            // Only include original_filename if column exists
            if (Schema::hasColumn('driver_documents', 'original_filename')) {
                $updateData['original_filename'] = null;
            }
            
            $this->update($updateData);

            return true;
        }

        return false;
    }

    public function getFileUrl(): ?string
    {
        if (! $this->uploaded_path) {
            return null;
        }

        return Storage::disk('public')->url($this->uploaded_path);
    }

    public function hasFile(): bool
    {
        return ! empty($this->uploaded_path) && Storage::disk('public')->exists($this->uploaded_path);
    }

    protected static function boot(): void
    {
        parent::boot();

        // Delete file when document is deleted
        static::deleting(function ($document) {
            if ($document->uploaded_path && Storage::disk('public')->exists($document->uploaded_path)) {
                Storage::disk('public')->delete($document->uploaded_path);
            }
        });
    }
}

