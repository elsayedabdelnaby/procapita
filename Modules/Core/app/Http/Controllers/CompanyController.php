<?php

namespace Modules\Core\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Http\Requests\CompanyStoreRequest;
use Modules\Core\app\Http\Requests\CompanyUpdateRequest;
use Modules\Core\app\Services\CompanyService;

class CompanyController extends Controller
{
    public function __construct(
        protected CompanyService $companyService
    ) {}

    public function index(): Response
    {
        $companies = $this->companyService->getAllCompanies();

        return Inertia::render('Core/Companies/Index', [
            'companies' => $companies,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Core/Companies/Create');
    }

    public function store(CompanyStoreRequest $request): RedirectResponse
    {
        try {
            $this->companyService->createCompany($request->validated());

            return redirect()
                ->route('core.companies.index')
                ->with('success', 'Company created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $id): Response
    {
        $company = $this->companyService->getCompanyById($id);

        if (! $company) {
            abort(404, 'Company not found.');
        }

        $statistics = $this->companyService->getCompanyStatistics($id);

        // Set team context for Spatie Permission to load roles correctly
        setPermissionsTeamId($id);

        // Load company users with roles
        $users = $company->users()->with('roles')->get();

        // Load company roles with hierarchy
        $roles = $company->roles()->with('parent', 'children')->get();

        // Build role hierarchy tree
        $roleHierarchy = $company->roles()->rootRoles()->with('allChildren')->get();

        // Load activity logs
        $activities = \Spatie\Activitylog\Models\Activity::forSubject($company)
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

        return Inertia::render('Core/Companies/Show', [
            'company' => $company->load('users', 'roles'),
            'statistics' => $statistics,
            'users' => $users,
            'roles' => $roles,
            'roleHierarchy' => $roleHierarchy,
            'activities' => $activities,
        ]);
    }

    public function edit(int $id): Response
    {
        $company = $this->companyService->getCompanyById($id);

        if (! $company) {
            abort(404, 'Company not found.');
        }

        return Inertia::render('Core/Companies/Edit', [
            'company' => $company,
        ]);
    }

    public function update(CompanyUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $this->companyService->updateCompany($id, $request->validated());

            return redirect()
                ->route('core.companies.show', $id)
                ->with('success', 'Company updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function destroy(int $id): RedirectResponse
    {
        try {
            $this->companyService->deleteCompany($id);

            return redirect()
                ->route('core.companies.index')
                ->with('success', 'Company deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function activate(int $id): RedirectResponse
    {
        try {
            $this->companyService->activateCompany($id);

            return redirect()
                ->back()
                ->with('success', 'Company activated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function deactivate(int $id): RedirectResponse
    {
        try {
            $this->companyService->deactivateCompany($id);

            return redirect()
                ->back()
                ->with('success', 'Company deactivated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function select(Request $request): RedirectResponse
    {
        $request->validate([
            'company_id' => ['required', 'integer', 'exists:companies,id'],
        ]);

        $company = $this->companyService->getCompanyById($request->company_id);
        
        if (! $company) {
            return redirect()
                ->back()
                ->with('error', 'Company not found.');
        }

        session(['selected_company_id' => $request->company_id]);

        return redirect()
            ->back()
            ->with('success', "Now viewing data for: {$company->name}");
    }

    public function clearSelection(): RedirectResponse
    {
        session()->forget('selected_company_id');

        return redirect()
            ->back()
            ->with('success', 'Company filter cleared. Showing all companies.');
    }
}

