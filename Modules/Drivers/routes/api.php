<?php

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Modules\Drivers\app\Models\LeadSource;
use Modules\Drivers\app\Models\LeadStatus;
use Modules\Marketing\app\Models\Campaign;
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

    // Get lead sources by company
    Route::get('companies/{company}/lead-sources', function ($companyId) {
        // Verify user has access to this company
        $user = Auth::user();
        if (! $user->isSuperAdmin() && $user->company_id != $companyId) {
            abort(403, 'Unauthorized');
        }

        return LeadSource::where('company_id', $companyId)
            ->active()
            ->orderBy('name')
            ->get(['id', 'name']);
    })->name('lead-sources-by-company');

    // Get lead statuses by company
    Route::get('companies/{company}/lead-statuses', function ($companyId) {
        // Verify user has access to this company
        $user = Auth::user();
        if (! $user->isSuperAdmin() && $user->company_id != $companyId) {
            abort(403, 'Unauthorized');
        }

        return LeadStatus::where('company_id', $companyId)
            ->active()
            ->ordered()
            ->get(['id', 'name']);
    })->name('lead-statuses-by-company');

    // Get campaigns by company
    Route::get('companies/{company}/campaigns', function ($companyId) {
        // Verify user has access to this company
        $user = Auth::user();
        if (! $user->isSuperAdmin() && $user->company_id != $companyId) {
            abort(403, 'Unauthorized');
        }

        return Campaign::where('company_id', $companyId)
            ->orderBy('name')
            ->get(['id', 'name']);
    })->name('campaigns-by-company');

    // Get users by company
    Route::get('companies/{company}/users', function ($companyId) {
        // Verify user has access to this company
        $user = Auth::user();
        if (! $user->isSuperAdmin() && $user->company_id != $companyId) {
            abort(403, 'Unauthorized');
        }

        return User::where('company_id', $companyId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);
    })->name('users-by-company');
});
