<?php

use Illuminate\Support\Facades\Route;
use Modules\RecycleBin\Http\Controllers\RecycleBinController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('recyclebins', RecycleBinController::class)->names('recyclebin');
});
