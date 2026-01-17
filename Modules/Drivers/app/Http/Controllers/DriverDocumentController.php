<?php

namespace Modules\Drivers\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Drivers\app\Http\Requests\DriverDocumentStoreRequest;
use Modules\Drivers\app\Http\Requests\DriverDocumentUpdateRequest;
use Modules\Drivers\app\Models\DocumentName;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Services\DriverDocumentService;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

class DriverDocumentController extends Controller
{
    public function __construct(
        protected DriverDocumentService $driverDocumentService
    ) {}

    public function index(Request $request): Response
    {
        $companyId = $this->getCompanyId();

        // Check if document_names table exists
        if (! \Illuminate\Support\Facades\Schema::hasTable('document_names')) {
            // Fallback to old structure if table doesn't exist yet
            return $this->indexLegacy($request);
        }

        // Get all document names (unique)
        $documentNames = DocumentName::orderBy('name')->get();

        // Filter by company if not super admin
        if ($companyId) {
            // Get riding company IDs for this company
            $ridingCompanyIds = RidingCompany::where('company_id', $companyId)->pluck('id')->toArray();

            // Filter document names that have at least one riding company in this company
            $documentNames = $documentNames->filter(function ($documentName) use ($ridingCompanyIds) {
                $docRidingCompanyIds = $documentName->riding_company_ids ?? [];
                if (empty($docRidingCompanyIds)) {
                    return false;
                }

                // Convert to integers for comparison
                $docRidingCompanyIds = array_map('intval', $docRidingCompanyIds);

                // Check if any of the document's riding companies belong to this company
                return ! empty(array_intersect($docRidingCompanyIds, $ridingCompanyIds));
            });
        }

        // Map document names with their riding companies
        $allDocuments = $documentNames->map(function ($documentName) {
            // Convert riding_company_ids to integers if they are strings
            $ridingCompanyIds = $documentName->riding_company_ids ?? [];
            if (! empty($ridingCompanyIds)) {
                $ridingCompanyIds = array_map('intval', $ridingCompanyIds);
            }

            $ridingCompanies = RidingCompany::whereIn('id', $ridingCompanyIds)->get();

            return [
                'id' => $documentName->id,
                'name' => $documentName->name,
                'riding_companies' => $ridingCompanies->map(function ($company) {
                    return [
                        'id' => $company->id,
                        'name' => $company->name,
                    ];
                })->toArray(),
                'type' => $documentName->type,
                'required' => $documentName->required,
                'active' => $documentName->active,
                'created_at' => $documentName->created_at?->toDateTimeString(),
            ];
        })->values(); // Reset keys after filtering

        return Inertia::render('Drivers/DriverDocuments/Index', [
            'driverDocuments' => $allDocuments,
        ]);
    }

