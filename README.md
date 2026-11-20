# Mini Event Booking System

Full-Stack Developer Technical Assessment – IPS Software Sdn. Bhd.

A small event booking system where users can view events and register for them. A user cannot register for more than one event on the same date, and every event has a capacity limit. An admin can manage events, see who registered, and print an attendee list.

- **Frontend:** React (Vite) + Axios + React Router
- **Backend:** Laravel (REST API only, no Blade views) + Sanctum
- **Database:** MySQL

---

## Table of Contents

1. [Features](#1-features)
2. [Project Structure](#2-project-structure)
3. [Setup Instructions](#3-setup-instructions)
4. [Assumptions (Ambiguities in the Brief)](#4-assumptions-ambiguities-in-the-brief)
5. [Database Structure](#5-database-structure)
6. [Validation Logic](#6-validation-logic)
7. [Concurrency Handling (Race Conditions)](#7-concurrency-handling-race-conditions)
8. [API Reference](#8-api-reference)
9. [Security Notes](#9-security-notes)
10. [Testing Guide](#10-testing-guide)
11. [Bonus Features Checklist](#11-bonus-features-checklist)
12. [Known Limitations & Future Improvements](#12-known-limitations--future-improvements)

---

## 1. Features

### Public users (no login required)

- View all events with title, date and available slots
- Filter events by date
- Register with name and email
- Cancel own registration (by email); the slot is released immediately
- "Full" events have the register button disabled
- Light / dark theme toggle
- Loading, error and empty states are handled everywhere

### Admin (token authentication)

- Login / logout
- Create, edit, delete events
- **Events that already have registrations cannot be edited or deleted**
- Bulk delete by checkbox selection (events with registrations are skipped)
- Filter events by date
- Notification bell for events happening within the next 3 days (header badge + bell next to the event row)
- View the attendee list of an event
- Download the attendee list as a PDF (sorted by name, with a blank check-in column for on-site use)

---

## 2. Project Structure

```
ips-event-booking/
├── README.md
├── backend/                       # Laravel API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/       # EventController, RegistrationController, AuthController
│   │   │   ├── Middleware/        # EnsureUserIsAdmin
│   │   │   └── Requests/          # StoreRegistrationRequest, StoreEventRequest
│   │   └── Models/                # Event, Registration, User
│   ├── bootstrap/app.php          # middleware alias + JSON error rendering
│   ├── config/cors.php
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/DatabaseSeeder.php
│   ├── resources/views/pdf/attendees.blade.php
│   └── routes/api.php
└── frontend/                      # React (Vite)
    └── src/
        ├── api/                   # axios client + API functions
        ├── components/            # EventCard, RegistrationForm, InputField, Alert,
        │                          # NotificationBell, AttendeesModal, ProtectedRoute,
        │                          # ThemeToggle
        ├── hooks/                 # useEvents, useUpcomingEvents, useTheme
        ├── pages/                 # EventsPage, LoginPage, AdminPage
        ├── utils/                 # format helpers
        ├── App.jsx
        └── App.css
```

---

## 3. Setup Instructions

### Requirements

| Tool | Version |
|---|---|
| PHP | 8.2+ (with `mbstring`, `gd`, `pdo_mysql`) |
| Composer | 2.x |
| MySQL / MariaDB | 5.7+ / 10.4+ (XAMPP is fine) |
| Node.js | 20+ |

### 3.1 Backend

1. Create an empty database (e.g. in phpMyAdmin):
   - Name: `event_booking`
   - Collation: `utf8mb4_unicode_ci`
2. Install and configure:

```bash
cd backend
composer install
cp .env.example .env          # Windows PowerShell: copy .env.example .env
php artisan key:generate
```

3. Edit `backend/.env`:

```env
APP_URL=http://127.0.0.1:8000
APP_TIMEZONE=Asia/Kuching

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=event_booking
DB_USERNAME=root
DB_PASSWORD=

SESSION_DRIVER=file
CACHE_STORE=file
```

4. Create the tables and seed sample data:

```bash
php artisan migrate --seed
php artisan serve
```

The API runs at `http://127.0.0.1:8000/api`.


### 3.2 Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

```bash
npm run dev
```

Open `http://localhost:5173`. (Restart `npm run dev` after changing `.env`.)

CORS allows `http://localhost:5173` and `http://127.0.0.1:5173` (see `backend/config/cors.php`).

### 3.3 Demo Accounts and Data

| Role | Credentials |
|---|---|
| Admin | `admin@example.com` / `password123` |
| Public user | No account needed |

Admin login page: `http://localhost:5173/admin/login`

Seeded events are deliberately designed for testing:

| Event | Date | Capacity | Purpose |
|---|---|---|---|
| Laravel Workshop | 2026-12-01 | 30 | Same date as React Meetup |
| React Meetup | 2026-12-01 | 20 | Same-date conflict test |
| PHP Conference | 2026-12-05 | 100 | Normal event |
| Tiny Roundtable | 2026-12-10 | 1 | Full-capacity test |
| DevOps Bootcamp | 2026-12-15 | 50 | Edit / delete test |

---

## 4. Assumptions (Ambiguities in the Brief)

The brief intentionally leaves some requirements open. These are the decisions I made:

| Question | Decision | Reason |
|---|---|---|
| How is a "user" identified without login? | By **email** (trimmed and lower-cased) | The form only collects name and email, so email is the only stable identity |
| What does "same date" mean? | Events have a `DATE` column (no time), so same calendar date | Avoids timezone confusion in the comparison |
| Can the same email register for the same event twice? | No. It is covered by the same-date rule | One registration per email per date |
| What happens on cancellation? | The registration row is deleted; the slot is released and the person can register again | Available slots are *calculated* (`max_attendees - COUNT`), so there is no counter to keep in sync |
| Should "Same name, different email" be treated as the same person? | No | Name is not unique |
| Can an admin edit or delete an event that already has registrations? | **No** | Deleting would silently remove registrants' records, and changing the date would break the same-date data. The admin must not be able to do this |
| Who can cancel a registration? | Anyone who knows the registered email | No login exists, see [limitations](#12-known-limitations--future-improvements) |
| Number of admins | One, created by the seeder | Admin management was not requested |
| "Upcoming" for notifications | Today up to today + 3 days (inclusive), past events are excluded | Calculated on the server using `Asia/Kuching` |

---

## 5. Database Structure

### Tables

**`events`**

| Column | Type | Notes |
|---|---|---|
| id | BIGINT UNSIGNED PK | |
| title | VARCHAR(255) | |
| description | TEXT NULL | |
| event_date | DATE | Indexed |
| max_attendees | INT UNSIGNED | Capacity limit |
| created_at / updated_at | TIMESTAMP | |

**`registrations`**

| Column | Type | Notes |
|---|---|---|
| id | BIGINT UNSIGNED PK | |
| event_id | BIGINT UNSIGNED FK → events.id | `RESTRICT` on delete (see below) |
| name | VARCHAR(100) | |
| email | VARCHAR(255) | Stored lower-case |
| event_date | DATE | **Denormalised copy** of `events.event_date` |
| created_at / updated_at | TIMESTAMP | |
| | **UNIQUE (email, event_date)** | Database-level guarantee |

**`users`** – used by the admin only. Standard Laravel table plus `is_admin BOOLEAN DEFAULT 0`.

**`personal_access_tokens`** – Sanctum API tokens for the admin.

### Design Notes

- **Why `registrations.event_date` is duplicated:** MySQL cannot create a unique index across two tables. Copying the date into `registrations` lets `UNIQUE (email, event_date)` enforce "one event per day per person" in the database itself, which is the final safety net even if application code has a bug or a race.
- **Why this is safe:** the copied date can never go stale because events with registrations cannot be edited.
- **Available slots are never stored.** They are computed as `max_attendees - COUNT(registrations)`, so cancelling needs no counter adjustment and the number cannot drift.
- **`RESTRICT` on the foreign key:** the application refuses to delete events that have registrations, and the database refuses too. A bug in application code therefore cannot silently remove attendee records.

### ER Overview

```
events 1 ──────< registrations
(id, title, event_date, max_attendees)   (id, event_id, name, email, event_date)
                                         UNIQUE(email, event_date)

users (admin only) ── personal_access_tokens
```

---

## 6. Validation Logic

Validation happens on **both sides**. The frontend gives quick feedback, but the backend is the source of truth.

### Registration (`POST /api/registrations`)

| Rule | Where | Result |
|---|---|---|
| `name` required, string, max 100 | FormRequest | 422 |
| `email` required, valid format, max 255 | FormRequest | 422 |
| `event_id` required, integer | FormRequest | 422 |
| Email is trimmed and lower-cased before checking | FormRequest `prepareForValidation` | |
| Event exists | Controller | 404 `Event not found.` |
| Event is not full | Controller (in transaction) | 409 `This event is full.` |
| No existing registration for the same email on the same date | Controller (in transaction) | 409 `You already registered for an event on this date.` |
| Same-date rule again | **UNIQUE index** | 409 (caught from MySQL error 1062) |

### Admin rules

| Rule | Result |
|---|---|
| Create/update: `title` required, `event_date` format `Y-m-d`, `max_attendees` integer ≥ 1 | 422 |
| Edit or delete an event that has registrations | 409 |
| Bulk delete: skips events with registrations, reports which ones | 200 (or 409 if nothing could be deleted) |
| All `/admin/*` routes | 401 without a valid token, 403 if the user is not an admin |

### Response Format

Every response uses the same JSON shape:

```json
{ "success": true,  "message": "Registered successfully." }
{ "success": false, "message": "You already registered for an event on this date." }
```

Validation errors additionally include an `errors` object with per-field messages. HTTP status codes are meaningful: `201` created, `401` unauthenticated, `403` forbidden, `404` not found, `409` business-rule conflict, `422` validation failed, `429` throttled.

---

## 7. Concurrency Handling (Race Conditions)

The risks:

1. **Overbooking:** two people register for the last slot at the same moment. Both read "1 slot left" and both insert.
2. **Same-date duplicates:** one email submits two requests at the same time (double click, or two tabs) for two events on the same date. Both pass the "already registered?" check.
3. **Admin vs. user:** an admin deletes or edits an event at the moment someone registers for it.

### Defence 1: Pessimistic row lock inside a transaction

```php
DB::transaction(function () use ($data) {
    $event = Event::lockForUpdate()->find($data['event_id']);   // SELECT ... FOR UPDATE

    // 1. capacity check
    // 2. same-date check
    // 3. insert registration
});
```

`SELECT ... FOR UPDATE` locks the event row until the transaction commits. A second request for the **same event** waits for the first one to finish, then reads the updated count. The "check capacity → insert" sequence therefore behaves as one atomic step and overbooking is impossible.

### Defence 2: Database unique constraint

The row lock only serialises requests for the **same event**. Two requests from the same email for **different events on the same date** lock different rows and could both pass the application check. This is where `UNIQUE (email, event_date)` takes over: MySQL accepts only one insert, and the second fails with error 1062. The controller catches it and returns the same friendly 409 message as the normal check.

So there are two layers: the application check gives a clean error in the normal case, and the database constraint gives an absolute guarantee in the race case.

### Defence 3: Admin operations use the same lock

`update`, `destroy` and `bulkDestroy` lock the event row with `lockForUpdate()` **before** checking whether registrations exist. A registration and an admin delete/edit for the same event are therefore serialised:

- Registration first → the admin action sees the registration and is rejected with 409.
- Admin delete first → the registration gets `404 Event not found`.

Bulk delete locks the rows `ORDER BY id`, so two concurrent bulk operations always acquire locks in the same order and cannot deadlock each other.

### Other protections

- Cancellation also takes the event lock, so it is serialised with registration.
- `throttle` middleware rate-limits registration/cancellation (20 requests/min) and admin login (10 requests/min).
- The frontend disables the submit button while a request is in flight to avoid double submissions (the backend does not rely on it).
- All writes use Eloquent/PDO prepared statements.

---

## 8. API Reference

Base URL: `http://127.0.0.1:8000/api`

Always send `Accept: application/json`. Admin routes need `Authorization: Bearer <token>`.

### Public

| Method | Endpoint | Description |
|---|---|---|
| GET | `/events` | List events. Optional `?date=YYYY-MM-DD` |
| POST | `/registrations` | Register for an event |
| DELETE | `/registrations` | Cancel a registration |

**GET `/events`**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Laravel Workshop",
      "description": "Hands-on Laravel API session.",
      "event_date": "2026-12-01",
      "max_attendees": 30,
      "registered": 1,
      "available_slots": 29
    }
  ]
}
```

**POST `/registrations`**

```json
// request
{ "event_id": 1, "name": "Ali", "email": "ali@test.com" }

// 201
{ "success": true, "message": "Registered successfully." }

// 409
{ "success": false, "message": "You already registered for an event on this date." }

// 409
{ "success": false, "message": "This event is full." }

// 422
{ "success": false, "message": "The email field must be a valid email address.", "errors": { "email": ["..."] } }
```

**DELETE `/registrations`**

```json
// request body
{ "event_id": 1, "email": "ali@test.com" }

// 200
{ "success": true, "message": "Registration cancelled successfully." }

// 404
{ "success": false, "message": "Registration not found." }
```

### Admin

| Method | Endpoint | Description |
|---|---|---|
| POST | `/admin/login` | Returns a Sanctum token |
| POST | `/admin/logout` | Revokes the current token |
| POST | `/admin/events` | Create event |
| PUT | `/admin/events/{id}` | Update event (409 if it has registrations) |
| DELETE | `/admin/events/{id}` | Delete event (409 if it has registrations) |
| POST | `/admin/events/bulk-delete` | Body `{ "ids": [1,2,3] }`. Deletes events without registrations, skips the rest |
| GET | `/admin/events/upcoming` | Events within the next 3 days (for the bell) |
| GET | `/admin/events/{id}/registrations` | Attendee list (JSON) |
| GET | `/admin/events/{id}/registrations/pdf` | Attendee list (PDF download) |

**POST `/admin/login`**

```json
// request
{ "email": "admin@example.com", "password": "password123" }

// 200
{ "success": true, "message": "Login successful.", "token": "1|abc..." }

// 401
{ "success": false, "message": "Invalid credentials." }
```

**POST `/admin/events/bulk-delete`**

```json
// request
{ "ids": [1, 5] }

// 200 (event 5 deleted, event 1 has registrations)
{
  "success": true,
  "message": "1 event(s) deleted. Skipped (has registrations): Laravel Workshop.",
  "deleted": 1,
  "skipped": ["Laravel Workshop"]
}
```

---

## 9. Security Notes

- **Admin authentication:** Laravel Sanctum bearer tokens. Passwords are hashed with bcrypt. Login returns the same message for wrong email, wrong password, or a non-admin account, so it does not reveal which one failed.
- **Authorization:** every `/admin/*` route passes through `auth:sanctum` and the `admin` middleware, so the protection exists at the API level and not only in the React router.
- **Rate limiting** on login and registration endpoints.
- **SQL injection:** no raw SQL with user input; Eloquent / prepared statements only.
- **CORS** is restricted to the frontend origins.
- **Personal data:** attendee names and emails are only available through admin routes.
- **Uniform JSON errors** for 401 / 404 / 422, so nothing leaks framework HTML or stack traces to API clients.

---

## 10. Testing Guide

### Manual test cases

| # | Scenario | Expected |
|---|---|---|
| 1 | Submit the form with empty fields | Field errors shown, no request sent |
| 2 | Invalid email format | Rejected (frontend and 422 from API) |
| 3 | Register for Laravel Workshop | Success, slots decrease |
| 4 | Same email registers for React Meetup (same date) | 409 same-date message |
| 5 | Register for Tiny Roundtable with one email, then another email | Second attempt: 409 full; card shows **Full** and button is disabled |
| 6 | Cancel registration, then register for another event on the same date | Slot restored, registration succeeds |
| 7 | Filter by date | Only events of that date are shown |
| 8 | Event ID that does not exist | 404 |
| 9 | Admin routes without token | 401 |
| 10 | Admin edit/delete of an event that has registrations (UI and direct API call) | Buttons disabled in UI; API returns 409 |
| 11 | Bulk delete a mix of events with and without registrations | Only the free ones are deleted; skipped ones are named in the message |
| 12 | Create events dated today and in 2 days | Bell badge shows 2; rows show a bell; an event 4 days away does not |
| 13 | Download attendee PDF | File downloads with event info, names sorted alphabetically, blank check-in column |

### Concurrency test (optional)

With a 1-slot event (Tiny Roundtable), fire two registrations with different emails at the same time (e.g. Postman Runner with 2 parallel iterations, or two `curl` commands in parallel). Exactly one returns 201 and the other returns 409. Repeat with the same email for two events on the same date: one 201, one 409 from the unique index.

---

## 11. Bonus Features Checklist

| Bonus item | Status |
|---|---|
| Admin authentication to create or delete events | Done (Sanctum token) |
| User cancellation with capacity re-adjustment | Done (capacity is derived from the registration count) |
| Search / filter events by date | Done (public page and admin page) |
| Deployed demo | Runs locally (see setup) |
| Explanation of concurrency handling | Done, see [section 7](#7-concurrency-handling-race-conditions) |
| API authentication handling | Done (Bearer tokens, `401`/`403`, token cleared on the frontend when rejected) |

### Extra features beyond the brief

- Admin can edit events (locked once someone has registered)
- Bulk delete with selection
- Notification bell for events in the next 3 days
- Attendee list modal and printable PDF with check-in column
- Rate limiting on sensitive endpoints

---

## 12. Known Limitations & Future Improvements

**Limitations of the current design**

- **No email verification.** Identity is just the email string, so anyone who knows another person's email could register or cancel on their behalf. For a production system I would send a confirmation / cancellation link by email, or add user accounts.
- **Admin token is kept in `localStorage`**, which is simple but exposed to XSS. Production hardening would use short-lived tokens, or HttpOnly cookies with Sanctum's SPA mode.
- **Sanctum tokens do not expire** by default; an expiry should be configured.
- **Only one admin**, created by the seeder; no admin management UI and no roles/permissions.
- **PDF fonts:** DomPDF's default font (`DejaVu Sans`) does not contain CJK glyphs. Chinese names would not render correctly unless a CJK font is installed and configured.
- **The bell is not a real notification system.** There is no read/unread state; an event simply appears while it is within 3 days.
- **No automated tests.** Testing was done manually and through Postman; the concurrency scenarios are described above.
- **Events cannot be partially edited once registered** (for example, increasing capacity). This is intentionally strict to keep the data consistent.

**Future improvements**

- Email confirmations and reminders (Laravel Mail + Scheduler), and a real notifications table with read state
- Feature tests for the registration rules and a parallel-request test for the locking
- Pagination and search by title for large event lists
- Allow increasing `max_attendees` for events that already have registrations
- Event start/end times, with an overlap check as an alternative to the same-date rule
- Export attendees to CSV / Excel
- Docker Compose for one-command setup and a hosted demo
