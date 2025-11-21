<?php

namespace Modules\Drivers\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\Drivers\app\Http\Requests\LeadStatusStoreRequest;
use Modules\Drivers\app\Http\Requests\LeadStatusUpdateRequest;
use Modules\Drivers\app\Services\LeadStatusService;

class LeadStatusController extends Controller
{
    public function __construct(
        protected LeadStatusService $leadStatusService
    ) {}

    public function index(): Response
    {
        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;

        $leadStatuses = $this->leadStatusService->getAllLeadStatuses($companyId);

        return Inertia::render('Drivers/LeadStatuses/Index', [
            'leadStatuses' => $leadStatuses,
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companies = $user->isSuperAdmin() ? Company::active()->orderBy('name')->get() : null;

        return Inertia::render('Drivers/LeadStatuses/Create', [
            'companies' => $companies,
        ]);
    }

    public function store(LeadStatusStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $user = Auth::user();

            if (! $user->isSuperAdmin()) {
                $data['company_id'] = $user->company_id;
            }

            $data['active'] = $data['active'] ?? true;
            $data['order'] = $data['order'] ?? 0;

            $this->leadStatusService->createLeadStatus($data);

            return redirect()
                ->route('drivers.leadstatuses.index')
                ->with('success', 'Lead status created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $leadStatus): Response
    {
        $leadStatusModel = $this->leadStatusService->getLeadStatusById($leadStatus);

        if (! $leadStatusModel) {
            abort(404, 'Lead status not found.');
        }

        return Inertia::render('Drivers/LeadStatuses/Show', [
            'leadStatus' => $leadStatusModel,
        ]);
    }

    public function edit(int $leadStatus): Response
    {
        $leadStatusModel = $this->leadStatusService->getLeadStatusById($leadStatus);

        if (! $leadStatusModel) {
            abort(404, 'Lead status not found.');
        }

        $user = Auth::user();
        $companies = $user->isSuperAdmin() ? Company::active()->orderBy('name')->get() : null;

        return Inertia::render('Drivers/LeadStatuses/Edit', [
            'leadStatus' => $leadStatusModel,
            'companies' => $companies,
        ]);
    }

    public function update(LeadStatusUpdateRequest $request, int $leadStatus): RedirectResponse
    {
        try {
            $this->leadStatusService->updateLeadStatus($leadStatus, $request->validated());

            return redirect()
                ->route('drivers.leadstatuses.index')
                ->with('success', 'Lead status updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $leadStatus): RedirectResponse
    {
        try {
            $this->leadStatusService->deleteLeadStatus($leadStatus);

            return redirect()
                ->route('drivers.leadstatuses.index')
                ->with('success', 'Lead status deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function toggleActive(int $leadStatus): RedirectResponse
    {
        try {
            $this->leadStatusService->toggleActive($leadStatus);

            return redirect()
                ->back()
                ->with('success', 'Lead status updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function export(): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;
        $leadStatuses = $this->leadStatusService->getAllLeadStatuses($companyId);

        $filename = 'lead_statuses_export_' . date('Y-m-d_His') . '.csv';
        $file = fopen('php://temp', 'r+');

        fputcsv($file, ['ID', 'Name', 'Slug', 'Color', 'Order', 'Active', 'Created At']);

        foreach ($leadStatuses as $status) {
            fputcsv($file, [
                $status->id,
                $status->name,
                $status->slug,
                $status->color ?? '',
                $status->order,
                $status->active ? 'Yes' : 'No',
                $status->created_at,
            ]);
        }

        rewind($file);
        $content = stream_get_contents($file);
        fclose($file);

        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function import(): Response
    {
        return Inertia::render('Drivers/LeadStatuses/Import');
    }

    public function importStore(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ]);

        try {
            // TODO: Implement CSV import logic
            return redirect()
                ->route('drivers.leadstatuses.index')
                ->with('success', 'Lead statuses imported successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

