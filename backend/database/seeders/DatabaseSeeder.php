<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
            'is_admin' => true,
        ]);

        $events = [
            ['Laravel Workshop',   '2026-11-23', 30, 'Hands-on Laravel API session.'],
            ['React Meetup',       '2026-11-26', 20, 'Same date as Laravel Workshop (for testing).'],
            ['PHP Conference',     '2026-12-05', 100, 'Annual PHP community event.'],
            ['Tiny Roundtable',    '2026-12-10', 1,  'Only 1 slot (for testing full state).'],
            ['DevOps Bootcamp',    '2026-12-15', 50, 'CI/CD and Docker basics.'],
        ];

        foreach ($events as [$title, $date, $max, $desc]) {
            Event::create([
                'title' => $title,
                'event_date' => $date,
                'max_attendees' => $max,
                'description' => $desc,
            ]);
        }
    }
}