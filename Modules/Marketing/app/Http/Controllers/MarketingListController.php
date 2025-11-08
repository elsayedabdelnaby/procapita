<?php

namespace Modules\Marketing\app\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Marketing\app\Http\Requests\MarketingListStoreRequest;
use Modules\Marketing\app\Http\Requests\MarketingListUpdateRequest;
use Modules\Marketing\app\Services\MarketingListService;

class MarketingListController extends Controller
{
    public function __construct(
        protected MarketingListService $marketingListService
    ) {}

    public function index(): Response
    {
        $user = auth()->user();
        $companyId = $user->isSuperAdmin() ? null : $user->company_id;
        
        $lists = $this->marketingListService->getAllMarketingLists($companyId);

        return Inertia::render('Marketing/MarketingLists/Index', [
            'lists' => $lists,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Marketing/MarketingLists/Create');
    }

    public function store(MarketingListStoreRequest $request): RedirectResponse
    {
        try {
            $data = $request->validated();
            $data['company_id'] = auth()->user()->company_id;
            
            $this->marketingListService->createMarketingList($data);

            return redirect()
                ->route('marketing.marketing-lists.index')
                ->with('success', 'Marketing list created successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', $e->getMessage());
        }
    }

    public function show(int $id): Response
    {
        $list = $this->marketingListService->getMarketingListById($id);

        if (! $list) {
            abort(404, 'Marketing list not found.');
        }

        return Inertia::render('Marketing/MarketingLists/Show', [
            'list' => $list,
        ]);
    }

    public function edit(int $id): Response
    {
        $list = $this->marketingListService->getMarketingListById($id);

        if (! $list) {
            abort(404, 'Marketing list not found.');
        }

        return Inertia::render('Marketing/MarketingLists/Edit', [
            'list' => $list,
        ]);
    }

    public function update(MarketingListUpdateRequest $request, int $id): RedirectResponse
    {
        try {
            $data = $request->validated();
            $this->marketingListService->updateMarketingList($id, $data);

            return redirect()
                ->route('marketing.marketing-lists.show', $id)
                ->with('success', 'Marketing list updated successfully.');
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
            $this->marketingListService->deleteMarketingList($id);

            return redirect()
                ->route('marketing.marketing-lists.index')
                ->with('success', 'Marketing list deleted successfully.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', $e->getMessage());
        }
    }
}

