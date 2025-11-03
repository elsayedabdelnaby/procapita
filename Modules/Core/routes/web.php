<?php

use Illuminate\Support\Facades\Route;
use Modules\Core\app\Http\Controllers\CompanyController;
use Modules\Core\app\Http\Controllers\RoleController;
use Modules\Core\app\Http\Controllers\UserController;

Route::middleware(['auth', 'verified'])->prefix('core')->name('core.')->group(function () {
    // Companies Management (Super Admin Only)
    Route::middleware(['super.admin'])->group(function () {
        Route::resource('companies', CompanyController::class);
        Route::post('companies/{company}/activate', [CompanyController::class, 'activate'])->name('companies.activate');
        Route::post('companies/{company}/deactivate', [CompanyController::class, 'deactivate'])->name('companies.deactivate');
    });

    // Roles Management
    Route::middleware(['company.access'])->group(function () {
        Route::get('roles/hierarchy', [RoleController::class, 'hierarchy'])->name('roles.hierarchy');
        Route::resource('roles', RoleController::class);
    });

    // Users Management
    Route::middleware(['company.access'])->group(function () {
        Route::resource('users', UserController::class);
        Route::post('users/{user}/activate', [UserController::class, 'activate'])->name('users.activate');
        Route::post('users/{user}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');
    });
});
