<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRegistrationRequest;
use App\Models\Event;
use App\Models\Registration;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RegistrationController extends Controller
{
    public function store(StoreRegistrationRequest $request): JsonResponse
    {
        $data = $request->validated();

        try {
            $result = DB::transaction(function () use ($data) {
                // 1) 鎖住該活動這一列：同一活動的併發報名會排隊，避免超賣
                $event = Event::lockForUpdate()->find($data['event_id']);

                if (! $event) {
                    return ['status' => 404, 'message' => 'Event not found.'];
                }

                // 2) 名額檢查
                $count = Registration::where('event_id', $event->id)->count();
                if ($count >= $event->max_attendees) {
                    return ['status' => 409, 'message' => 'This event is full.'];
                }

                // 3) 同一天檢查（第一層防線，給友善訊息）
                $sameDay = Registration::where('email', $data['email'])
                    ->whereDate('event_date', $event->event_date)
                    ->exists();

                if ($sameDay) {
                    return ['status' => 409, 'message' => 'You already registered for an event on this date.'];
                }

                // 4) 寫入（UNIQUE(email, event_date) 是第二層防線）
                Registration::create([
                    'event_id'   => $event->id,
                    'name'       => $data['name'],
                    'email'      => $data['email'],
                    'event_date' => $event->event_date,
                ]);

                return ['status' => 201, 'message' => 'Registered successfully.'];
            });
        } catch (QueryException $e) {
            // 同一人同時報名「同一天不同活動」→ 兩個交易鎖不同列，由 UNIQUE 索引擋下
            if (($e->errorInfo[1] ?? null) === 1062) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already registered for an event on this date.',
                ], 409);
            }
            throw $e;
        }

        return response()->json([
            'success' => $result['status'] === 201,
            'message' => $result['message'],
        ], $result['status']);
    }

    // Bonus：取消報名
    public function destroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_id' => ['required', 'integer'],
            'email'    => ['required', 'email'],
        ]);

        $deleted = DB::transaction(function () use ($validated) {
            // 同樣鎖活動列，讓取消與報名序列化
            Event::lockForUpdate()->find($validated['event_id']);

            return Registration::where('event_id', $validated['event_id'])
                ->where('email', strtolower(trim($validated['email'])))
                ->delete();
        });

        if ($deleted === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Registration not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Registration cancelled successfully.',
        ]);
    }
}