<?php

namespace Modules\WhatsApp\app\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Core\app\Models\Company;

class WhatsAppSession extends Model
{
    use HasFactory;

    protected $table = 'whatsapp_sessions';

    protected $fillable = [
        'company_id',
        'phone_number',
        'session_id',
        'status',
        'qr_code',
        'qr_code_expires_at',
        'session_data',
        'last_connected_at',
    ];

    protected function casts(): array
    {
        return [
            'qr_code_expires_at' => 'datetime',
            'last_connected_at' => 'datetime',
            'session_data' => 'array',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(WhatsAppMessage::class);
    }
}

