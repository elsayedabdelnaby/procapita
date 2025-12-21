<?php

use Illuminate\Support\Facades\Route;
use Modules\RidingCarCompanies\app\Http\Controllers\FacebookIntegrationController;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

// Facebook OAuth callback (outside auth middleware as it comes from Facebook)
Route::get('ridingcarcompanies/facebook/callback', [FacebookIntegrationController::class, 'callback'])
    ->name('ridingcarcompanies.facebook.callback');

// Facebook Data Deletion Callback (outside auth middleware as it comes from Facebook)
Route::match(['get', 'post'], 'ridingcarcompanies/facebook/data-deletion-callback', [FacebookIntegrationController::class, 'dataDeletionCallback'])
    ->name('ridingcarcompanies.facebook.data-deletion-callback');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
