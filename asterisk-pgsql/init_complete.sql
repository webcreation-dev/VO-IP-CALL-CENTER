-- ========================================
-- Script d'initialisation complet - Exécuté automatiquement au démarrage
-- ========================================

BEGIN;

-- ========================================
-- 1. QUEUES
-- ========================================

-- Insérer la queue de support (file d'attente principale)
INSERT INTO queues (
    name, 
    musiconhold, 
    strategy, 
    timeout, 
    retry, 
    wrapuptime, 
    maxlen, 
    announce_frequency, 
    announce_holdtime, 
    announce_position,
    periodic_announce,
    periodic_announce_frequency,
    monitor_type,
    monitor_format,
    ringinuse,
    setinterfacevar,
    setqueuevar,
    autofill
) VALUES (
    'support_queue',
    'default',
    'ringall',
    20,
    5,
    15,
    0,
    30,
    'yes',
    'yes',
    'queue-periodic-announce',
    60,
    'MixMonitor',
    'wav',
    'no',
    'yes',
    'yes',
    'yes'
) ON CONFLICT (name) DO UPDATE SET
    musiconhold = EXCLUDED.musiconhold,
    strategy = EXCLUDED.strategy,
    timeout = EXCLUDED.timeout,
    retry = EXCLUDED.retry,
    wrapuptime = EXCLUDED.wrapuptime;

-- Ajouter l'agent 101 à la queue support_queue
INSERT INTO queue_members (
    queue_name, 
    interface, 
    uniqueid, 
    membername, 
    penalty, 
    paused
) VALUES (
    'support_queue',
    'PJSIP/101',
    1,
    'Agent 101',
    0,
    0
) ON CONFLICT (queue_name, interface) DO UPDATE SET
    membername = EXCLUDED.membername,
    penalty = EXCLUDED.penalty,
    paused = EXCLUDED.paused;

-- Ajouter l'agent 102 à la queue support_queue
INSERT INTO queue_members (
    queue_name, 
    interface, 
    uniqueid, 
    membername, 
    penalty, 
    paused
) VALUES (
    'support_queue',
    'PJSIP/102',
    2,
    'Agent 102',
    0,
    0
) ON CONFLICT (queue_name, interface) DO UPDATE SET
    membername = EXCLUDED.membername,
    penalty = EXCLUDED.penalty,
    paused = EXCLUDED.paused;

-- Queue ventes
INSERT INTO queues (
    name, 
    musiconhold, 
    strategy, 
    timeout, 
    retry, 
    wrapuptime, 
    maxlen, 
    monitor_type,
    monitor_format,
    ringinuse,
    autofill
) VALUES (
    'sales_queue',
    'default',
    'rrmemory',
    20,
    5,
    15,
    10,
    'MixMonitor',
    'wav',
    'no',
    'yes'
) ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 2. CALL RECORDINGS
-- ========================================

CREATE TABLE IF NOT EXISTS call_recordings (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    uniqueid VARCHAR(150) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    filesize BIGINT,
    format VARCHAR(10),
    duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    src VARCHAR(80),
    dst VARCHAR(80),
    notes TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_call_recordings_tenant_id ON call_recordings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_uniqueid ON call_recordings (uniqueid);
CREATE INDEX IF NOT EXISTS idx_call_recordings_created_at ON call_recordings (created_at);

-- ========================================
-- 3. VUES SQL
-- ========================================

CREATE OR REPLACE VIEW v_call_history AS
SELECT 
    c.id AS cdr_id,
    c.tenant_id,
    c.uniqueid,
    c.src AS caller,
    c.dst AS called,
    c.dcontext AS context,
    c.channel,
    c.dstchannel,
    c.calldate AS start_time,
    c.answerdate AS answer_time,
    c.enddate AS end_time,
    c.duration AS total_duration,
    c.billsec AS billable_duration,
    c.disposition,
    cr.filename AS recording_filename,
    CASE 
        WHEN cr.id IS NOT NULL THEN 'OUI'
        ELSE 'NON'
    END AS has_recording,
    t.name AS tenant_name
FROM cdr c
LEFT JOIN call_recordings cr ON c.uniqueid = cr.uniqueid AND cr.is_deleted = FALSE
LEFT JOIN tenants t ON c.tenant_id = t.id
ORDER BY c.calldate DESC;

CREATE OR REPLACE VIEW v_call_statistics AS
SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    DATE(c.calldate) AS call_date,
    COUNT(*) AS total_calls,
    COUNT(CASE WHEN c.disposition = 'ANSWERED' THEN 1 END) AS answered_calls,
    COUNT(CASE WHEN c.disposition = 'NO ANSWER' THEN 1 END) AS no_answer_calls,
    SUM(c.duration) AS total_duration_seconds,
    SUM(c.billsec) AS total_billable_seconds,
    COUNT(cr.id) AS calls_with_recording
FROM cdr c
LEFT JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN call_recordings cr ON c.uniqueid = cr.uniqueid AND cr.is_deleted = FALSE
GROUP BY t.id, t.name, DATE(c.calldate);

COMMIT;

