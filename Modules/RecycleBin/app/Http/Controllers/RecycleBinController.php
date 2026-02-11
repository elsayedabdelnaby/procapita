<?php

namespace Modules\RecycleBin\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Modules\RecycleBin\app\Services\RecycleBinService;

class RecycleBinController extends Controller
{
    public function __construct(
        protected RecycleBinService $recycleBinService
    ) {}

    /**
     * Display a listing of all deleted records grouped by model type
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;

        $modelType = $request->get('type');
        
        if ($modelType) {
            // For drivers, redirect to the dedicated Drivers RecycleBin page
            if ($modelType === 'drivers') {
                return redirect()->route('leads.leads.recycle-bin');
            }

            // Riding Companies recycle bin is hidden for all users (including admin)
            if ($modelType === 'riding_companies') {
                return redirect()->route('recyclebin.index');
            }

            // Show records for a specific model type
            $records = $this->recycleBinService->getDeletedRecords($modelType, $companyId);
            $models = $this->recycleBinService->getAvailableModels();
            $config = $models[$modelType] ?? null;

            return Inertia::render('RecycleBin/Index', [
                'modelType' => $modelType,
                'modelName' => $config['name'] ?? $modelType,
                'records' => $records->map(function ($record) use ($config) {
                    return [
                        'id' => $record->id,
                        'display_name' => $record->{$config['display_field']} ?? 'N/A',
                        'deleted_at' => $record->deleted_at?->format('Y-m-d H:i:s'),
                        'deleted_at_human' => $record->deleted_at?->diffForHumans(),
                        'deleted_by' => $this->recycleBinService->getDeletedBy($record),
                    ];
                }),
                'availableModels' => collect($this->recycleBinService->getAvailableModels())->map(function ($config, $key) {
                    return [
                        'key' => $key,
                        'name' => $config['name'],
                        'module' => $config['module'],
                    ];
                })->values(),
            ]);
        }

        // Show overview of all deleted records
        $allDeleted = $this->recycleBinService->getAllDeletedRecords($companyId);

        return Inertia::render('RecycleBin/Overview', [
            'deletedRecords' => $allDeleted,
            'availableModels' => collect($this->recycleBinService->getAvailableModels())->map(function ($config, $key) {
                return [
                    'key' => $key,
                    'name' => $config['name'],
                    'module' => $config['module'],
                ];
            })->values(),
        ]);
    }

    /**
     * Restore a deleted record
     */
    public function restore(Request $request, string $modelType, int $id): RedirectResponse
    {
        $user = Auth::user();
        
        $success = $this->recycleBinService->restoreRecord($modelType, $id, $user->id);

        if ($success) {
            return redirect()
                ->back()
                ->with('success', 'Record restored successfully.');
        }

        return redirect()
            ->back()
            ->with('error', 'Failed to restore record.');
    }

    /**
     * Restore multiple deleted records
     */
    public function restoreMultiple(Request $request, string $modelType): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'integer'],
        ]);

        $user = Auth::user();
        $successCount = 0;
        $failCount = 0;

        foreach ($request->ids as $id) {
            $success = $this->recycleBinService->restoreRecord($modelType, $id, $user->id);
            if ($success) {
                $successCount++;
            } else {
                $failCount++;
            }
        }

        if ($successCount > 0) {
            $message = "{$successCount} record(s) restored successfully.";
            if ($failCount > 0) {
                $message .= " {$failCount} record(s) failed to restore.";
            }
            return redirect()
                ->back()
                ->with('success', $message);
        }

        return redirect()
            ->back()
            ->with('error', 'Failed to restore records.');
    }

    /**
     * Permanently delete a record
     */
    public function forceDelete(Request $request, string $modelType, int $id): RedirectResponse
    {
        $user = Auth::user();
        
        $success = $this->recycleBinService->forceDeleteRecord($modelType, $id, $user->id);

        if ($success) {
            return redirect()
                ->back()
                ->with('success', 'Record permanently deleted.');
        }

        return redirect()
            ->back()
            ->with('error', 'Failed to permanently delete record.');
    }

    /**
     * Get record details
     */
    public function show(string $modelType, int $id): Response
    {
        $details = $this->recycleBinService->getRecordDetails($modelType, $id);

        if (!$details) {
            abort(404, 'Record not found.');
        }

        return Inertia::render('RecycleBin/Show', [
            'record' => $details,
        ]);
    }
}
