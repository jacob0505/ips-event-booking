<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    protected $fillable = ['title', 'description', 'event_date', 'max_attendees'];

    protected $casts = ['event_date' => 'date'];

    public function registrations(): HasMany
    {
        return $this->hasMany(Registration::class);
    }
}