<?php

use Illuminate\Support\Facades\Route;
use Modules\Drivers\app\Http\Controllers\DriverController;
use Modules\Drivers\app\Http\Controllers\DriverDocumentController;
use Modules\Drivers\app\Http\Controllers\DriverFollowUpController;
use Modules\Drivers\app\Http\Controllers\DriverListController;
use Modules\Drivers\app\Http\Controllers\LeadSourceController;
use Modules\Drivers\app\Http\Controllers\LeadStageController;
use Modules\Drivers\app\Http\Controllers\LeadStatusController;

// Leads (main list) under /leads/leads - primary URLs
Route::middleware(['auth', 'verified'])->prefix('leads')->name('leads.')->group(function () {
    Route::middleware(['permission:drivers.drivers.create'])->group(function () {
        Route::get('leads/create', [DriverController::class, 'create'])->name('leads.create');
        Route::post('leads', [DriverController::class, 'store'])->name('leads.store');
    });

    Route::middleware(['permission:drivers.drivers.read'])->group(function () {
        Route::get('leads', [DriverController::class, 'index'])->name('leads.index');
        Route::get('leads/recycle-bin', [DriverController::class, 'recycleBin'])->name('leads.recycle-bin');
    });

    Route::middleware(['permission:drivers.drivers.export'])->group(function () {
        Route::get('leads/export', [DriverController::class, 'export'])->name('leads.export');
    });

    Route::middleware(['permission:drivers.drivers.import'])->group(function () {
        Route::get('leads/import/download/{type}', [DriverController::class, 'downloadImportDetails'])
            ->where('type', 'created|skipped|updated')
            ->name('leads.import.download');
        Route::post('leads/import', [DriverController::class, 'importStore'])->name('leads.import.store');
        Route::get('leads/import/results', [DriverController::class, 'importResults'])->name('leads.import.results');
    });

    Route::middleware(['permission:drivers.drivers.mass-edit'])->group(function () {
        Route::get('leads/mass-edit', [DriverController::class, 'massEdit'])->name('leads.mass-edit');
        Route::post('leads/mass-update', [DriverController::class, 'massUpdate'])->name('leads.mass-update');
    });

    Route::middleware(['permission:drivers.drivers.update'])->group(function () {
        Route::post('leads/merge', [DriverController::class, 'merge'])->name('leads.merge');
    });

    Route::middleware(['permission:drivers.drivers.read'])->group(function () {
        Route::get('leads/{driver}/details', [DriverController::class, 'details'])->name('leads.details');
        Route::get('leads/{driver}', [DriverController::class, 'show'])->name('leads.show');
    });

    Route::middleware(['permission:drivers.drivers.update,drivers.drivers.edit'])->group(function () {
        Route::get('leads/{driver}/edit', [DriverController::class, 'edit'])->name('leads.edit');
        Route::put('leads/{driver}', [DriverController::class, 'update'])->name('leads.update');
    });

    Route::middleware(['permission:drivers.drivers.delete'])->group(function () {
        Route::delete('leads/{driver}', [DriverController::class, 'destroy'])->name('leads.destroy');
    });

    Route::middleware(['permission:drivers.drivers.mass-delete'])->group(function () {
        Route::post('leads/mass-delete', [DriverController::class, 'massDelete'])->name('leads.mass-delete');
    });

    Route::middleware(['permission:drivers.drivers.assign'])->group(function () {
        Route::post('leads/{driver}/assign', [DriverController::class, 'assign'])->name('leads.assign');
    });

    Route::middleware(['permission:drivers.drivers.read'])->group(function () {
        Route::get('leads/lists', [DriverListController::class, 'index'])->name('leads.lists.index');
        Route::get('leads/lists/create', [DriverListController::class, 'create'])->name('leads.lists.create');
        Route::post('leads/lists', [DriverListController::class, 'store'])->name('leads.lists.store');
        Route::get('leads/lists/{list}/edit', [DriverListController::class, 'edit'])->name('leads.lists.edit');
        Route::put('leads/lists/{list}', [DriverListController::class, 'update'])->name('leads.lists.update');
        Route::delete('leads/lists/{list}', [DriverListController::class, 'destroy'])->name('leads.lists.destroy');
    });

    // Lead Sources (under /leads/lead-sources)
    Route::middleware(['permission:drivers.leadsources.create'])->group(function () {
        Route::get('lead-sources/create', [LeadSourceController::class, 'create'])->name('leadsources.create');
        Route::post('lead-sources', [LeadSourceController::class, 'store'])->name('leadsources.store');
    });
    Route::middleware(['permission:drivers.leadsources.read'])->group(function () {
        Route::get('lead-sources', [LeadSourceController::class, 'index'])->name('leadsources.index');
        Route::get('lead-sources/recycle-bin', [LeadSourceController::class, 'recycleBin'])->name('leadsources.recycle-bin');
    });
    Route::middleware(['permission:drivers.leadsources.export'])->group(function () {
        Route::get('lead-sources/export', [LeadSourceController::class, 'export'])->name('leadsources.export');
    });
    Route::middleware(['permission:drivers.leadsources.import'])->group(function () {
        Route::get('lead-sources/import', [LeadSourceController::class, 'import'])->name('leadsources.import');
        Route::post('lead-sources/import', [LeadSourceController::class, 'importStore'])->name('leadsources.import.store');
    });
    Route::middleware(['permission:drivers.leadsources.read'])->group(function () {
        Route::get('lead-sources/{leadSource}', [LeadSourceController::class, 'show'])->name('leadsources.show');
    });
    Route::middleware(['permission:drivers.leadsources.update'])->group(function () {
        Route::get('lead-sources/{leadSource}/edit', [LeadSourceController::class, 'edit'])->name('leadsources.edit');
        Route::put('lead-sources/{leadSource}', [LeadSourceController::class, 'update'])->name('leadsources.update');
    });
    Route::middleware(['permission:drivers.leadsources.delete'])->group(function () {
        Route::delete('lead-sources/{leadSource}', [LeadSourceController::class, 'destroy'])->name('leadsources.destroy');
    });
    Route::middleware(['permission:drivers.leadsources.toggle-active'])->group(function () {
        Route::post('lead-sources/{leadSource}/toggle-active', [LeadSourceController::class, 'toggleActive'])->name('leadsources.toggle-active');
    });

    // Lead Statuses (under /leads/lead-statuses)
    Route::middleware(['permission:drivers.leadstatuses.create'])->group(function () {
        Route::get('lead-statuses/create', [LeadStatusController::class, 'create'])->name('leadstatuses.create');
        Route::post('lead-statuses', [LeadStatusController::class, 'store'])->name('leadstatuses.store');
    });
    Route::middleware(['permission:drivers.leadstatuses.read'])->group(function () {
        Route::get('lead-statuses', [LeadStatusController::class, 'index'])->name('leadstatuses.index');
        Route::get('lead-statuses/recycle-bin', [LeadStatusController::class, 'recycleBin'])->name('leadstatuses.recycle-bin');
    });
    Route::middleware(['permission:drivers.leadstatuses.export'])->group(function () {
        Route::get('lead-statuses/export', [LeadStatusController::class, 'export'])->name('leadstatuses.export');
    });
    Route::middleware(['permission:drivers.leadstatuses.import'])->group(function () {
        Route::get('lead-statuses/import', [LeadStatusController::class, 'import'])->name('leadstatuses.import');
        Route::post('lead-statuses/import', [LeadStatusController::class, 'importStore'])->name('leadstatuses.import.store');
    });
    Route::middleware(['permission:drivers.leadstatuses.read'])->group(function () {
        Route::get('lead-statuses/{leadStatus}', [LeadStatusController::class, 'show'])->name('leadstatuses.show');
    });
    Route::middleware(['permission:drivers.leadstatuses.update'])->group(function () {
        Route::get('lead-statuses/{leadStatus}/edit', [LeadStatusController::class, 'edit'])->name('leadstatuses.edit');
        Route::put('lead-statuses/{leadStatus}', [LeadStatusController::class, 'update'])->name('leadstatuses.update');
    });
    Route::middleware(['permission:drivers.leadstatuses.delete'])->group(function () {
        Route::delete('lead-statuses/{leadStatus}', [LeadStatusController::class, 'destroy'])->name('leadstatuses.destroy');
    });
    Route::middleware(['permission:drivers.leadstatuses.toggle-active'])->group(function () {
        Route::post('lead-statuses/{leadStatus}/toggle-active', [LeadStatusController::class, 'toggleActive'])->name('leadstatuses.toggle-active');
        Route::post('lead-statuses/{leadStatus}/move-up', [LeadStatusController::class, 'moveUp'])->name('leadstatuses.move-up');
        Route::post('lead-statuses/{leadStatus}/move-down', [LeadStatusController::class, 'moveDown'])->name('leadstatuses.move-down');
        Route::post('lead-statuses/reorder', [LeadStatusController::class, 'reorder'])->name('leadstatuses.reorder');
    });

    // Lead Stages (under /leads/lead-stages)
    Route::middleware(['permission:drivers.leadstages.create'])->group(function () {
        Route::get('lead-stages/create', [LeadStageController::class, 'create'])->name('leadstages.create');
        Route::post('lead-stages', [LeadStageController::class, 'store'])->name('leadstages.store');
    });
    Route::middleware(['permission:drivers.leadstages.read'])->group(function () {
        Route::get('lead-stages', [LeadStageController::class, 'index'])->name('leadstages.index');
        Route::get('lead-stages/recycle-bin', [LeadStageController::class, 'recycleBin'])->name('leadstages.recycle-bin');
    });
    Route::middleware(['permission:drivers.leadstages.export'])->group(function () {
        Route::get('lead-stages/export', [LeadStageController::class, 'export'])->name('leadstages.export');
    });
    Route::middleware(['permission:drivers.leadstages.import'])->group(function () {
        Route::get('lead-stages/import', [LeadStageController::class, 'import'])->name('leadstages.import');
        Route::post('lead-stages/import', [LeadStageController::class, 'importStore'])->name('leadstages.import.store');
    });
    Route::middleware(['permission:drivers.leadstages.read'])->group(function () {
        Route::get('lead-stages/{leadStage}', [LeadStageController::class, 'show'])->name('leadstages.show');
    });
    Route::middleware(['permission:drivers.leadstages.update'])->group(function () {
        Route::get('lead-stages/{leadStage}/edit', [LeadStageController::class, 'edit'])->name('leadstages.edit');
        Route::put('lead-stages/{leadStage}', [LeadStageController::class, 'update'])->name('leadstages.update');
    });
    Route::middleware(['permission:drivers.leadstages.delete'])->group(function () {
        Route::delete('lead-stages/{leadStage}', [LeadStageController::class, 'destroy'])->name('leadstages.destroy');
    });
    Route::middleware(['permission:drivers.leadstages.toggle-active'])->group(function () {
        Route::post('lead-stages/{leadStage}/toggle-active', [LeadStageController::class, 'toggleActive'])->name('leadstages.toggle-active');
        Route::post('lead-stages/{leadStage}/move-up', [LeadStageController::class, 'moveUp'])->name('leadstages.move-up');
        Route::post('lead-stages/{leadStage}/move-down', [LeadStageController::class, 'moveDown'])->name('leadstages.move-down');
        Route::post('lead-stages/reorder', [LeadStageController::class, 'reorder'])->name('leadstages.reorder');
    });

    // Documents Required (under /leads/lead-documents - was driver-documents)
    Route::middleware(['permission:drivers.driverdocuments.create'])->group(function () {
        Route::get('lead-documents/create', [DriverDocumentController::class, 'create'])->name('driverdocuments.create');
        Route::post('lead-documents', [DriverDocumentController::class, 'store'])->name('driverdocuments.store');
    });
    Route::middleware(['permission:drivers.driverdocuments.read'])->group(function () {
        Route::get('lead-documents', [DriverDocumentController::class, 'index'])->name('driverdocuments.index');
        Route::get('lead-documents/recycle-bin', [DriverDocumentController::class, 'recycleBin'])->name('driverdocuments.recycle-bin');
    });
    Route::middleware(['permission:drivers.driverdocuments.export'])->group(function () {
        Route::get('lead-documents/export', [DriverDocumentController::class, 'export'])->name('driverdocuments.export');
    });
    Route::middleware(['permission:drivers.driverdocuments.view'])->group(function () {
        Route::get('lead-documents/{driverDocument}/view', [DriverDocumentController::class, 'view'])->name('driverdocuments.view');
    });
    Route::middleware(['permission:drivers.driverdocuments.download'])->group(function () {
        Route::get('lead-documents/{driverDocument}/download', [DriverDocumentController::class, 'download'])->name('driverdocuments.download');
    });
    Route::middleware(['permission:drivers.driverdocuments.read'])->group(function () {
        Route::get('lead-documents/{driverDocument}', [DriverDocumentController::class, 'show'])->name('driverdocuments.show');
    });
    Route::middleware(['permission:drivers.driverdocuments.update'])->group(function () {
        Route::get('lead-documents/{driverDocument}/edit', [DriverDocumentController::class, 'edit'])->name('driverdocuments.edit');
        Route::put('lead-documents/{driverDocument}', [DriverDocumentController::class, 'update'])->name('driverdocuments.update');
    });
    Route::middleware(['permission:drivers.driverdocuments.delete'])->group(function () {
        Route::delete('lead-documents/{driverDocument}', [DriverDocumentController::class, 'destroy'])->name('driverdocuments.destroy');
        Route::delete('lead-documents', [DriverDocumentController::class, 'destroyAll'])->name('driverdocuments.destroy-all');
        Route::post('lead-documents/delete-by-name-and-company', [DriverDocumentController::class, 'deleteByNameAndCompany'])->name('driverdocuments.delete-by-name-and-company');
    });
    Route::middleware(['permission:drivers.driverdocuments.replace'])->group(function () {
        Route::post('lead-documents/{driverDocument}/upload', [DriverDocumentController::class, 'upload'])->name('driverdocuments.upload');
    });
    Route::middleware(['permission:drivers.driverdocuments.delete-file'])->group(function () {
        Route::delete('lead-documents/{driverDocument}/delete-file', [DriverDocumentController::class, 'deleteFile'])->name('driverdocuments.delete-file');
    });
    Route::middleware(['permission:drivers.driverdocuments.approve'])->group(function () {
        Route::post('lead-documents/{driverDocument}/approve', [DriverDocumentController::class, 'approve'])->name('driverdocuments.approve');
    });
    Route::middleware(['permission:drivers.driverdocuments.reject'])->group(function () {
        Route::post('lead-documents/{driverDocument}/reject', [DriverDocumentController::class, 'reject'])->name('driverdocuments.reject');
    });
    Route::middleware(['permission:drivers.driverdocuments.set-pending,drivers.driverdocuments.set-approved,drivers.driverdocuments.set-rejected'])->group(function () {
        Route::post('lead-documents/{driverDocument}/update-status', [DriverDocumentController::class, 'updateStatus'])->name('driverdocuments.update-status');
    });

    // Follow-ups (under /leads/lead-follow-ups - was driver-follow-ups)
    Route::middleware(['permission:drivers.driverfollowups.create'])->group(function () {
        Route::get('lead-follow-ups/create', [DriverFollowUpController::class, 'create'])->name('driverfollowups.create');
        Route::post('lead-follow-ups', [DriverFollowUpController::class, 'store'])->name('driverfollowups.store');
    });
    Route::middleware(['permission:drivers.driverfollowups.read'])->group(function () {
        Route::get('lead-follow-ups', [DriverFollowUpController::class, 'index'])->name('driverfollowups.index');
        Route::get('lead-follow-ups/recycle-bin', [DriverFollowUpController::class, 'recycleBin'])->name('driverfollowups.recycle-bin');
        Route::get('lead-follow-ups/export', [DriverFollowUpController::class, 'export'])->name('driverfollowups.export');
    });
    Route::middleware(['permission:drivers.driverfollowups.mass-edit'])->group(function () {
        Route::get('lead-follow-ups/mass-edit', [DriverFollowUpController::class, 'massEdit'])->name('driverfollowups.mass-edit');
        Route::post('lead-follow-ups/mass-update', [DriverFollowUpController::class, 'massUpdate'])->name('driverfollowups.mass-update');
    });
    Route::middleware(['permission:drivers.driverfollowups.mass-delete'])->group(function () {
        Route::post('lead-follow-ups/mass-delete', [DriverFollowUpController::class, 'massDelete'])->name('driverfollowups.mass-delete');
    });
    Route::middleware(['permission:drivers.driverfollowups.read'])->group(function () {
        Route::get('lead-follow-ups/{driverFollowUp}', [DriverFollowUpController::class, 'show'])->name('driverfollowups.show');
    });
    Route::middleware(['permission:drivers.driverfollowups.update'])->group(function () {
        Route::get('lead-follow-ups/{driverFollowUp}/edit', [DriverFollowUpController::class, 'edit'])->name('driverfollowups.edit');
        Route::put('lead-follow-ups/{driverFollowUp}', [DriverFollowUpController::class, 'update'])->name('driverfollowups.update');
    });
    Route::middleware(['permission:drivers.driverfollowups.delete'])->group(function () {
        Route::delete('lead-follow-ups/{driverFollowUp}', [DriverFollowUpController::class, 'destroy'])->name('driverfollowups.destroy');
    });
});

