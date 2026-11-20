<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 12px; color: #222; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .meta { color: #555; margin-bottom: 16px; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #999; padding: 7px 8px; text-align: left; }
        th { background: #eee; }
        .no { width: 30px; text-align: center; }
        .sign { width: 110px; }
        .footer { margin-top: 16px; color: #777; font-size: 10px; }
    </style>
</head>
<body>
    <h1>Attendee List</h1>
    <div class="meta">
        <strong>Event:</strong> {{ $event->title }}<br>
        <strong>Date:</strong> {{ $event->event_date->format('Y-m-d') }}<br>
        <strong>Registered:</strong> {{ $attendees->count() }} / {{ $event->max_attendees }}
    </div>

    <table>
        <thead>
            <tr>
                <th class="no">#</th>
                <th>Name</th>
                <th>Email</th>
                <th class="sign">Check-in</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($attendees as $i => $a)
                <tr>
                    <td class="no">{{ $i + 1 }}</td>
                    <td>{{ $a->name }}</td>
                    <td>{{ $a->email }}</td>
                    <td></td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">Printed at {{ $printedAt }}</div>
</body>
</html>