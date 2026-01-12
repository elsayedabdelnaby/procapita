<?php

namespace Modules\Drivers\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Drivers\app\Models\DriverList;
use Modules\Drivers\app\Services\DriverListService;

class DriverListController extends Controller
{
    public function __construct(
        protected DriverListService $driverListService
    ) {}

    public function index(): Response
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $lists = $this->driverListService->getAccessibleLists($user, $companyId);

        return Inertia::render('Drivers/Drivers/Lists/Index', [
            'lists' => $lists,
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        // Get available fields for columns
        $availableFields = $this->driverListService->getAvailableFields();

        // Get users for sharing
        $users = $this->driverListService->getUsersForSharing($user, $companyId);

        return Inertia::render('Drivers/Drivers/Lists/Edit', [
            'list' => null,
            'availableFields' => $availableFields,
            'users' => $users,
            'isEdit' => false,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'columns' => ['nullable', 'array', 'max:15'],
            'columns.*' => ['string'],
            'all_conditions' => ['nullable', 'array'],
            'any_conditions' => ['nullable', 'array'],
            'shared_with_users' => ['nullable', 'array'],
            'shared_with_users.*' => ['integer', 'exists:users,id'],
            'is_shared' => ['boolean'],
            'is_default' => ['boolean'],
            'show_in_metrics' => ['boolean'],
            'default_sort_column' => ['nullable', 'string'],
            'default_sort_order' => ['nullable', 'string', 'in:asc,desc'],
        ]);

        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $list = $this->driverListService->createList($validated, $user, $companyId);

        return redirect()
            ->route('drivers.drivers.index')
            ->with('success', 'List created successfully.');
    }

    public function edit(int $list): Response
    {
        $user = Auth::user();
        $companyId = $this->getCompanyId();

        $listModel = DriverList::findOrFail($list);

        // Check access
        if (! $listModel->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this list.');
        }

        // Get available fields for columns
        $availableFields = $this->driverListService->getAvailableFields();

        // Get users for sharing
        $users = $this->driverListService->getUsersForSharing($user, $companyId);

        return Inertia::render('Drivers/Drivers/Lists/Edit', [
            'list' => $listModel,
            'availableFields' => $availableFields,
            'users' => $users,
            'isEdit' => true,
        ]);
    }

    public function update(Request $request, int $list): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'columns' => ['nullable', 'array', 'max:15'],
            'columns.*' => ['string'],
            'all_conditions' => ['nullable', 'array'],
            'any_conditions' => ['nullable', 'array'],
            'shared_with_users' => ['nullable', 'array'],
            'shared_with_users.*' => ['integer', 'exists:users,id'],
            'is_shared' => ['boolean'],
            'is_default' => ['boolean'],
            'show_in_metrics' => ['boolean'],
            'default_sort_column' => ['nullable', 'string'],
            'default_sort_order' => ['nullable', 'string', 'in:asc,desc'],
        ]);

        $user = Auth::user();
        $listModel = DriverList::findOrFail($list);

        // Check access
        if (! $listModel->isAccessibleBy($user)) {
            abort(403, 'You do not have access to this list.');
        }

        $this->driverListService->updateList($listModel, $validated);

        return redirect()
            ->route('drivers.drivers.index')
            ->with('success', 'List updated successfully.');
    }

    public function destroy(int $list): RedirectResponse
    {
        $user = Auth::user();
        $listModel = DriverList::findOrFail($list);

        // Only creator can delete
        if ($listModel->created_by !== $user->id) {
            abort(403, 'Only the creator can delete this list.');
        }

        $listModel->delete();

        return redirect()
            ->route('drivers.drivers.index')
            ->with('success', 'List deleted successfully.');
    }

    /**
     * Get company ID from session or user
     */
    protected function getCompanyId(): ?int
    {
        $user = Auth::user();

        if ($user->isSuperAdmin()) {
            return session('selected_company_id');
        }

        return $user->company_id;
    }
}
