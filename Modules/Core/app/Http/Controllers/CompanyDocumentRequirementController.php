<?php

namespace Modules\Core\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Http\Requests\CompanyDocumentRequirementStoreRequest;
use Modules\Core\app\Http\Requests\CompanyDocumentRequirementUpdateRequest;
use Modules\Core\app\Models\Company;
use Modules\Core\app\Models\CompanyDocumentRequirement;

class CompanyDocumentRequirementController extends Controller
{
    protected function authorizeCompany(Company $company): void
    {
        $user = Auth::user();
        if ($user->isSuperAdmin()) {
            return;
        }
        if (! $user->is_company_admin || (int) $company->id !== (int) $user->company_id) {
            abort(403, 'Unauthorized.');
        }
    }

    public function index(Company $company): Response
    {
        $this->authorizeCompany($company);

        if (! Schema::hasTable('company_document_requirements')) {
            return Inertia::render('Core/Companies/DocumentRequirements/Index', [
                'company' => ['id' => $company->id, 'name' => $company->name],
                'documentRequirements' => [],
            ]);
        }

        $requirements = CompanyDocumentRequirement::where('company_id', $company->id)
            ->orderBy('name')
            ->get()
            ->map(fn ($req) => [
                'id' => $req->id,
                'name' => $req->name,
                'type' => $req->type,
                'required' => $req->required,
                'instructions' => $req->instructions,
                'active' => $req->active,
                'default_status' => $req->default_status ?? 'pending',
                'created_at' => $req->created_at?->toISOString(),
            ]);

        return Inertia::render('Core/Companies/DocumentRequirements/Index', [
            'company' => ['id' => $company->id, 'name' => $company->name],
            'documentRequirements' => $requirements,
        ]);
    }

    public function create(Company $company): Response
    {
        $this->authorizeCompany($company);

        return Inertia::render('Core/Companies/DocumentRequirements/Create', [
            'company' => ['id' => $company->id, 'name' => $company->name],
        ]);
    }

    public function store(CompanyDocumentRequirementStoreRequest $request, Company $company): RedirectResponse
    {
        $this->authorizeCompany($company);

        if (! Schema::hasTable('company_document_requirements')) {
            return redirect()->back()->with('error', 'Document requirements are not available.');
        }

        $data = $request->validated();
        $data['company_id'] = $company->id;
        $data['active'] = $data['active'] ?? true;
        $data['required'] = $data['required'] ?? false;

        CompanyDocumentRequirement::create($data);

        return redirect()
            ->route('core.companies.document-requirements.index', $company)
            ->with('success', 'Document requirement created successfully.');
    }

    public function edit(CompanyDocumentRequirement $companyDocumentRequirement): Response
    {
        $companyDocumentRequirement->load('company');
        $this->authorizeCompany($companyDocumentRequirement->company);

        return Inertia::render('Core/Companies/DocumentRequirements/Edit', [
            'company' => ['id' => $companyDocumentRequirement->company->id, 'name' => $companyDocumentRequirement->company->name],
            'requirement' => [
                'id' => $companyDocumentRequirement->id,
                'name' => $companyDocumentRequirement->name,
                'type' => $companyDocumentRequirement->type,
                'required' => $companyDocumentRequirement->required,
                'instructions' => $companyDocumentRequirement->instructions,
                'active' => $companyDocumentRequirement->active,
                'default_status' => $companyDocumentRequirement->default_status ?? 'pending',
            ],
        ]);
    }

    public function update(CompanyDocumentRequirementUpdateRequest $request, CompanyDocumentRequirement $companyDocumentRequirement): RedirectResponse
    {
        $this->authorizeCompany($companyDocumentRequirement->company);

        $data = $request->validated();
        $data['active'] = $data['active'] ?? true;
        $data['required'] = $data['required'] ?? false;

        $companyDocumentRequirement->update($data);

        return redirect()
            ->route('core.companies.document-requirements.index', $companyDocumentRequirement->company)
            ->with('success', 'Document requirement updated successfully.');
    }

    public function destroy(CompanyDocumentRequirement $companyDocumentRequirement): RedirectResponse
    {
        $company = $companyDocumentRequirement->company;
        $this->authorizeCompany($company);

        $companyDocumentRequirement->delete();

        return redirect()
            ->route('core.companies.document-requirements.index', $company)
            ->with('success', 'Document requirement deleted.');
    }
}
