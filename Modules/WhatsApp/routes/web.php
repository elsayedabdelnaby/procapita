<?php

use Illuminate\Support\Facades\Route;
use Modules\WhatsApp\app\Http\Controllers\WhatsAppController;

Route::middleware(['auth', 'verified'])->prefix('whatsapp')->name('whatsapp.')->group(function () {
    // Company routes
    Route::get('companies/{company}/session', [WhatsAppController::class, 'getSession'])->name('companies.session');
    Route::post('companies/{company}/generate-qr', [WhatsAppController::class, 'generateQRCode'])->name('companies.generate-qr');
    Route::get('companies/{company}/status', [WhatsAppController::class, 'getStatus'])->name('companies.status');
    Route::post('companies/{company}/disconnect', [WhatsAppController::class, 'disconnect'])->name('companies.disconnect');
    
    // Riding Company routes
    Route::get('riding-companies/{ridingCompany}/status', [WhatsAppController::class, 'getRidingCompanyStatus'])->name('riding-companies.status');
    Route::post('riding-companies/{ridingCompany}/generate-qr', [WhatsAppController::class, 'generateRidingCompanyQRCode'])->name('riding-companies.generate-qr');
    Route::post('riding-companies/{ridingCompany}/disconnect', [WhatsAppController::class, 'disconnectRidingCompany'])->name('riding-companies.disconnect');
});

// Webhook endpoint for receiving messages from Node.js service (no auth required, but should be protected by secret token)
Route::post('whatsapp/webhook/message', [WhatsAppController::class, 'receiveMessage'])->name('whatsapp.webhook.message');
