<?php

use Illuminate\Support\Facades\Route;
use Modules\Drivers\app\Http\Controllers\DriverController;
use Modules\Drivers\app\Http\Controllers\DriverDocumentController;
use Modules\Drivers\app\Http\Controllers\DriverStageController;
use Modules\Drivers\app\Http\Controllers\LeadSourceController;
use Modules\Drivers\app\Http\Controllers\LeadStatusController;

Route::middleware(['auth', 'verified'])->prefix('drivers')->name('drivers.')->group(function () {
    // Drivers Management
    Route::middleware(['permission:drivers.drivers.create'])->group(function () {
        Route::get('drivers/create', [DriverController::class, 'create'])->name('drivers.create');
        Route::post('drivers', [DriverController::class, 'store'])->name('drivers.store');
    });

    Route::middleware(['permission:drivers.drivers.read'])->group(function () {
        Route::get('drivers', [DriverController::class, 'index'])->name('drivers.index');
        Route::get('drivers/{driver}', [DriverController::class, 'show'])->name('drivers.show');
    });

    Route::middleware(['permission:drivers.drivers.update'])->group(function () {
        Route::get('drivers/{driver}/edit', [DriverController::class, 'edit'])->name('drivers.edit');
        Route::put('drivers/{driver}', [DriverController::class, 'update'])->name('drivers.update');
    });

    Route::middleware(['permission:drivers.drivers.delete'])->group(function () {
        Route::delete('drivers/{driver}', [DriverController::class, 'destroy'])->name('drivers.destroy');
    });

    Route::middleware(['permission:drivers.drivers.assign'])->group(function () {
        Route::post('drivers/{driver}/assign', [DriverController::class, 'assign'])->name('drivers.assign');
    });

    Route::middleware(['permission:drivers.drivers.export'])->group(function () {
        Route::get('drivers/export', [DriverController::class, 'export'])->name('drivers.export');
    });

    Route::middleware(['permission:drivers.drivers.import'])->group(function () {
        Route::get('drivers/import', [DriverController::class, 'import'])->name('drivers.import');
        Route::post('drivers/import', [DriverController::class, 'importStore'])->name('drivers.import.store');
    });

    // Lead Sources Management
    Route::middleware(['permission:drivers.leadsources.create'])->group(function () {
        Route::get('lead-sources/create', [LeadSourceController::class, 'create'])->name('leadsources.create');
        Route::post('lead-sources', [LeadSourceController::class, 'store'])->name('leadsources.store');
    });

    Route::middleware(['permission:drivers.leadsources.read'])->group(function () {
        Route::get('lead-sources', [LeadSourceController::class, 'index'])->name('leadsources.index');
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

    Route::middleware(['permission:drivers.leadsources.export'])->group(function () {
        Route::get('lead-sources/export', [LeadSourceController::class, 'export'])->name('leadsources.export');
    });

    Route::middleware(['permission:drivers.leadsources.import'])->group(function () {
        Route::get('lead-sources/import', [LeadSourceController::class, 'import'])->name('leadsources.import');
        Route::post('lead-sources/import', [LeadSourceController::class, 'importStore'])->name('leadsources.import.store');
    });

    // Lead Statuses Management
    Route::middleware(['permission:drivers.leadstatuses.create'])->group(function () {
        Route::get('lead-statuses/create', [LeadStatusController::class, 'create'])->name('leadstatuses.create');
        Route::post('lead-statuses', [LeadStatusController::class, 'store'])->name('leadstatuses.store');
    });

    Route::middleware(['permission:drivers.leadstatuses.read'])->group(function () {
        Route::get('lead-statuses', [LeadStatusController::class, 'index'])->name('leadstatuses.index');
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
    });

    Route::middleware(['permission:drivers.leadstatuses.export'])->group(function () {
        Route::get('lead-statuses/export', [LeadStatusController::class, 'export'])->name('leadstatuses.export');
    });

    Route::middleware(['permission:drivers.leadstatuses.import'])->group(function () {
        Route::get('lead-statuses/import', [LeadStatusController::class, 'import'])->name('leadstatuses.import');
        Route::post('lead-statuses/import', [LeadStatusController::class, 'importStore'])->name('leadstatuses.import.store');
    });

    // Driver Stages Management
    Route::middleware(['permission:drivers.driverstages.create'])->group(function () {
        Route::get('driver-stages/create', [DriverStageController::class, 'create'])->name('driverstages.create');
        Route::post('driver-stages', [DriverStageController::class, 'store'])->name('driverstages.store');
    });

    Route::middleware(['permission:drivers.driverstages.read'])->group(function () {
        Route::get('driver-stages', [DriverStageController::class, 'index'])->name('driverstages.index');
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

    Route::middleware(['permission:drivers.driverstages.export'])->group(function () {
        Route::get('driver-stages/export', [DriverStageController::class, 'export'])->name('driverstages.export');
    });

    // Driver Documents Management
    Route::middleware(['permission:drivers.driverdocuments.create'])->group(function () {
        Route::get('driver-documents/create', [DriverDocumentController::class, 'create'])->name('driverdocuments.create');
        Route::post('driver-documents', [DriverDocumentController::class, 'store'])->name('driverdocuments.store');
    });

    Route::middleware(['permission:drivers.driverdocuments.read'])->group(function () {
        Route::get('driver-documents', [DriverDocumentController::class, 'index'])->name('driverdocuments.index');
        Route::get('driver-documents/{driverDocument}', [DriverDocumentController::class, 'show'])->name('driverdocuments.show');
    });

    Route::middleware(['permission:drivers.driverdocuments.update'])->group(function () {
        Route::get('driver-documents/{driverDocument}/edit', [DriverDocumentController::class, 'edit'])->name('driverdocuments.edit');
        Route::put('driver-documents/{driverDocument}', [DriverDocumentController::class, 'update'])->name('driverdocuments.update');
    });

    Route::middleware(['permission:drivers.driverdocuments.delete'])->group(function () {
        Route::delete('driver-documents/{driverDocument}', [DriverDocumentController::class, 'destroy'])->name('driverdocuments.destroy');
    });

    Route::middleware(['permission:drivers.driverdocuments.upload'])->group(function () {
        Route::post('driver-documents/{driverDocument}/upload', [DriverDocumentController::class, 'upload'])->name('driverdocuments.upload');
    });

    Route::middleware(['permission:drivers.driverdocuments.approve'])->group(function () {
        Route::post('driver-documents/{driverDocument}/approve', [DriverDocumentController::class, 'approve'])->name('driverdocuments.approve');
    });

    Route::middleware(['permission:drivers.driverdocuments.reject'])->group(function () {
        Route::post('driver-documents/{driverDocument}/reject', [DriverDocumentController::class, 'reject'])->name('driverdocuments.reject');
    });

    Route::middleware(['permission:drivers.driverdocuments.download'])->group(function () {
        Route::get('driver-documents/{driverDocument}/download', [DriverDocumentController::class, 'download'])->name('driverdocuments.download');
    });

    Route::middleware(['permission:drivers.driverdocuments.export'])->group(function () {
        Route::get('driver-documents/export', [DriverDocumentController::class, 'export'])->name('driverdocuments.export');
    });
});
