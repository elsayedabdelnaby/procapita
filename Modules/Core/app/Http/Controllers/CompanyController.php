<?php

namespace Modules\Core\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
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

        return Inertia::render('Core/Companies/Show', [
            'company' => $company->load('users', 'roles'),
            'statistics' => $statistics,
            'users' => $users,
            'roles' => $roles,
            'roleHierarchy' => $roleHierarchy,
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
}

