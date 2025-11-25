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
use Modules\Drivers\app\Services\DriverDocumentService;
use Modules\Drivers\app\Models\Driver;
use Modules\RidingCarCompanies\app\Models\RidingCompanyDocumentRequirement;

class DriverDocumentController extends Controller
{
    public function __construct(
        protected DriverDocumentService $driverDocumentService
    ) {}

    public function index(Request $request): Response
    {
        #check if the driver_id is in the request
        if ($request->has('driver_id') && $request->input('driver_id') !== '') {
            $driverId = $request->input('driver_id');
            $driverDocuments = $this->driverDocumentService->getAllDriverDocuments($driverId);
        } else {
        $driverDocuments = $this->driverDocumentService->getAllDriverDocuments();
        }
        return Inertia::render('Drivers/DriverDocuments/Index', [
            'driverDocuments' => $driverDocuments,
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $drivers = Driver::when($companyId, fn($q) => $q->where('company_id', $companyId))->orderBy('full_name')->get();
        $documentTemplates = RidingCompanyDocumentRequirement::active()->orderBy('name')->get();

        return Inertia::render('Drivers/DriverDocuments/Create', [
            'drivers' => $drivers,
            'documentTemplates' => $documentTemplates,
        ]);
    }

    public function store(DriverDocumentStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['status'] = $data['status'] ?? 'pending';

            // Get company_id from driver
            $driver = \Modules\Drivers\app\Models\Driver::findOrFail($data['driver_id']);
            $data['company_id'] = $driver->company_id;

            $this->driverDocumentService->createDriverDocument($data);

            return redirect()
                ->route('drivers.driverdocuments.index')
                ->with('success', 'Driver document created successfully.');
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

    public function edit(int $driverDocument): Response
    {
        $driverDocumentModel = $this->driverDocumentService->getDriverDocumentById($driverDocument);

        if (! $driverDocumentModel) {
            abort(404, 'Driver document not found.');
        }

        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $drivers = Driver::when($companyId, fn($q) => $q->where('company_id', $companyId))->orderBy('full_name')->get();
        $documentTemplates = RidingCompanyDocumentRequirement::active()->orderBy('name')->get();

        return Inertia::render('Drivers/DriverDocuments/Edit', [
            'driverDocument' => $driverDocumentModel,
            'drivers' => $drivers,
            'documentTemplates' => $documentTemplates,
        ]);
    }

    public function update(DriverDocumentUpdateRequest $request, int $driverDocument): RedirectResponse
    {
        try {
            $this->driverDocumentService->updateDriverDocument($driverDocument, $request->validated());

            return redirect()
                ->route('drivers.driverdocuments.index')
                ->with('success', 'Driver document updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $driverDocument): RedirectResponse
    {
        try {
            $this->driverDocumentService->deleteDriverDocument($driverDocument);

            return redirect()
                ->route('drivers.driverdocuments.index')
                ->with('success', 'Driver document deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function destroyAll(Request $request): RedirectResponse
    {
        try {
            $companyId = $this->getCompanyId();
            
            // Get all driver documents (filtered by company if needed)
            $query = \Modules\Drivers\app\Models\DriverDocument::query();
            
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

            return redirect()
                ->route('drivers.driverdocuments.index')
                ->with('success', "Successfully deleted {$count} driver document(s).");
        } catch (\Exception $e) {
            \Log::error('Error deleting all driver documents: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()
                ->back()
                ->with('error', 'Failed to delete all driver documents: ' . $e->getMessage());
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
            \Log::error('Error deleting file: ' . $e->getMessage(), [
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
                'Content-Disposition' => 'inline; filename="' . ($driverDocumentModel->original_filename ?? basename($driverDocumentModel->uploaded_path)) . '"',
            ]);
        } catch (\Exception $e) {
            \Log::error('Error viewing file: ' . $e->getMessage(), [
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
        $driverDocuments = $this->driverDocumentService->getAllDriverDocuments();

        $filename = 'driver_documents_export_' . date('Y-m-d_His') . '.csv';
        
        // Add UTF-8 BOM for Excel compatibility
        $content = "\xEF\xBB\xBF";
        
        // Open output stream
        $output = fopen('php://temp', 'r+');

        fputcsv($output, ['ID', 'Driver', 'Document Template', 'Status', 'Reviewer', 'Created At']);

        foreach ($driverDocuments as $doc) {
            fputcsv($output, [
                $doc->id,
                $doc->driver?->full_name ?? '',
                $doc->documentTemplate?->name ?? '',
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
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
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

