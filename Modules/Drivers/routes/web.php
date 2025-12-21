<?php

use Illuminate\Support\Facades\Route;
use Modules\Drivers\app\Http\Controllers\DriverController;
use Modules\Drivers\app\Http\Controllers\DriverDocumentController;
use Modules\Drivers\app\Http\Controllers\DriverFollowUpController;
use Modules\Drivers\app\Http\Controllers\DriverStageController;
use Modules\Drivers\app\Http\Controllers\LeadSourceController;
use Modules\Drivers\app\Http\Controllers\LeadStatusController;
use Modules\Drivers\app\Http\Controllers\LeadStageController;

Route::middleware(['auth', 'verified'])->prefix('drivers')->name('drivers.')->group(function () {
    // Drivers Management
    Route::middleware(['permission:drivers.drivers.create'])->group(function () {
        Route::get('drivers/create', [DriverController::class, 'create'])->name('drivers.create');
        Route::post('drivers', [DriverController::class, 'store'])->name('drivers.store');
    });

    Route::middleware(['permission:drivers.drivers.read'])->group(function () {
        Route::get('drivers', [DriverController::class, 'index'])->name('drivers.index');
        Route::get('drivers/recycle-bin', [DriverController::class, 'recycleBin'])->name('drivers.recycle-bin');
    });

    Route::middleware(['permission:drivers.drivers.export'])->group(function () {
        Route::get('drivers/export', [DriverController::class, 'export'])->name('drivers.export');
    });

    // Import routes - must be before drivers/{driver} route to avoid route matching conflicts
    Route::middleware(['permission:drivers.drivers.import'])->group(function () {
        Route::get('drivers/import/download/{type}', [DriverController::class, 'downloadImportDetails'])
            ->where('type', 'created|skipped|updated')
            ->name('drivers.import.download');
        Route::post('drivers/import', [DriverController::class, 'importStore'])->name('drivers.import.store');
        Route::get('drivers/import/results', [DriverController::class, 'importResults'])->name('drivers.import.results');
    });

    // Mass edit route - must be before drivers/{driver} route to avoid route matching conflicts
    Route::middleware(['permission:drivers.drivers.mass-edit'])->group(function () {
        Route::get('drivers/mass-edit', [DriverController::class, 'massEdit'])->name('drivers.mass-edit');
        Route::post('drivers/mass-update', [DriverController::class, 'massUpdate'])->name('drivers.mass-update');
    });

    // Merge route - must be before drivers/{driver} route to avoid route matching conflicts
    Route::middleware(['permission:drivers.drivers.update'])->group(function () {
        Route::post('drivers/merge', [DriverController::class, 'merge'])->name('drivers.merge');
    });

    Route::middleware(['permission:drivers.drivers.read'])->group(function () {
        Route::get('drivers/{driver}/details', [DriverController::class, 'details'])->name('drivers.details');
        Route::get('drivers/{driver}', [DriverController::class, 'show'])->name('drivers.show');
    });

    Route::middleware(['permission:drivers.drivers.update'])->group(function () {
        Route::get('drivers/{driver}/edit', [DriverController::class, 'edit'])->name('drivers.edit');
        Route::put('drivers/{driver}', [DriverController::class, 'update'])->name('drivers.update');
    });

    Route::middleware(['permission:drivers.drivers.delete'])->group(function () {
        Route::delete('drivers/{driver}', [DriverController::class, 'destroy'])->name('drivers.destroy');
    });

    Route::middleware(['permission:drivers.drivers.mass-delete'])->group(function () {
        Route::post('drivers/mass-delete', [DriverController::class, 'massDelete'])->name('drivers.mass-delete');
    });

    Route::middleware(['permission:drivers.drivers.assign'])->group(function () {
        Route::post('drivers/{driver}/assign', [DriverController::class, 'assign'])->name('drivers.assign');
    });

    // Lead Sources Management
    Route::middleware(['permission:drivers.leadsources.create'])->group(function () {
        Route::get('lead-sources/create', [LeadSourceController::class, 'create'])->name('leadsources.create');
        Route::post('lead-sources', [LeadSourceController::class, 'store'])->name('leadsources.store');
    });

    Route::middleware(['permission:drivers.leadsources.read'])->group(function () {
        Route::get('lead-sources', [LeadSourceController::class, 'index'])->name('leadsources.index');
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

    // Driver Stages Management
    Route::middleware(['permission:drivers.driverstages.create'])->group(function () {
        Route::get('driver-stages/create', [DriverStageController::class, 'create'])->name('driverstages.create');
        Route::post('driver-stages', [DriverStageController::class, 'store'])->name('driverstages.store');
    });

    Route::middleware(['permission:drivers.driverstages.read'])->group(function () {
        Route::get('driver-stages', [DriverStageController::class, 'index'])->name('driverstages.index');
    });

    Route::middleware(['permission:drivers.driverstages.export'])->group(function () {
        Route::get('driver-stages/export', [DriverStageController::class, 'export'])->name('driverstages.export');
    });

    Route::middleware(['permission:drivers.driverstages.read'])->group(function () {
        Route::get('driver-stages/{driverStage}', [DriverStageController::class, 'show'])->name('driverstages.show');
    });

    Route::middleware(['permission:drivers.driverstages.update'])->group(function () {
        Route::get('driver-stages/{driverStage}/edit', [DriverStageController::class, 'edit'])->name('driverstages.edit');
        Route::put('driver-stages/{driverStage}', [DriverStageController::class, 'update'])->name('driverstages.update');
    });

    Route::middleware(['permission:drivers.driverstages.delete'])->group(function () {
        Route::delete('driver-stages/{driverStage}', [DriverStageController::class, 'destroy'])->name('driverstages.destroy');
    });

    Route::middleware(['permission:drivers.driverstages.complete'])->group(function () {
        Route::post('driver-stages/{driverStage}/complete', [DriverStageController::class, 'complete'])->name('driverstages.complete');
    });

    Route::middleware(['permission:drivers.driverstages.reject'])->group(function () {
        Route::post('driver-stages/{driverStage}/reject', [DriverStageController::class, 'reject'])->name('driverstages.reject');
    });

    // Driver Documents Management
    Route::middleware(['permission:drivers.driverdocuments.create'])->group(function () {
        Route::get('driver-documents/create', [DriverDocumentController::class, 'create'])->name('driverdocuments.create');
        Route::post('driver-documents', [DriverDocumentController::class, 'store'])->name('driverdocuments.store');
    });

    Route::middleware(['permission:drivers.driverdocuments.read'])->group(function () {
        Route::get('driver-documents', [DriverDocumentController::class, 'index'])->name('driverdocuments.index');
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
        Route::get('driver-follow-ups/export', [DriverFollowUpController::class, 'export'])->name('driverfollowups.export');
        Route::get('driver-follow-ups/{driverFollowUp}', [DriverFollowUpController::class, 'show'])->name('driverfollowups.show');
    });

    // Mass edit route - must be before driver-follow-ups/{driverFollowUp} route to avoid route matching conflicts
    Route::middleware(['permission:drivers.driverfollowups.mass-edit'])->group(function () {
        Route::get('driver-follow-ups/mass-edit', [DriverFollowUpController::class, 'massEdit'])->name('driverfollowups.mass-edit');
        Route::post('driver-follow-ups/mass-update', [DriverFollowUpController::class, 'massUpdate'])->name('driverfollowups.mass-update');
    });

    Route::middleware(['permission:drivers.driverfollowups.update'])->group(function () {
        Route::get('driver-follow-ups/{driverFollowUp}/edit', [DriverFollowUpController::class, 'edit'])->name('driverfollowups.edit');
        Route::put('driver-follow-ups/{driverFollowUp}', [DriverFollowUpController::class, 'update'])->name('driverfollowups.update');
    });

    Route::middleware(['permission:drivers.driverfollowups.delete'])->group(function () {
        Route::delete('driver-follow-ups/{driverFollowUp}', [DriverFollowUpController::class, 'destroy'])->name('driverfollowups.destroy');
    });

    Route::middleware(['permission:drivers.driverfollowups.mass-delete'])->group(function () {
        Route::post('driver-follow-ups/mass-delete', [DriverFollowUpController::class, 'massDelete'])->name('driverfollowups.mass-delete');
    });
});
