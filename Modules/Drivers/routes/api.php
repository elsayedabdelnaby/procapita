<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['web', 'auth'])->prefix('drivers')->name('drivers.api.')->group(function () {
    // Get riding companies by company
    Route::get('companies/{company}/riding-companies', function ($companyId) {
        // Verify user has access to this company
        $user = Auth::user();
        if (! $user->isSuperAdmin() && $user->company_id != $companyId) {
            abort(403, 'Unauthorized');
        }

        return RidingCompany::where('company_id', $companyId)
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);
    })->name('riding-companies-by-company');
});
