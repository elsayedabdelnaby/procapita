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
use Modules\Core\app\Models\Company;
use Modules\Drivers\app\Models\Driver;
use Modules\Drivers\app\Services\DriverDocumentService;

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

        // Get all document names; filter by reseller (company) in PHP to avoid JSON query issues
        $documentNames = DocumentName::orderBy('name')->get();
        $hasCompanyIdsColumn = \Illuminate\Support\Facades\Schema::hasColumn('document_names', 'company_ids');

        if ($companyId && $hasCompanyIdsColumn) {
            $documentNames = $documentNames->filter(function ($documentName) use ($companyId) {
                $ids = $documentName->company_ids;
                if ($ids === null || $ids === []) {
                    return false;
                }
                $ids = array_map('intval', (array) $ids);
                return in_array((int) $companyId, $ids, true);
            });
        }

        // Map document names with their resellers (companies) - always resolve company_ids to names
        $allDocuments = $documentNames->map(function ($documentName) use ($hasCompanyIdsColumn) {
            $companyIds = [];
            if ($hasCompanyIdsColumn && $documentName->company_ids !== null) {
                $companyIds = array_map('intval', (array) $documentName->company_ids);
            }
            $companies = $companyIds ? Company::whereIn('id', $companyIds)->get(['id', 'name']) : collect();

            return [
                'id' => $documentName->id,
                'name' => $documentName->name,
                'resellers' => $companies->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->values()->toArray(),
                'type' => $documentName->type,
                'required' => $documentName->required,
                'active' => $documentName->active,
                'created_at' => $documentName->created_at?->toDateTimeString(),
            ];
        })->values();

        return Inertia::render('Drivers/DriverDocuments/Index', [
            'driverDocuments' => $allDocuments,
        ]);
    }

    public function recycleBin(): Response
    {
        $companyId = $this->getCompanyId();

        $query = \Modules\Drivers\app\Models\DriverDocument::onlyTrashed()->with(['driver', 'driver.company']);

        if ($companyId) {
            $query->whereHas('driver', fn ($q) => $q->where('company_id', $companyId));
        }

        $driverDocuments = $query->orderBy('deleted_at', 'desc')->get();

        return Inertia::render('Drivers/DriverDocuments/RecycleBin', [
            'driverDocuments' => $driverDocuments->map(fn ($doc) => [
                'id' => $doc->id,
                'driver_id' => $doc->driver_id,
                'driver' => $doc->driver ? [
                    'id' => $doc->driver->id,
                    'full_name' => $doc->driver->full_name,
                ] : null,
                'name' => $doc->name ?? ($doc->documentName?->name ?? null),
                'reseller' => $doc->driver?->company ? [
                    'id' => $doc->driver->company->id,
                    'name' => $doc->driver->company->name,
                ] : null,
                'status' => $doc->status,
                'uploaded_path' => $doc->uploaded_path,
                'original_filename' => $doc->original_filename,
                'created_at' => $doc->created_at?->toISOString(),
                'updated_at' => $doc->updated_at?->toISOString(),
                'deleted_at' => $doc->deleted_at?->toISOString(),
            ]),
        ]);
    }

    /**
     * Legacy index method for backward compatibility
     */
    private function indexLegacy(Request $request): Response
    {
        $companyId = $this->getCompanyId();
        $hasNameColumn = Schema::hasColumn('driver_documents', 'name');
        $driverDocTable = \Modules\Drivers\app\Models\DriverDocument::query()
            ->whereHas('driver', function ($q) use ($companyId) {
                $q->whereNull('deleted_at');
                if ($companyId) {
                    $q->where('company_id', $companyId);
                }
            });

        if ($hasNameColumn) {
            $rows = $driverDocTable->clone()
                ->join('drivers', 'driver_documents.driver_id', '=', 'drivers.id')
                ->whereNotNull('driver_documents.name')
                ->select('driver_documents.name as name', 'drivers.company_id')
                ->selectRaw('MIN(driver_documents.id) as id')
                ->selectRaw('MIN(driver_documents.created_at) as created_at')
                ->groupBy('driver_documents.name', 'drivers.company_id')
                ->orderBy('drivers.company_id')
                ->orderBy('driver_documents.name')
                ->get();
        } else {
            $rows = $driverDocTable->clone()
                ->join('drivers', 'driver_documents.driver_id', '=', 'drivers.id')
                ->join('document_names', 'driver_documents.document_name_id', '=', 'document_names.id')
                ->whereNotNull('driver_documents.document_name_id')
                ->select('document_names.name as name', 'drivers.company_id')
                ->selectRaw('MIN(driver_documents.id) as id')
                ->selectRaw('MIN(driver_documents.created_at) as created_at')
                ->groupBy('document_names.name', 'drivers.company_id')
                ->orderBy('drivers.company_id')
                ->orderBy('document_names.name')
                ->get();
        }

        $companyIds = $rows->pluck('company_id')->unique()->filter()->values();
        $companies = $companyIds->isNotEmpty() ? Company::whereIn('id', $companyIds)->get()->keyBy('id') : collect();

        $allDocuments = $rows->map(function ($row) use ($companies) {
            $resellers = [];
            if ($row->company_id && $companies->has($row->company_id)) {
                $c = $companies->get($row->company_id);
                $resellers = [['id' => $c->id, 'name' => $c->name]];
            }
            return [
                'id' => $row->id,
                'name' => $row->name,
                'resellers' => $resellers,
                'created_at' => $row->created_at,
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
        $companies = $user->isSuperAdmin()
            ? Company::orderBy('name')->get(['id', 'name'])
            : Company::when($companyId, fn ($q) => $q->where('id', $companyId))->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Drivers/DriverDocuments/Create', [
            'resellers' => $companies->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->toArray(),
        ]);
    }

    public function store(DriverDocumentStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $companyIds = array_map('intval', (array) ($data['company_ids'] ?? $data['riding_company_ids'] ?? []));
            $documentName = $data['name'];
            unset($data['company_ids'], $data['riding_company_ids'], $data['name']);

            $data['status'] = $data['status'] ?? 'pending';
            $data['type'] = $data['type'] ?? 'file';
            $data['required'] = $data['required'] ?? false;
            $data['active'] = $data['active'] ?? true;

            if (! Schema::hasTable('document_names')) {
                return redirect()
                    ->back()
                    ->withInput()
                    ->with('error', 'Please run migrations first: php artisan migrate');
            }

            $createPayload = [
                'name' => $documentName,
                'type' => $data['type'],
                'required' => $data['required'],
                'notes' => $data['notes'] ?? null,
                'status' => $data['status'],
                'active' => $data['active'],
            ];
            if (Schema::hasColumn('document_names', 'company_ids')) {
                $createPayload['company_ids'] = $companyIds;
            }
            $documentNameRecord = DocumentName::create($createPayload);

            $totalDocumentsCreated = 0;
            foreach ($companyIds as $cid) {
                $drivers = Driver::where('company_id', $cid)->whereNull('deleted_at')->get();
                $existing = \Modules\Drivers\app\Models\DriverDocument::where('document_name_id', $documentNameRecord->id)
                    ->whereIn('driver_id', $drivers->pluck('id'))
                    ->pluck('driver_id')
                    ->toArray();
                $documents = [];
                foreach ($drivers as $driver) {
                    if (in_array($driver->id, $existing, true)) {
                        continue;
                    }
                    $documents[] = [
                        'document_name_id' => $documentNameRecord->id,
                        'driver_id' => $driver->id,
                        'status' => $data['status'],
                        'notes' => $data['notes'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if ($documents !== []) {
                    \Modules\Drivers\app\Models\DriverDocument::insert($documents);
                    $totalDocumentsCreated += count($documents);
                }
            }

            $message = "Document '{$documentName}' created successfully";
            if ($totalDocumentsCreated > 0) {
                $message .= " with {$totalDocumentsCreated} driver document(s)";
            } else {
                $message .= '. No drivers found for selected resellers yet.';
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
        if (! Schema::hasTable('document_names')) {
            return redirect()
                ->route('drivers.driverdocuments.index')
                ->with('error', 'Please run migrations first: php artisan migrate');
        }

        $documentNameRecord = DocumentName::findOrFail($documentName);
        $user = Auth::user();
        $companyId = $this->getCompanyId();
        $companies = $user->isSuperAdmin()
            ? Company::orderBy('name')->get(['id', 'name'])
            : Company::when($companyId, fn ($q) => $q->where('id', $companyId))->orderBy('name')->get(['id', 'name']);
        $hasCompanyIdsColumn = Schema::hasColumn('document_names', 'company_ids');

        return Inertia::render('Drivers/DriverDocuments/Edit', [
            'documentName' => [
                'id' => $documentNameRecord->id,
                'name' => $documentNameRecord->name,
                'company_ids' => $hasCompanyIdsColumn ? ($documentNameRecord->company_ids ?? []) : [],
                'type' => $documentNameRecord->type,
                'required' => $documentNameRecord->required,
                'notes' => $documentNameRecord->notes,
                'status' => $documentNameRecord->status,
                'active' => $documentNameRecord->active,
            ],
            'resellers' => $companies->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->toArray(),
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
            $companyIds = array_map('intval', (array) ($data['company_ids'] ?? $data['riding_company_ids'] ?? []));
            $hasCompanyIdsColumn = Schema::hasColumn('document_names', 'company_ids');
            $documentNameRecord = DocumentName::findOrFail($documentName);
            $oldCompanyIds = $hasCompanyIdsColumn ? array_map('intval', (array) ($documentNameRecord->company_ids ?? [])) : [];

            $updatePayload = [
                'name' => $data['name'],
                'type' => $data['type'] ?? $documentNameRecord->type,
                'required' => $data['required'] ?? $documentNameRecord->required,
                'notes' => $data['notes'] ?? $documentNameRecord->notes,
                'status' => $data['status'] ?? $documentNameRecord->status,
                'active' => $data['active'] ?? $documentNameRecord->active,
            ];
            if ($hasCompanyIdsColumn) {
                $updatePayload['company_ids'] = $companyIds;
            }
            $documentNameRecord->update($updatePayload);

            $newCompanyIds = array_values(array_diff($companyIds, $oldCompanyIds));
            $totalCreated = 0;
            foreach ($newCompanyIds as $cid) {
                $drivers = Driver::where('company_id', $cid)->whereNull('deleted_at')->get();
                $existing = \Modules\Drivers\app\Models\DriverDocument::where('document_name_id', $documentNameRecord->id)
                    ->whereIn('driver_id', $drivers->pluck('id'))
                    ->pluck('driver_id')
                    ->toArray();
                $documents = [];
                foreach ($drivers as $driver) {
                    if (in_array($driver->id, $existing, true)) {
                        continue;
                    }
                    $documents[] = [
                        'document_name_id' => $documentNameRecord->id,
                        'driver_id' => $driver->id,
                        'status' => $data['status'] ?? 'pending',
                        'notes' => $data['notes'] ?? null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
                if ($documents !== []) {
                    \Modules\Drivers\app\Models\DriverDocument::insert($documents);
                    $totalCreated += count($documents);
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

            $query = DocumentName::query();
            $hasCompanyIdsColumn = Schema::hasColumn('document_names', 'company_ids');

            if ($companyId && $hasCompanyIdsColumn) {
                $query->where(function ($q) use ($companyId) {
                    $q->whereJsonContains('company_ids', $companyId)
                        ->orWhereJsonContains('company_ids', (string) $companyId);
                });
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
            'company_id' => ['required', 'integer', 'exists:companies,id'],
        ]);

        try {
            $companyId = $this->getCompanyId();

            $query = \Modules\Drivers\app\Models\DriverDocument::whereHas('documentName', fn ($q) => $q->where('name', $request->name))
                ->whereHas('driver', function ($q) use ($request, $companyId) {
                    $q->where('company_id', $request->company_id);
                    if ($companyId) {
                        $q->where('company_id', $companyId);
                    }
                });

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

        fputcsv($output, ['ID', 'Driver', 'Reseller', 'Status', 'Reviewer', 'Created At']);

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

    protected function getCompanyId(): ?int
    {
        $user = Auth::user();
        if ($user && $user->is_super_admin) {
            return null; // Super admin can see all
        }
        return $user?->company_id;
    }
}
