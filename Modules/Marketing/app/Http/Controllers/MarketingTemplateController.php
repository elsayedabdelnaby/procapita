<?php

namespace Modules\Marketing\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Marketing\app\Http\Requests\MarketingTemplateStoreRequest;
use Modules\Marketing\app\Http\Requests\MarketingTemplateUpdateRequest;
use Modules\Marketing\app\Services\MarketingTemplateService;

class MarketingTemplateController extends Controller
{
    public function __construct(
        protected MarketingTemplateService $marketingTemplateService
    ) {}

    public function index(): Response
    {
        $user = auth()->user();
        $companyId = $this->getCompanyId();
        
        $templates = $this->marketingTemplateService->getAllTemplates($companyId);

        return Inertia::render('Marketing/Templates/Index', [
            'templates' => $templates,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Marketing/Templates/Create');
    }

    public function store(MarketingTemplateStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['company_id'] = auth()->user()->company_id;
            
            $this->marketingTemplateService->createTemplate($data);

            return redirect()
                ->route('marketing.templates.index')
                ->with('success', 'Template created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $id): Response
    {
        $template = $this->marketingTemplateService->getTemplateById($id);

        if (! $template) {
            abort(404, 'Template not found.');
        }

        return Inertia::render('Marketing/Templates/Show', [
            'template' => $template,
        ]);
    }

    public function edit(int $id): Response
    {
        $template = $this->marketingTemplateService->getTemplateById($id);

        if (! $template) {
            abort(404, 'Template not found.');
        }

        return Inertia::render('Marketing/Templates/Edit', [
            'template' => $template,
        ]);
    }

    public function update(MarketingTemplateUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $data = $request->validated();
            $this->marketingTemplateService->updateTemplate($id, $data);

            return redirect()
                ->route('marketing.templates.show', $id)
                ->with('success', 'Template updated successfully.');
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
            $this->marketingTemplateService->deleteTemplate($id);

            return redirect()
                ->route('marketing.templates.index')
                ->with('success', 'Template deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

