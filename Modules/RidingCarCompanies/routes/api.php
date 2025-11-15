<?php

use Illuminate\Support\Facades\Route;
use Modules\RidingCarCompanies\Http\Controllers\RidingCarCompaniesController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('ridingcarcompanies', RidingCarCompaniesController::class)->names('ridingcarcompanies');
});
