<?php

namespace Modules\Drivers\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

    public function index(): Response
    {
        $driverDocuments = $this->driverDocumentService->getAllDriverDocuments();

        return Inertia::render('Drivers/DriverDocuments/Index', [
            'driverDocuments' => $driverDocuments,
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;

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

        return Inertia::render('Drivers/DriverDocuments/Show', [
            'driverDocument' => $driverDocumentModel,
        ]);
    }

    public function edit(int $driverDocument): Response
    {
        $driverDocumentModel = $this->driverDocumentService->getDriverDocumentById($driverDocument);

        if (! $driverDocumentModel) {
            abort(404, 'Driver document not found.');
        }

        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;

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

    public function upload(Request $request, int $driverDocument): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'], // 10MB max
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

            return redirect()
                ->back()
                ->with('success', 'File uploaded successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
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

    public function download(int $driverDocument): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $driverDocumentModel = $this->driverDocumentService->getDriverDocumentById($driverDocument);

        if (! $driverDocumentModel || ! $driverDocumentModel->hasFile()) {
            abort(404, 'File not found.');
        }

        return Storage::download($driverDocumentModel->uploaded_path);
    }

    public function export(): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $driverDocuments = $this->driverDocumentService->getAllDriverDocuments();

        $filename = 'driver_documents_export_' . date('Y-m-d_His') . '.csv';
        $file = fopen('php://temp', 'r+');

        fputcsv($file, ['ID', 'Driver', 'Document Template', 'Status', 'Reviewer', 'Created At']);

        foreach ($driverDocuments as $doc) {
            fputcsv($file, [
                $doc->id,
                $doc->driver?->full_name ?? '',
                $doc->documentTemplate?->name ?? '',
                $doc->status,
                $doc->reviewer?->name ?? '',
                $doc->created_at,
            ]);
        }

        rewind($file);
        $content = stream_get_contents($file);
        fclose($file);

        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}

