<?php

namespace App\Http\Controllers;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use App\Models\Registration;
use App\Http\Requests\StoreEventRequest;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['date' => ['nullable', 'date_format:Y-m-d']]);

        $events = Event::withCount('registrations')
            ->when($request->query('date'), fn ($q, $d) => $q->whereDate('event_date', $d))
            ->orderBy('event_date')
            ->orderBy('id')
            ->get()
            ->map(fn (Event $e) => [
                'id'              => $e->id,
                'title'           => $e->title,
                'description'     => $e->description,
                'event_date'      => $e->event_date->toDateString(),
                'max_attendees'   => $e->max_attendees,
                'registered'      => $e->registrations_count,
                'available_slots' => max(0, $e->max_attendees - $e->registrations_count),
            ]);

        return response()->json(['success' => true, 'data' => $events]);
    }

    // Admin
    public function store(StoreEventRequest $request): JsonResponse
    {
        $event = Event::create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Event created successfully.',
            'data'    => $event,
        ], 201);
    }

    // Admin
    // Admin：編輯（有人報名就不能改）
    public function update(StoreEventRequest $request, Event $event): JsonResponse
    {
        return DB::transaction(function () use ($request, $event) {
            // 先鎖定活動列，再檢查報名數（與報名 API 使用同一把鎖）
            $locked = Event::lockForUpdate()->find($event->id);

            if (! $locked) {
                return response()->json(['success' => false, 'message' => 'Event not found.'], 404);
            }

            if (Registration::where('event_id', $locked->id)->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This event already has registrations and cannot be edited.',
                ], 409);
            }

            $locked->update($request->validated());

            return response()->json([
                'success' => true,
                'message' => 'Event updated successfully.',
                'data'    => $locked,
            ]);
        });
    }

    // Admin：刪除單筆（有人報名就不能刪）
    public function destroy(Event $event): JsonResponse
    {
        return DB::transaction(function () use ($event) {
            $locked = Event::lockForUpdate()->find($event->id);

            if (! $locked) {
                return response()->json(['success' => false, 'message' => 'Event not found.'], 404);
            }

            if (Registration::where('event_id', $locked->id)->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This event already has registrations and cannot be deleted.',
                ], 409);
            }

            $locked->delete();

            return response()->json(['success' => true, 'message' => 'Event deleted successfully.']);
        });
    }

    // Admin：批量刪除（只刪沒有報名的，其餘跳過）
    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $result = DB::transaction(function () use ($data) {
            // 依 id 排序加鎖，避免多個請求互相等待造成 deadlock
            $events = Event::whereIn('id', $data['ids'])->orderBy('id')->lockForUpdate()->get();

            // 鎖定之後才計算報名，才能確保數字是最新的
            $withRegistrations = Registration::whereIn('event_id', $events->pluck('id'))
                ->pluck('event_id')
                ->unique()
                ->all();

            $deletable = $events->reject(fn ($e) => in_array($e->id, $withRegistrations));
            $skipped   = $events->filter(fn ($e) => in_array($e->id, $withRegistrations));

            Event::whereIn('id', $deletable->pluck('id'))->delete();

            return [
                'deleted' => $deletable->count(),
                'skipped' => $skipped->pluck('title')->values(),
            ];
        });

        if ($result['deleted'] === 0) {
            return response()->json([
                'success' => false,
                'message' => 'No events were deleted. Selected events have registrations or do not exist.',
                'skipped' => $result['skipped'],
            ], 409);
        }

        $message = "{$result['deleted']} event(s) deleted.";
        if ($result['skipped']->isNotEmpty()) {
            $message .= ' Skipped (has registrations): ' . $result['skipped']->implode(', ') . '.';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'deleted' => $result['deleted'],
            'skipped' => $result['skipped'],
        ]);
    }

    // Admin：3 天內即將舉辦的活動（通知用）
    public function upcoming(): JsonResponse
    {
        $today = Carbon::today();

        $events = Event::withCount('registrations')
            ->whereBetween('event_date', [
                $today->toDateString(),
                $today->copy()->addDays(3)->toDateString(),
            ])
            ->orderBy('event_date')
            ->orderBy('id')
            ->get()
            ->map(fn (Event $e) => [
                'id'            => $e->id,
                'title'         => $e->title,
                'event_date'    => $e->event_date->toDateString(),
                'registered'    => $e->registrations_count,
                'max_attendees' => $e->max_attendees,
                'days_until'    => (int) $today->diffInDays($e->event_date, false),
            ]);

        return response()->json(['success' => true, 'data' => $events]);
    }

    // Admin：查看某活動的參加者
    public function attendees(Event $event): JsonResponse
    {
        $attendees = $event->registrations()
            ->orderBy('created_at')->orderBy('id')
            ->get(['id', 'name', 'email', 'created_at']);

        return response()->json([
            'success' => true,
            'data' => [
                'event' => [
                    'id'            => $event->id,
                    'title'         => $event->title,
                    'event_date'    => $event->event_date->toDateString(),
                    'max_attendees' => $event->max_attendees,
                ],
                'attendees' => $attendees,
            ],
        ]);
    }

    // Admin：下載參加者名單 PDF
    public function attendeesPdf(Event $event)
    {
        $attendees = $event->registrations()
            ->orderBy('name')->orderBy('id')
            ->get(['name', 'email', 'created_at']);

        $filename = 'attendees-' . Str::slug($event->title) . '-' . $event->event_date->toDateString() . '.pdf';

        return Pdf::loadView('pdf.attendees', [
            'event'     => $event,
            'attendees' => $attendees,
            'printedAt' => now()->format('Y-m-d H:i'),
        ])->setPaper('a4')->download($filename);
    }

}