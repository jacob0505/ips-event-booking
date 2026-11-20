<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /*
      Run the migrations.
     
    public function up(): void
    {
        Schema::create('registrations', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });
    }
    */
    public function up(): void
    {
        Schema::create('registrations', function (Blueprint $table) {
            $table->id();
            /*$table->foreignId('event_id')->constrained()->cascadeOnDelete(); 萬一有程式漏了檢查，報名紀錄會被默默刪掉*/
            $table->foreignId('event_id')->constrained()->restrictOnDelete();
            $table->string('name', 100);
            $table->string('email');
            $table->date('event_date');
            $table->timestamps();

            $table->unique(['email', 'event_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('registrations');
    }
};
