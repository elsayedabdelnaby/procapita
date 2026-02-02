<?php

use App\Http\Controllers\CreateDriverFieldPermissionsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReportFolderController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('dashboard/widgets', [DashboardController::class, 'storeWidget'])->name('dashboard.widgets.store');
    Route::put('dashboard/widgets', [DashboardController::class, 'updateWidgets'])->name('dashboard.widgets.update');
    Route::delete('dashboard/widgets/{report}', [DashboardController::class, 'destroyWidget'])->name('dashboard.widgets.destroy');

    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::post('reports', [ReportController::class, 'store'])->name('reports.store');
    Route::post('reports/folders', [ReportFolderController::class, 'store'])->name('reports.folders.store');
    Route::post('reports/mass-delete', [ReportController::class, 'massDelete'])->name('reports.mass-delete');
    Route::get('reports/{report}', [ReportController::class, 'show'])->name('reports.show');
    Route::get('reports/{report}/edit', [ReportController::class, 'edit'])->name('reports.edit');
    Route::put('reports/{report}', [ReportController::class, 'update'])->name('reports.update');
    Route::put('reports/{report}/preference', [ReportController::class, 'updatePreference'])->name('reports.preference.update');
    Route::delete('reports/{report}', [ReportController::class, 'destroy'])->name('reports.destroy');
    Route::post('reports/{report}/duplicate', [ReportController::class, 'duplicate'])->name('reports.duplicate');
});

// Temporary route to create driver field permissions (only for super admin)
Route::middleware(['auth', 'verified'])->get('/create-driver-field-permissions', CreateDriverFieldPermissionsController::class)
    ->name('create.driver.field.permissions');

require __DIR__.'/settings.php';
