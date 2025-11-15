<?php

namespace Modules\RidingCarCompanies\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Core\app\Models\Company;
use Modules\RidingCarCompanies\app\Http\Requests\RidingCompanyStoreRequest;
use Modules\RidingCarCompanies\app\Http\Requests\RidingCompanyUpdateRequest;
use Modules\RidingCarCompanies\app\Services\RidingCompanyService;

class RidingCompanyController extends Controller
{
    public function __construct(
        protected RidingCompanyService $ridingCompanyService
    ) {}

    public function index(): Response
    {
        $user = Auth::user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;

        $ridingCompanies = $this->ridingCompanyService->getAllRidingCompanies($companyId);

        return Inertia::render('RidingCarCompanies/RidingCompanies/Index', [
            'ridingCompanies' => $ridingCompanies->load('company')->map(fn($company) => [
                'id' => $company->id,
                'uuid' => $company->uuid,
                'company_id' => $company->company_id,
                'company' => $company->company ? [
                    'id' => $company->company->id,
                    'name' => $company->company->name,
                ] : null,
                'name' => $company->name,
                'slug' => $company->slug,
                'description' => $company->description,
                'country' => $company->country,
                'city' => $company->city,
                'logo_path' => $company->logo_path,
                'contact_email' => $company->contact_email,
                'contact_phone' => $company->contact_phone,
                'active' => $company->active,
                'created_at' => $company->created_at,
                'updated_at' => $company->updated_at,
            ]),
        ]);
    }

    public function create(): Response
    {
        $user = Auth::user();
        $companies = null;

        if ($user->isSuperAdmin()) {
            $companies = Company::active()->orderBy('name')->get();
        }

        return Inertia::render('RidingCarCompanies/RidingCompanies/Create', [
            'companies' => $companies,
        ]);
    }

    public function store(RidingCompanyStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $user = Auth::user();

            // Set company_id if not super admin
            if (! $user->isSuperAdmin()) {
                $data['company_id'] = $user->company_id;
            }

            $data['created_by'] = $user->id;
            $data['active'] = $data['active'] ?? true;

            $this->ridingCompanyService->createRidingCompany($data);

            return redirect()
                ->route('ridingcarcompanies.ridingcompanies.index')
                ->with('success', 'Riding company created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $id): Response
    {
        $ridingCompany = $this->ridingCompanyService->getRidingCompanyById($id);

        if (! $ridingCompany) {
            abort(404, 'Riding company not found.');
        }

        $ridingCompany->load(['company', 'creator', 'stageTemplates', 'documentRequirements', 'integrations', 'integrationSettings']);

        return Inertia::render('RidingCarCompanies/RidingCompanies/Show', [
            'ridingCompany' => [
                'id' => $ridingCompany->id,
                'uuid' => $ridingCompany->uuid,
                'name' => $ridingCompany->name,
                'slug' => $ridingCompany->slug,
                'description' => $ridingCompany->description,
                'country' => $ridingCompany->country,
                'city' => $ridingCompany->city,
                'logo_path' => $ridingCompany->logo_path,
                'contact_email' => $ridingCompany->contact_email,
                'contact_phone' => $ridingCompany->contact_phone,
                'active' => $ridingCompany->active,
                'created_at' => $ridingCompany->created_at,
                'updated_at' => $ridingCompany->updated_at,
                'company' => $ridingCompany->company ? [
                    'id' => $ridingCompany->company->id,
                    'name' => $ridingCompany->company->name,
                ] : null,
                'creator' => $ridingCompany->creator ? [
                    'id' => $ridingCompany->creator->id,
                    'name' => $ridingCompany->creator->name,
                    'email' => $ridingCompany->creator->email,
                ] : null,
                'stage_templates' => $ridingCompany->stageTemplates->map(fn($template) => [
                    'id' => $template->id,
                    'name' => $template->name,
                    'order' => $template->order,
                    'target_value' => $template->target_value,
                    'target_unit' => $template->target_unit,
                    'duration_days' => $template->duration_days,
                    'strict_sequence' => $template->strict_sequence,
                    'allow_cumulative' => $template->allow_cumulative,
                    'active' => $template->active,
                ])->toArray(),
                'document_requirements' => $ridingCompany->documentRequirements->map(fn($req) => [
                    'id' => $req->id,
                    'name' => $req->name,
                    'type' => $req->type,
                    'required' => $req->required,
                    'active' => $req->active,
                ])->toArray(),
                'integrations' => $ridingCompany->integrations->map(fn($integration) => [
                    'id' => $integration->id,
                    'type' => $integration->type,
                    'active' => $integration->active,
                ])->toArray(),
                'integration_settings' => $ridingCompany->integrationSettings->map(fn($setting) => [
                    'id' => $setting->id,
                    'type' => $setting->type,
                    'active' => $setting->active,
                ])->toArray(),
            ],
        ]);
    }

    public function edit(int $id): Response
    {
        $ridingCompany = $this->ridingCompanyService->getRidingCompanyById($id);

        if (! $ridingCompany) {
            abort(404, 'Riding company not found.');
        }

        $user = Auth::user();
        $companies = null;

        if ($user->isSuperAdmin()) {
            $companies = Company::active()->orderBy('name')->get();
        }

        return Inertia::render('RidingCarCompanies/RidingCompanies/Edit', [
            'ridingCompany' => $ridingCompany->load('company'),
            'companies' => $companies,
        ]);
    }

    public function update(RidingCompanyUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $this->ridingCompanyService->updateRidingCompany($id, $request->validated());

            return redirect()
                ->route('ridingcarcompanies.ridingcompanies.index')
                ->with('success', 'Riding company updated successfully.');
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
            $this->ridingCompanyService->deleteRidingCompany($id);

            return redirect()
                ->route('ridingcarcompanies.ridingcompanies.index')
                ->with('success', 'Riding company deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function toggleActive(int $id): RedirectResponse
    {
        try {
            $this->ridingCompanyService->toggleActive($id);

            return redirect()
                ->back()
                ->with('success', 'Riding company status updated successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }

    public function uploadLogo(Request $request, int $id): RedirectResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'max:2048'], // 2MB max
        ]);

        try {
            $path = $this->ridingCompanyService->uploadLogo($id, $request->file('logo'));

            return redirect()
                ->back()
                ->with('success', 'Logo uploaded successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

