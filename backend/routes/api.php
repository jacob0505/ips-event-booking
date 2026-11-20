<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\RegistrationController;
use Illuminate\Support\Facades\Route;

// Public
Route::get('/events', [EventController::class, 'index']);
Route::post('/registrations', [RegistrationController::class, 'store'])->middleware('throttle:20,1');
Route::delete('/registrations', [RegistrationController::class, 'destroy'])->middleware('throttle:20,1');

Route::post('/admin/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// Admin (Bearer token)
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::post('/events', [EventController::class, 'store']);
    Route::put('/events/{event}', [EventController::class, 'update']);
    Route::delete('/events/{event}', [EventController::class, 'destroy']);
    Route::post('/events/bulk-delete', [EventController::class, 'bulkDestroy']);
    Route::get('/events/upcoming', [EventController::class, 'upcoming']);
    Route::get('/events/{event}/registrations', [EventController::class, 'attendees']);
    Route::get('/events/{event}/registrations/pdf', [EventController::class, 'attendeesPdf']);
    Route::post('/logout', [AuthController::class, 'logout']);
});