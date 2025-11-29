<?php

use Illuminate\Support\Facades\Route;
use Modules\RecycleBin\app\Http\Controllers\RecycleBinController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/recyclebin', [RecycleBinController::class, 'index'])->name('recyclebin.index');
    Route::get('/recyclebin/{modelType}/{id}', [RecycleBinController::class, 'show'])->name('recyclebin.show');
    Route::post('/recyclebin/{modelType}/{id}/restore', [RecycleBinController::class, 'restore'])->name('recyclebin.restore');
    Route::delete('/recyclebin/{modelType}/{id}', [RecycleBinController::class, 'forceDelete'])->name('recyclebin.force-delete');
});