// Legacy /drivers/drivers -> redirect to /leads/leads (static paths before {driver})
Route::middleware(['auth', 'verified'])->prefix('drivers')->name('drivers.')->group(function () {
    Route::get('drivers', fn () => redirect()->route('leads.leads.index'))->name('drivers.index');
    Route::get('drivers/recycle-bin', fn () => redirect()->route('leads.leads.recycle-bin'))->name('drivers.recycle-bin');
    Route::get('drivers/create', fn () => redirect()->route('leads.leads.create'))->name('drivers.create');
    Route::get('drivers/export', fn () => redirect()->route('leads.leads.export'))->name('drivers.export');
    Route::get('drivers/import/download/{type}', fn ($type) => redirect()->route('leads.leads.import.download', ['type' => $type]))->where('type', 'created|skipped|updated')->name('drivers.import.download');
    Route::get('drivers/import/results', fn () => redirect()->route('leads.leads.import.results'))->name('drivers.import.results');
    Route::get('drivers/mass-edit', fn () => redirect()->to(route('leads.leads.mass-edit').(request()->getQueryString() ? '?'.request()->getQueryString() : '')))->name('drivers.mass-edit');
    Route::get('drivers/lists', fn () => redirect()->route('leads.leads.lists.index'))->name('drivers.lists.index');
    Route::get('drivers/lists/create', fn () => redirect()->route('leads.leads.lists.create'))->name('drivers.lists.create');
    Route::get('drivers/lists/{list}/edit', fn (\Modules\Drivers\app\Models\DriverList $list) => redirect()->route('leads.leads.lists.edit', $list))->name('drivers.lists.edit');
    Route::get('drivers/{driver}/details', fn (\Modules\Drivers\app\Models\Driver $driver) => redirect()->route('leads.leads.details', $driver))->name('drivers.details');
    Route::get('drivers/{driver}/edit', fn (\Modules\Drivers\app\Models\Driver $driver) => redirect()->route('leads.leads.edit', $driver))->name('drivers.edit');
    Route::get('drivers/{driver}', fn (\Modules\Drivers\app\Models\Driver $driver) => redirect()->route('leads.leads.show', $driver))->name('drivers.show');
    // POST/PUT/DELETE must keep working for old form submissions
    Route::post('drivers', [DriverController::class, 'store'])->name('drivers.store');
    Route::post('drivers/import', [DriverController::class, 'importStore'])->name('drivers.import.store');
    Route::post('drivers/mass-update', [DriverController::class, 'massUpdate'])->name('drivers.mass-update');
    Route::post('drivers/merge', [DriverController::class, 'merge'])->name('drivers.merge');
    Route::put('drivers/{driver}', [DriverController::class, 'update'])->name('drivers.update');
    Route::delete('drivers/{driver}', [DriverController::class, 'destroy'])->name('drivers.destroy');
    Route::post('drivers/mass-delete', [DriverController::class, 'massDelete'])->name('drivers.mass-delete');
    Route::post('drivers/{driver}/assign', [DriverController::class, 'assign'])->name('drivers.assign');
    Route::post('drivers/lists', [DriverListController::class, 'store'])->name('drivers.lists.store');
    Route::put('drivers/lists/{list}', [DriverListController::class, 'update'])->name('drivers.lists.update');
    Route::delete('drivers/lists/{list}', [DriverListController::class, 'destroy'])->name('drivers.lists.destroy');
});