    /**
     * Legacy index method for backward compatibility
     */
    private function indexLegacy(Request $request): Response
    {
        $companyId = $this->getCompanyId();

        // Check if name column exists, otherwise use document_name relationship
        $hasNameColumn = Schema::hasColumn('driver_documents', 'name');

        if ($hasNameColumn) {
            // Get unique documents grouped by name and riding_company_id
            $uniqueDocuments = \Modules\Drivers\app\Models\DriverDocument::with(['ridingCompany'])
                ->whereHas('driver', function ($q) use ($companyId) {
                    $q->whereNull('deleted_at');
                    if ($companyId) {
                        $q->where('company_id', $companyId);
                    }
                })
                ->whereNotNull('name')
                ->select('name', 'riding_company_id')
                ->selectRaw('MIN(id) as id')
                ->selectRaw('MIN(created_at) as created_at')
                ->groupBy('name', 'riding_company_id')
                ->orderBy('riding_company_id')
                ->orderBy('name')
                ->get();
        } else {
            // Use document_name relationship if name column doesn't exist
            $uniqueDocuments = \Modules\Drivers\app\Models\DriverDocument::with(['ridingCompany', 'documentName'])
                ->whereHas('driver', function ($q) use ($companyId) {
                    $q->whereNull('deleted_at');
                    if ($companyId) {
                        $q->where('company_id', $companyId);
                    }
                })
                ->whereNotNull('document_name_id')
                ->join('document_names', 'driver_documents.document_name_id', '=', 'document_names.id')
                ->select('document_names.name as name', 'driver_documents.riding_company_id')
                ->selectRaw('MIN(driver_documents.id) as id')
                ->selectRaw('MIN(driver_documents.created_at) as created_at')
                ->groupBy('document_names.name', 'driver_documents.riding_company_id')
                ->orderBy('driver_documents.riding_company_id')
                ->orderBy('document_names.name')
                ->get();
        }

        // Map unique documents
        $allDocuments = $uniqueDocuments->map(function ($doc) use ($hasNameColumn) {
            // Handle both cases: direct name column or from join
            $name = $hasNameColumn ? $doc->name : ($doc->name ?? $doc->documentName?->name ?? null);
            
            return [
                'id' => $doc->id,
                'name' => $name,
                'riding_companies' => $doc->ridingCompany ? [[
                    'id' => $doc->ridingCompany->id,
                    'name' => $doc->ridingCompany->name,
                ]] : [],
                'created_at' => $doc->created_at,
            ];
        });

        return Inertia::render('Drivers/DriverDocuments/Index', [
            'driverDocuments' => $allDocuments,
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $ridingCompanies = RidingCompany::orderBy('name')->get();

        return Inertia::render('Drivers/DriverDocuments/Create', [
            'ridingCompanies' => $ridingCompanies,
        ]);
    }

    public function store(DriverDocumentStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $ridingCompanyIds = $data['riding_company_ids'] ?? [];
            $documentName = $data['name'];
            unset($data['riding_company_ids'], $data['name']);

            $data['status'] = $data['status'] ?? 'pending';
            $data['type'] = $data['type'] ?? 'file';
            $data['required'] = $data['required'] ?? false;
            $data['active'] = $data['active'] ?? true;

            // Check if document_names table exists
            if (! Schema::hasTable('document_names')) {
                return redirect()
                    ->back()
                    ->withInput()
                    ->with('error', 'Please run migrations first: php artisan migrate');
            }

            // Create document name record (unique)
            $documentNameRecord = DocumentName::create([
                'name' => $documentName,
                'riding_company_ids' => $ridingCompanyIds,
                'type' => $data['type'],
                'required' => $data['required'],
                'notes' => $data['notes'] ?? null,
                'status' => $data['status'],
                'active' => $data['active'],
            ]);

            $totalDocumentsCreated = 0;

            // Process each riding company
            foreach ($ridingCompanyIds as $ridingCompanyId) {
                // Get all drivers for the riding company
                $drivers = \Modules\Drivers\app\Models\Driver::where('riding_company_id', $ridingCompanyId)
                    ->whereNull('deleted_at')
                    ->get();

                if (! $drivers->isEmpty()) {
                    // Create documents for all drivers in the riding company
                    $documents = [];
                    foreach ($drivers as $driver) {
                        $documents[] = [
                            'document_name_id' => $documentNameRecord->id,
                            'name' => $documentName, // Keep for backward compatibility
                            'driver_id' => $driver->id,
                            'riding_company_id' => $ridingCompanyId,
                            'status' => $data['status'],
                            'notes' => $data['notes'] ?? null,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }

                    if (! empty($documents)) {
                        \Modules\Drivers\app\Models\DriverDocument::insert($documents);
                        $totalDocumentsCreated += count($documents);
                    }
                }
            }

            // Build success message
            $message = "Document '{$documentName}' created successfully";
            if ($totalDocumentsCreated > 0) {
                $message .= " with {$totalDocumentsCreated} driver document(s)";
            } else {
                $message .= '. No drivers found in selected riding companies yet.';
            }
            $message .= '.';

            return redirect()
                ->route('drivers.driverdocuments.index')
                ->with('success', $message);
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $driverDocument): Response
    {
        $driverDocumentModel = $this->driverDocumentService->getDriverDocumentById($driverDocument);

        if (! $driverDocumentModel) {
            abort(404, 'Driver document not found.');
        }

        // Load activity logs
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($driverDocumentModel)
            ->with('causer:id,name,email')
            ->latest()
            ->get()
            ->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'description' => $activity->description,
                    'event' => $activity->event,
                    'properties' => $activity->properties,
                    'causer' => $activity->causer ? [
                        'id' => $activity->causer->id,
                        'name' => $activity->causer->name,
                        'email' => $activity->causer->email,
                    ] : null,
                    'created_at' => $activity->created_at->toISOString(),
                ];
            });

        return Inertia::render('Drivers/DriverDocuments/Show', [
            'driverDocument' => $driverDocumentModel,
            'activities' => $activities,
        ]);
    }

