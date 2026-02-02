<?php

namespace App\Http\Controllers;

use App\Models\ReportFolder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReportFolderController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $companyId = $this->getCompanyId();

        ReportFolder::create([
            'name' => $validated['name'],
            'company_id' => $companyId,
            'sort_order' => ReportFolder::when($companyId, fn ($q) => $q->where('company_id', $companyId))
                ->max('sort_order') + 1,
        ]);

        return redirect()->route('reports.index')->with('success', 'Folder created.');
    }
}
