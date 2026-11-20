<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Registration extends Model
{
    protected $fillable = ['event_id', 'name', 'email', 'event_date'];

    protected $casts = ['event_date' => 'date'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}