    public function edit(int $documentName): Response
    {
        // Check if document_names table exists
        if (! Schema::hasTable('document_names')) {
            return redirect()
                ->route('drivers.driverdocuments.index')
                ->with('error', 'Please run migrations first: php artisan migrate');
        }

        $documentNameRecord = DocumentName::findOrFail($documentName);

        $ridingCompanies = RidingCompany::orderBy('name')->get();

        return Inertia::render('Drivers/DriverDocuments/Edit', [
            'documentName' => [
                'id' => $documentNameRecord->id,
                'name' => $documentNameRecord->name,
                'riding_company_ids' => $documentNameRecord->riding_company_ids ?? [],
                'type' => $documentNameRecord->type,
                'required' => $documentNameRecord->required,
                'notes' => $documentNameRecord->notes,
                'status' => $documentNameRecord->status,
                'active' => $documentNameRecord->active,
            ],
            'ridingCompanies' => $ridingCompanies,
        ]);
    }

    public function update(DriverDocumentUpdateRequest $request, int $documentName): RedirectResponse
    {
        try {
            // Check if document_names table exists
            if (! Schema::hasTable('document_names')) {
                return redirect()
                    ->back()
                    ->withInput()
                    ->with('error', 'Please run migrations first: php artisan migrate');
            }

            $data = $request->validated();
            $ridingCompanyIds = $data['riding_company_ids'] ?? [];

            // Get the document name record
            $documentNameRecord = DocumentName::findOrFail($documentName);

            // Get old riding company IDs
            $oldRidingCompanyIds = $documentNameRecord->riding_company_ids ?? [];

            // Update document name
            $documentNameRecord->update([
                'name' => $data['name'],
                'riding_company_ids' => $ridingCompanyIds,
                'type' => $data['type'] ?? $documentNameRecord->type,
                'required' => $data['required'] ?? $documentNameRecord->required,
                'notes' => $data['notes'] ?? $documentNameRecord->notes,
                'status' => $data['status'] ?? $documentNameRecord->status,
                'active' => $data['active'] ?? $documentNameRecord->active,
            ]);

            // Update all related driver documents with new name
            $documentNameRecord->driverDocuments()->update([
                'name' => $data['name'],
            ]);

            // Create driver documents for newly added riding companies
            $newRidingCompanyIds = array_diff($ridingCompanyIds, $oldRidingCompanyIds);
            $totalCreated = 0;

            foreach ($newRidingCompanyIds as $ridingCompanyId) {
                // Get all drivers for this riding company
                $drivers = \Modules\Drivers\app\Models\Driver::where('riding_company_id', $ridingCompanyId)
                    ->whereNull('deleted_at')
                    ->get();

                if (! $drivers->isEmpty()) {
                    $documents = [];
                    foreach ($drivers as $driver) {
                        // Check if document already exists
                        $exists = \Modules\Drivers\app\Models\DriverDocument::where('document_name_id', $documentNameRecord->id)
                            ->where('driver_id', $driver->id)
                            ->where('riding_company_id', $ridingCompanyId)
                            ->exists();

                        if (! $exists) {
                            $documents[] = [
                                'document_name_id' => $documentNameRecord->id,
                                'name' => $data['name'],
                                'driver_id' => $driver->id,
                                'riding_company_id' => $ridingCompanyId,
                                'status' => $data['status'] ?? 'pending',
                                'notes' => $data['notes'] ?? null,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
                    }

                    if (! empty($documents)) {
                        \Modules\Drivers\app\Models\DriverDocument::insert($documents);
                        $totalCreated += count($documents);
                    }
                }
            }

            $message = "Document '{$data['name']}' updated successfully";
            if ($totalCreated > 0) {
                $message .= " with {$totalCreated} new driver document(s) created";
            }
            $message .= '.';

            return redirect()
                ->route('drivers.driverdocuments.index')
                ->with('success', $message);
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $documentName): RedirectResponse
    {
        try {
            // Check if document_names table exists
            if (! Schema::hasTable('document_names')) {
                return redirect()
                    ->back()
                    ->with('error', 'Please run migrations first: php artisan migrate');
            }

            // Delete document name (this will cascade delete all related driver documents)
            $documentNameRecord = DocumentName::findOrFail($documentName);
            $name = $documentNameRecord->name;

            // Get count of related driver documents before deletion
            $relatedDocumentsCount = $documentNameRecord->driverDocuments()->count();

            // Delete the document name (cascade will delete driver documents)
            $documentNameRecord->delete();

            return redirect()
                ->route('drivers.driverdocuments.index')
                ->with('success', "Document '{$name}' and {$relatedDocumentsCount} related driver document(s) deleted successfully.");
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function destroyAll(Request $request): RedirectResponse
    {
        try {
            // Check if document_names table exists
            if (! Schema::hasTable('document_names')) {
                return redirect()
                    ->back()
                    ->with('error', 'Please run migrations first: php artisan migrate');
            }

            $companyId = $this->getCompanyId();

            // Get all document names (filtered by company if needed)
            $query = DocumentName::query();

            if ($companyId) {
                // Get riding company IDs for this company
                $ridingCompanyIds = RidingCompany::where('company_id', $companyId)->pluck('id')->toArray();

                if (! empty($ridingCompanyIds)) {
                    // Filter document names that have at least one riding company in this company
                    $query->where(function ($q) use ($ridingCompanyIds) {
                        foreach ($ridingCompanyIds as $ridingCompanyId) {
                            $q->orWhereJsonContains('riding_company_ids', $ridingCompanyId);
                        }
                    });
                } else {
                    // No riding companies for this company
                    return redirect()
                        ->route('drivers.driverdocuments.index')
                        ->with('success', 'No documents to delete.');
                }
            }

            $documentNames = $query->get();
            $count = $documentNames->count();

            // Delete all document names (this will cascade delete all related driver documents)
            foreach ($documentNames as $documentName) {
                $documentName->delete();
            }

            return redirect()
                ->route('drivers.driverdocuments.index')
                ->with('success', "Successfully deleted {$count} document name(s) and all related driver documents.");
        } catch (\Exception $e) {
            \Log::error('Error deleting all driver documents: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()
                ->back()
                ->with('error', 'Failed to delete all driver documents: '.$e->getMessage());
        }
    }

    public function deleteByNameAndCompany(Request $request): \Illuminate\Http\JsonResponse|RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string'],
            'riding_company_id' => ['required', 'exists:riding_companies,id'],
        ]);

        try {
            $companyId = $this->getCompanyId();

            // Check if name column exists, otherwise use document_name relationship
            $hasNameColumn = Schema::hasColumn('driver_documents', 'name');

            // Get all documents with the same name and riding_company_id
            if ($hasNameColumn) {
                $query = \Modules\Drivers\app\Models\DriverDocument::where('name', $request->name)
                    ->where('riding_company_id', $request->riding_company_id);
            } else {
                $query = \Modules\Drivers\app\Models\DriverDocument::whereHas('documentName', function ($q) use ($request) {
                    $q->where('name', $request->name);
                })
                    ->where('riding_company_id', $request->riding_company_id);
            }

            if ($companyId) {
                $query->whereHas('driver', function ($q) use ($companyId) {
                    $q->where('company_id', $companyId);
                });
            }

            $driverDocuments = $query->get();
            $count = $driverDocuments->count();

            // Delete all documents (this will trigger the boot method to delete files)
            foreach ($driverDocuments as $document) {
                $document->delete();
            }

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => "Successfully deleted {$count} driver document(s).",
                ]);
            }

            return redirect()
                ->route('drivers.driverdocuments.index')
                ->with('success', "Successfully deleted {$count} driver document(s).");
        } catch (\Exception $e) {
            \Log::error('Error deleting driver documents by name and company: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return redirect()
                ->back()
                ->with('error', 'Failed to delete driver documents: '.$e->getMessage());
        }
    }

    public function upload(Request $request, int $driverDocument): \Illuminate\Http\JsonResponse|RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:10240'], // 10MB max, images and PDF only
        ]);

        try {
            $driverDocumentModel = $this->driverDocumentService->getDriverDocumentById($driverDocument);
            $driver = $driverDocumentModel->driver;

            $this->driverDocumentService->uploadFile(
                $driverDocument,
                $request->file('file'),
                $driver->id,
                $driver->company_id
            );

            $driverDocumentModel->refresh();

            if ($request->expectsJson() || $request->wantsJson()) {
                $responseData = [
                    'success' => true,
                    'message' => 'File uploaded successfully.',
                    'document' => [
                        'id' => $driverDocumentModel->id,
                        'uploaded_path' => $driverDocumentModel->uploaded_path,
                        'file_url' => $driverDocumentModel->getFileUrl(),
                    ],
                ];

                // Only include original_filename if column exists
                if (Schema::hasColumn('driver_documents', 'original_filename')) {
                    $responseData['document']['original_filename'] = $driverDocumentModel->original_filename;
                }

                return response()->json($responseData);
            }

            return redirect()
                ->back()
                ->with('success', 'File uploaded successfully.');
        } catch (\Exception $e) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function deleteFile(int $driverDocument): \Illuminate\Http\JsonResponse|RedirectResponse
    {
        try {
            $driverDocumentModel = $this->driverDocumentService->getDriverDocumentById($driverDocument);

            if (! $driverDocumentModel) {
                if (request()->expectsJson() || request()->wantsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Document not found.',
                    ], 404);
                }
                abort(404, 'Document not found.');
            }

            // Clear file reference from database (even if file doesn't exist on disk)
            $hadFile = ! empty($driverDocumentModel->uploaded_path);

            // Try to delete file from storage if it exists
            if ($hadFile && Storage::disk('public')->exists($driverDocumentModel->uploaded_path)) {
                Storage::disk('public')->delete($driverDocumentModel->uploaded_path);
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

            $driverDocumentModel->update($updateData);

            // Refresh to get updated data
            $driverDocumentModel->refresh();

            if (request()->expectsJson() || request()->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'File deleted successfully.',
                ]);
            }

            return redirect()
                ->back()
                ->with('success', 'File deleted successfully.');
        } catch (\Exception $e) {
            \Log::error('Error deleting file: '.$e->getMessage(), [
                'driver_document_id' => $driverDocument,
                'trace' => $e->getTraceAsString(),
            ]);

            if (request()->expectsJson() || request()->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function view(int $driverDocument): \Symfony\Component\HttpFoundation\StreamedResponse|\Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        try {
            $driverDocumentModel = $this->driverDocumentService->getDriverDocumentById($driverDocument);

            if (! $driverDocumentModel) {
                abort(404, 'Document not found.');
            }

            // Check if file path exists in database first
            if (empty($driverDocumentModel->uploaded_path)) {
                abort(404, 'File not found.');
            }

            // Then check if file exists on disk
            if (! Storage::disk('public')->exists($driverDocumentModel->uploaded_path)) {
                abort(404, 'File does not exist on disk.');
            }

            // Use Storage::path for local filesystem
            $filePath = Storage::disk('public')->path($driverDocumentModel->uploaded_path);

            if (! file_exists($filePath)) {
                \Log::error('File not found on disk', [
                    'driver_document_id' => $driverDocument,
                    'uploaded_path' => $driverDocumentModel->uploaded_path,
                    'file_path' => $filePath,
                ]);
                abort(404, 'File does not exist on disk.');
            }

            $mimeType = Storage::disk('public')->mimeType($driverDocumentModel->uploaded_path) ?? 'application/octet-stream';

            return response()->file($filePath, [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'inline; filename="'.($driverDocumentModel->original_filename ?? basename($driverDocumentModel->uploaded_path)).'"',
            ]);
        } catch (\Exception $e) {
            \Log::error('Error viewing file: '.$e->getMessage(), [
                'driver_document_id' => $driverDocument,
                'trace' => $e->getTraceAsString(),
            ]);
            abort(404, 'File not found.');
        }
    }

    public function approve(Request $request, int $driverDocument): RedirectResponse
    {
        $request->validate([
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $this->driverDocumentService->approveDocument($driverDocument, Auth::id(), $request->notes);

            return redirect()
                ->back()
                ->with('success', 'Document approved successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function reject(Request $request, int $driverDocument): RedirectResponse
    {
        $request->validate([
            'notes' => ['nullable', 'string'],
        ]);

        try {
            $this->driverDocumentService->rejectDocument($driverDocument, Auth::id(), $request->notes);

            return redirect()
                ->back()
                ->with('success', 'Document rejected.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function updateStatus(Request $request, int $driverDocument): \Illuminate\Http\JsonResponse|RedirectResponse
    {
        $request->validate([
            'status' => ['required', 'string', 'in:pending,approved,rejected'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            // Check if document has uploaded file
            $document = \Modules\Drivers\app\Models\DriverDocument::findOrFail($driverDocument);
            
            if (!$document->uploaded_path) {
                if ($request->expectsJson() || $request->wantsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot update status. File must be uploaded first.',
                    ], 400);
                }

                return redirect()
                    ->back()
                    ->with('error', 'Cannot update status. File must be uploaded first.');
            }

            $this->driverDocumentService->updateStatus(
                $driverDocument,
                $request->status,
                Auth::id(),
                $request->notes
            );

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Document status updated successfully.',
                ]);
            }

            return redirect()
                ->back()
                ->with('success', 'Document status updated successfully.');
        } catch (\Exception $e) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function download(int $driverDocument): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $driverDocumentModel = $this->driverDocumentService->getDriverDocumentById($driverDocument);

        if (! $driverDocumentModel || ! $driverDocumentModel->hasFile()) {
            abort(404, 'File not found.');
        }

        return Storage::disk('public')->download(
            $driverDocumentModel->uploaded_path,
            $driverDocumentModel->original_filename ?? basename($driverDocumentModel->uploaded_path)
        );
    }

    public function export(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $companyId = $this->getCompanyId();
        $driverDocuments = $this->driverDocumentService->getAllDriverDocuments(null, $companyId);

        $filename = 'driver_documents_export_'.date('Y-m-d_His').'.csv';

        // Add UTF-8 BOM for Excel compatibility
        $content = "\xEF\xBB\xBF";

        // Open output stream
        $output = fopen('php://temp', 'r+');

        fputcsv($output, ['ID', 'Driver', 'Riding Company', 'Status', 'Reviewer', 'Created At']);

        foreach ($driverDocuments as $doc) {
            fputcsv($output, [
                $doc->id,
                $doc->driver?->full_name ?? '',
                $doc->ridingCompany?->name ?? '',
                $doc->status,
                $doc->reviewer?->name ?? '',
                $doc->created_at,
            ]);
        }

        rewind($output);
        $content .= stream_get_contents($output);
        fclose($output);

        $response = response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);

        // Prevent Inertia from processing this response
        $response->headers->remove('X-Inertia');
        $response->headers->set('X-Inertia', 'false');
        $response->headers->set('Cache-Control', 'no-cache, must-revalidate');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');

        return $response;
    }
}