Route::middleware(['auth', 'verified'])->prefix('drivers')->name('drivers.')->group(function () {
    // Lead Sources Management
    Route::middleware(['permission:drivers.leadsources.create'])->group(function () {
        Route::get('lead-sources/create', [LeadSourceController::class, 'create'])->name('leadsources.create');
        Route::post('lead-sources', [LeadSourceController::class, 'store'])->name('leadsources.store');
    });

    Route::middleware(['permission:drivers.leadsources.read'])->group(function () {
        Route::get('lead-sources', [LeadSourceController::class, 'index'])->name('leadsources.index');
        Route::get('lead-sources/recycle-bin', [LeadSourceController::class, 'recycleBin'])->name('leadsources.recycle-bin');
    });

    Route::middleware(['permission:drivers.leadsources.export'])->group(function () {
        Route::get('lead-sources/export', [LeadSourceController::class, 'export'])->name('leadsources.export');
    });

    Route::middleware(['permission:drivers.leadsources.import'])->group(function () {
        Route::get('lead-sources/import', [LeadSourceController::class, 'import'])->name('leadsources.import');
        Route::post('lead-sources/import', [LeadSourceController::class, 'importStore'])->name('leadsources.import.store');
    });

    Route::middleware(['permission:drivers.leadsources.read'])->group(function () {
        Route::get('lead-sources/{leadSource}', [LeadSourceController::class, 'show'])->name('leadsources.show');
    });

    Route::middleware(['permission:drivers.leadsources.update'])->group(function () {
        Route::get('lead-sources/{leadSource}/edit', [LeadSourceController::class, 'edit'])->name('leadsources.edit');
        Route::put('lead-sources/{leadSource}', [LeadSourceController::class, 'update'])->name('leadsources.update');
    });

    Route::middleware(['permission:drivers.leadsources.delete'])->group(function () {
        Route::delete('lead-sources/{leadSource}', [LeadSourceController::class, 'destroy'])->name('leadsources.destroy');
    });

    Route::middleware(['permission:drivers.leadsources.toggle-active'])->group(function () {
        Route::post('lead-sources/{leadSource}/toggle-active', [LeadSourceController::class, 'toggleActive'])->name('leadsources.toggle-active');
    });

    // Lead Statuses Management
    Route::middleware(['permission:drivers.leadstatuses.create'])->group(function () {
        Route::get('lead-statuses/create', [LeadStatusController::class, 'create'])->name('leadstatuses.create');
        Route::post('lead-statuses', [LeadStatusController::class, 'store'])->name('leadstatuses.store');
    });

    Route::middleware(['permission:drivers.leadstatuses.read'])->group(function () {
        Route::get('lead-statuses', [LeadStatusController::class, 'index'])->name('leadstatuses.index');
        Route::get('lead-statuses/recycle-bin', [LeadStatusController::class, 'recycleBin'])->name('leadstatuses.recycle-bin');
    });

    Route::middleware(['permission:drivers.leadstatuses.export'])->group(function () {
        Route::get('lead-statuses/export', [LeadStatusController::class, 'export'])->name('leadstatuses.export');
    });

    Route::middleware(['permission:drivers.leadstatuses.import'])->group(function () {
        Route::get('lead-statuses/import', [LeadStatusController::class, 'import'])->name('leadstatuses.import');
        Route::post('lead-statuses/import', [LeadStatusController::class, 'importStore'])->name('leadstatuses.import.store');
    });

    Route::middleware(['permission:drivers.leadstatuses.read'])->group(function () {
        Route::get('lead-statuses/{leadStatus}', [LeadStatusController::class, 'show'])->name('leadstatuses.show');
    });

    Route::middleware(['permission:drivers.leadstatuses.update'])->group(function () {
        Route::get('lead-statuses/{leadStatus}/edit', [LeadStatusController::class, 'edit'])->name('leadstatuses.edit');
        Route::put('lead-statuses/{leadStatus}', [LeadStatusController::class, 'update'])->name('leadstatuses.update');
    });

    Route::middleware(['permission:drivers.leadstatuses.delete'])->group(function () {
        Route::delete('lead-statuses/{leadStatus}', [LeadStatusController::class, 'destroy'])->name('leadstatuses.destroy');
    });

    Route::middleware(['permission:drivers.leadstatuses.toggle-active'])->group(function () {
        Route::post('lead-statuses/{leadStatus}/toggle-active', [LeadStatusController::class, 'toggleActive'])->name('leadstatuses.toggle-active');
        Route::post('lead-statuses/{leadStatus}/move-up', [LeadStatusController::class, 'moveUp'])->name('leadstatuses.move-up');
        Route::post('lead-statuses/{leadStatus}/move-down', [LeadStatusController::class, 'moveDown'])->name('leadstatuses.move-down');
        Route::post('lead-statuses/reorder', [LeadStatusController::class, 'reorder'])->name('leadstatuses.reorder');
    });

    // Lead Stages Management
    Route::middleware(['permission:drivers.leadstages.create'])->group(function () {
        Route::get('lead-stages/create', [LeadStageController::class, 'create'])->name('leadstages.create');
        Route::post('lead-stages', [LeadStageController::class, 'store'])->name('leadstages.store');
    });

    Route::middleware(['permission:drivers.leadstages.read'])->group(function () {
        Route::get('lead-stages', [LeadStageController::class, 'index'])->name('leadstages.index');
        Route::get('lead-stages/recycle-bin', [LeadStageController::class, 'recycleBin'])->name('leadstages.recycle-bin');
    });

    Route::middleware(['permission:drivers.leadstages.export'])->group(function () {
        Route::get('lead-stages/export', [LeadStageController::class, 'export'])->name('leadstages.export');
    });

    Route::middleware(['permission:drivers.leadstages.import'])->group(function () {
        Route::get('lead-stages/import', [LeadStageController::class, 'import'])->name('leadstages.import');
        Route::post('lead-stages/import', [LeadStageController::class, 'importStore'])->name('leadstages.import.store');
    });

    Route::middleware(['permission:drivers.leadstages.read'])->group(function () {
        Route::get('lead-stages/{leadStage}', [LeadStageController::class, 'show'])->name('leadstages.show');
    });

    Route::middleware(['permission:drivers.leadstages.update'])->group(function () {
        Route::get('lead-stages/{leadStage}/edit', [LeadStageController::class, 'edit'])->name('leadstages.edit');
        Route::put('lead-stages/{leadStage}', [LeadStageController::class, 'update'])->name('leadstages.update');
    });

    Route::middleware(['permission:drivers.leadstages.delete'])->group(function () {
        Route::delete('lead-stages/{leadStage}', [LeadStageController::class, 'destroy'])->name('leadstages.destroy');
    });

    Route::middleware(['permission:drivers.leadstages.toggle-active'])->group(function () {
        Route::post('lead-stages/{leadStage}/toggle-active', [LeadStageController::class, 'toggleActive'])->name('leadstages.toggle-active');
        Route::post('lead-stages/{leadStage}/move-up', [LeadStageController::class, 'moveUp'])->name('leadstages.move-up');
        Route::post('lead-stages/{leadStage}/move-down', [LeadStageController::class, 'moveDown'])->name('leadstages.move-down');
        Route::post('lead-stages/reorder', [LeadStageController::class, 'reorder'])->name('leadstages.reorder');
    });

    // Driver Documents Management
    Route::middleware(['permission:drivers.driverdocuments.create'])->group(function () {
        Route::get('driver-documents/create', [DriverDocumentController::class, 'create'])->name('driverdocuments.create');
        Route::post('driver-documents', [DriverDocumentController::class, 'store'])->name('driverdocuments.store');
    });

    Route::middleware(['permission:drivers.driverdocuments.read'])->group(function () {
        Route::get('driver-documents', [DriverDocumentController::class, 'index'])->name('driverdocuments.index');
        Route::get('driver-documents/recycle-bin', [DriverDocumentController::class, 'recycleBin'])->name('driverdocuments.recycle-bin');
    });

    Route::middleware(['permission:drivers.driverdocuments.export'])->group(function () {
        Route::get('driver-documents/export', [DriverDocumentController::class, 'export'])->name('driverdocuments.export');
    });

    Route::middleware(['permission:drivers.driverdocuments.view'])->group(function () {
        Route::get('driver-documents/{driverDocument}/view', [DriverDocumentController::class, 'view'])->name('driverdocuments.view');
    });

    Route::middleware(['permission:drivers.driverdocuments.download'])->group(function () {
        Route::get('driver-documents/{driverDocument}/download', [DriverDocumentController::class, 'download'])->name('driverdocuments.download');
    });

    Route::middleware(['permission:drivers.driverdocuments.read'])->group(function () {
        Route::get('driver-documents/{driverDocument}', [DriverDocumentController::class, 'show'])->name('driverdocuments.show');
    });

    Route::middleware(['permission:drivers.driverdocuments.update'])->group(function () {
        Route::get('driver-documents/{driverDocument}/edit', [DriverDocumentController::class, 'edit'])->name('driverdocuments.edit');
        Route::put('driver-documents/{driverDocument}', [DriverDocumentController::class, 'update'])->name('driverdocuments.update');
    });

    Route::middleware(['permission:drivers.driverdocuments.delete'])->group(function () {
        Route::delete('driver-documents/{driverDocument}', [DriverDocumentController::class, 'destroy'])->name('driverdocuments.destroy');
        Route::delete('driver-documents', [DriverDocumentController::class, 'destroyAll'])->name('driverdocuments.destroy-all');
        Route::post('driver-documents/delete-by-name-and-company', [DriverDocumentController::class, 'deleteByNameAndCompany'])->name('driverdocuments.delete-by-name-and-company');
    });

    Route::middleware(['permission:drivers.driverdocuments.replace'])->group(function () {
        Route::post('driver-documents/{driverDocument}/upload', [DriverDocumentController::class, 'upload'])->name('driverdocuments.upload');
    });

    Route::middleware(['permission:drivers.driverdocuments.delete-file'])->group(function () {
        Route::delete('driver-documents/{driverDocument}/delete-file', [DriverDocumentController::class, 'deleteFile'])->name('driverdocuments.delete-file');
    });

    Route::middleware(['permission:drivers.driverdocuments.approve'])->group(function () {
        Route::post('driver-documents/{driverDocument}/approve', [DriverDocumentController::class, 'approve'])->name('driverdocuments.approve');
    });

    Route::middleware(['permission:drivers.driverdocuments.reject'])->group(function () {
        Route::post('driver-documents/{driverDocument}/reject', [DriverDocumentController::class, 'reject'])->name('driverdocuments.reject');
    });

    Route::middleware(['permission:drivers.driverdocuments.set-pending,drivers.driverdocuments.set-approved,drivers.driverdocuments.set-rejected'])->group(function () {
        Route::post('driver-documents/{driverDocument}/update-status', [DriverDocumentController::class, 'updateStatus'])->name('driverdocuments.update-status');
    });

    // Driver Follow-ups Management
    Route::middleware(['permission:drivers.driverfollowups.create'])->group(function () {
        Route::get('driver-follow-ups/create', [DriverFollowUpController::class, 'create'])->name('driverfollowups.create');
        Route::post('driver-follow-ups', [DriverFollowUpController::class, 'store'])->name('driverfollowups.store');
    });

    Route::middleware(['permission:drivers.driverfollowups.read'])->group(function () {
        Route::get('driver-follow-ups', [DriverFollowUpController::class, 'index'])->name('driverfollowups.index');
        Route::get('driver-follow-ups/recycle-bin', [DriverFollowUpController::class, 'recycleBin'])->name('driverfollowups.recycle-bin');
        Route::get('driver-follow-ups/export', [DriverFollowUpController::class, 'export'])->name('driverfollowups.export');
    });

    // Static paths must be registered before {driverFollowUp} so "mass-edit" is not matched as an id
    Route::middleware(['permission:drivers.driverfollowups.mass-edit'])->group(function () {
        Route::get('driver-follow-ups/mass-edit', [DriverFollowUpController::class, 'massEdit'])->name('driverfollowups.mass-edit');
        Route::post('driver-follow-ups/mass-update', [DriverFollowUpController::class, 'massUpdate'])->name('driverfollowups.mass-update');
    });

    Route::middleware(['permission:drivers.driverfollowups.mass-delete'])->group(function () {
        Route::post('driver-follow-ups/mass-delete', [DriverFollowUpController::class, 'massDelete'])->name('driverfollowups.mass-delete');
    });

    Route::middleware(['permission:drivers.driverfollowups.read'])->group(function () {
        Route::get('driver-follow-ups/{driverFollowUp}', [DriverFollowUpController::class, 'show'])->name('driverfollowups.show');
    });

    Route::middleware(['permission:drivers.driverfollowups.update'])->group(function () {
        Route::get('driver-follow-ups/{driverFollowUp}/edit', [DriverFollowUpController::class, 'edit'])->name('driverfollowups.edit');
        Route::put('driver-follow-ups/{driverFollowUp}', [DriverFollowUpController::class, 'update'])->name('driverfollowups.update');
    });

    Route::middleware(['permission:drivers.driverfollowups.delete'])->group(function () {
        Route::delete('driver-follow-ups/{driverFollowUp}', [DriverFollowUpController::class, 'destroy'])->name('driverfollowups.destroy');
    });
});
