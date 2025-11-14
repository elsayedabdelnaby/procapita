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

        // Company-scoped Users Management
        Route::prefix('companies/{company}')->name('companies.')->group(function () {
            Route::get('users', [UserController::class, 'index'])->name('users.index');
            Route::get('users/create', [UserController::class, 'create'])->name('users.create');
            Route::post('users', [UserController::class, 'store'])->name('users.store');
            Route::get('users/{user}', [UserController::class, 'show'])->name('users.show');
            Route::get('users/{user}/edit', [UserController::class, 'edit'])->name('users.edit');
            Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
            Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
            Route::post('users/{user}/activate', [UserController::class, 'activate'])->name('users.activate');
            Route::post('users/{user}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');
        });

        // Company-scoped Roles Management
        Route::prefix('companies/{company}')->name('companies.')->group(function () {
            Route::get('roles/hierarchy', [RoleController::class, 'hierarchy'])->name('roles.hierarchy');
            Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
            Route::get('roles/create', [RoleController::class, 'create'])->name('roles.create');
            Route::post('roles', [RoleController::class, 'store'])->name('roles.store');
            Route::get('roles/{role}', [RoleController::class, 'show'])->name('roles.show');
            Route::get('roles/{role}/edit', [RoleController::class, 'edit'])->name('roles.edit');
            Route::put('roles/{role}', [RoleController::class, 'update'])->name('roles.update');
            Route::delete('roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');
        });
    });
});
