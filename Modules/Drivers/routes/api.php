<?php

use Illuminate\Support\Facades\Route;
use Modules\Drivers\Http\Controllers\DriversController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('drivers', DriversController::class)->names('drivers');
});
