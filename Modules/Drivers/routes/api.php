<?php

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Modules\Drivers\app\Models\LeadSource;
use Modules\Drivers\app\Models\LeadStatus;
use Modules\Drivers\app\Models\LeadStage;
use Modules\Marketing\app\Models\Campaign;
use Modules\RidingCarCompanies\app\Models\RidingCompany;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['web', 'auth'])->prefix('drivers')->name('drivers.api.')->group(function () {
    // Get all riding companies (for super admin when "All Companies" is selected)
    Route::get('riding-companies/all', function () {
        $user = Auth::user();
        if (! $user->isSuperAdmin()) {
            abort(403, 'Unauthorized');
        }
        if (! Schema::hasTable('riding_companies')) {
            return [];
        }
        return RidingCompany::with('company:id,name')
            ->active()
            ->orderBy('name')
            ->get(['id', 'name', 'company_id'])
            ->map(function ($ridingCompany) {
                return [
                    'id' => $ridingCompany->id,
                    'name' => $ridingCompany->name.($ridingCompany->company ? ' ('.$ridingCompany->company->name.')' : ''),
                ];
            });
    })->name('all-riding-companies');

    // Get riding companies by company
    Route::get('companies/{company}/riding-companies', function ($companyId) {
        $user = Auth::user();
        if (! $user->isSuperAdmin() && $user->company_id != $companyId) {
            abort(403, 'Unauthorized');
        }
        if (! Schema::hasTable('riding_companies')) {
            return [];
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

        return LeadSource::active()
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

        return LeadStatus::active()
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

    // Get all users (for super admin when "All Companies" is selected); always include current user so they can assign to themselves
    Route::get('users/all', function () {
        $user = Auth::user();
        if (! $user->isSuperAdmin()) {
            abort(403, 'Unauthorized');
        }
        $users = User::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        if (! $users->contains('id', $user->id)) {
            $users->push($user);
            $users = $users->sortBy('name')->values();
        }
        return $users->map(fn ($u) => ['id' => $u->id, 'name' => $u->name]);
    })->name('users-all');

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

    // Get lead stages by riding company
    Route::get('riding-companies/{ridingCompany}/lead-stages', function ($ridingCompanyId) {
        // Verify user has access to this riding company
        $user = Auth::user();
        $ridingCompany = RidingCompany::find($ridingCompanyId);
        
        if (! $ridingCompany) {
            abort(404, 'Riding company not found.');
        }
        
        if (! $user->isSuperAdmin() && $user->company_id != $ridingCompany->company_id) {
            abort(403, 'Unauthorized');
        }

        return LeadStage::where('riding_company_id', $ridingCompanyId)
            ->active()
            ->ordered()
            ->get(['id', 'name', 'color']);
    })->name('lead-stages-by-riding-company');
});
