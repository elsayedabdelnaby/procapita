<?php

use Illuminate\Support\Facades\Route;
use Modules\WhatsApp\Http\Controllers\WhatsAppController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('whatsapps', WhatsAppController::class)->names('whatsapp');
});
