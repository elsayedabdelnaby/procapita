<?php

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Modules\Marketing\app\Models\CampaignChannel;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['web', 'auth'])->prefix('marketing')->name('marketing.api.')->group(function () {
    // Get campaign types by company
    Route::get('companies/{company}/campaign-types', function ($companyId) {
        // Verify user has access to this company
        $user = Auth::user();
        if (!$user->isSuperAdmin() && $user->company_id != $companyId) {
            abort(403, 'Unauthorized');
        }

        return \Modules\Marketing\app\Models\CampaignType::forCompany($companyId)
            ->active()
            ->orderBy('sort_order')
            ->get();
    })->name('types-by-company');

    // Get campaign statuses by company
    Route::get('companies/{company}/campaign-statuses', function ($companyId) {
        // Verify user has access to this company
        $user = Auth::user();
        if (!$user->isSuperAdmin() && $user->company_id != $companyId) {
            abort(403, 'Unauthorized');
        }

        return \Modules\Marketing\app\Models\CampaignStatus::forCompany($companyId)
            ->active()
            ->orderBy('sort_order')
            ->get();
    })->name('statuses-by-company');

    // Get channels by campaign type
    Route::get('campaign-types/{campaignType}/channels', function ($campaignTypeId) {
        return CampaignChannel::where('campaign_type_id', $campaignTypeId)
            ->active()
            ->orderBy('sort_order')
            ->get();
    })->name('channels-by-type');
});

