<?php

use Illuminate\Support\Facades\Route;
use Modules\WhatsApp\app\Http\Controllers\WhatsAppController;

Route::middleware(['auth', 'verified'])->prefix('whatsapp')->name('whatsapp.')->group(function () {
    Route::get('companies/{company}/session', [WhatsAppController::class, 'getSession'])->name('companies.session');
    Route::post('companies/{company}/generate-qr', [WhatsAppController::class, 'generateQRCode'])->name('companies.generate-qr');
    Route::get('companies/{company}/status', [WhatsAppController::class, 'getStatus'])->name('companies.status');
    Route::post('companies/{company}/disconnect', [WhatsAppController::class, 'disconnect'])->name('companies.disconnect');
});
