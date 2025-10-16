-- ========================================
-- Configuration pour l'enregistrement des appels
-- ========================================

BEGIN;

-- Créer une table pour les enregistrements d'appels avec métadonnées
CREATE TABLE IF NOT EXISTS call_recordings (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    uniqueid VARCHAR(150) NOT NULL,  -- Lien avec le CDR
    filename VARCHAR(255) NOT NULL,   -- Nom du fichier audio
    filepath VARCHAR(500) NOT NULL,   -- Chemin complet
    filesize BIGINT,                  -- Taille du fichier en octets
    format VARCHAR(10),               -- Format: wav, mp3, gsm, etc.
    duration INTEGER,                 -- Durée en secondes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    src VARCHAR(80),                  -- Numéro source
    dst VARCHAR(80),                  -- Numéro destination
    notes TEXT,                       -- Notes ou commentaires
    is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (uniqueid) REFERENCES cdr(uniqueid) ON DELETE SET NULL
);

CREATE INDEX idx_call_recordings_tenant_id ON call_recordings (tenant_id);
CREATE INDEX idx_call_recordings_uniqueid ON call_recordings (uniqueid);
CREATE INDEX idx_call_recordings_created_at ON call_recordings (created_at);
CREATE INDEX idx_call_recordings_src ON call_recordings (src);
CREATE INDEX idx_call_recordings_dst ON call_recordings (dst);
CREATE INDEX idx_call_recordings_deleted ON call_recordings (is_deleted);

-- Vue pour joindre CDR et enregistrements
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
    c.lastapp AS application,
    c.lastdata AS app_data,
    c.calldate AS start_time,
    c.answerdate AS answer_time,
    c.enddate AS end_time,
    c.duration AS total_duration,
    c.billsec AS billable_duration,
    c.disposition,
    c.amaflags,
    c.accountcode,
    cr.id AS recording_id,
    cr.filename AS recording_filename,
    cr.filepath AS recording_path,
    cr.filesize AS recording_size,
    cr.format AS recording_format,
    CASE 
        WHEN cr.id IS NOT NULL THEN 'OUI'
        ELSE 'NON'
    END AS has_recording,
    t.name AS tenant_name
FROM cdr c
LEFT JOIN call_recordings cr ON c.uniqueid = cr.uniqueid AND cr.is_deleted = FALSE
LEFT JOIN tenants t ON c.tenant_id = t.id
ORDER BY c.calldate DESC;

-- Vue pour statistiques des appels par tenant
CREATE OR REPLACE VIEW v_call_statistics AS
SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name,
    DATE(c.calldate) AS call_date,
    COUNT(*) AS total_calls,
    COUNT(CASE WHEN c.disposition = 'ANSWERED' THEN 1 END) AS answered_calls,
    COUNT(CASE WHEN c.disposition = 'NO ANSWER' THEN 1 END) AS no_answer_calls,
    COUNT(CASE WHEN c.disposition = 'BUSY' THEN 1 END) AS busy_calls,
    COUNT(CASE WHEN c.disposition = 'FAILED' THEN 1 END) AS failed_calls,
    SUM(c.duration) AS total_duration_seconds,
    SUM(c.billsec) AS total_billable_seconds,
    AVG(c.duration) AS avg_duration_seconds,
    AVG(c.billsec) AS avg_billable_seconds,
    COUNT(DISTINCT c.src) AS unique_callers,
    COUNT(cr.id) AS calls_with_recording
FROM cdr c
LEFT JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN call_recordings cr ON c.uniqueid = cr.uniqueid AND cr.is_deleted = FALSE
GROUP BY t.id, t.name, DATE(c.calldate)
ORDER BY call_date DESC, tenant_name;

-- Vue pour statistiques des queues
CREATE OR REPLACE VIEW v_queue_statistics AS
SELECT 
    c.dcontext AS queue_context,
    CASE 
        WHEN c.lastapp = 'Queue' THEN c.lastdata
        ELSE 'N/A'
    END AS queue_name,
    DATE(c.calldate) AS call_date,
    COUNT(*) AS total_calls,
    COUNT(CASE WHEN c.disposition = 'ANSWERED' THEN 1 END) AS answered_calls,
    COUNT(CASE WHEN c.disposition = 'NO ANSWER' THEN 1 END) AS abandoned_calls,
    AVG(c.duration) AS avg_wait_time_seconds,
    MAX(c.duration) AS max_wait_time_seconds,
    MIN(c.duration) AS min_wait_time_seconds
FROM cdr c
WHERE c.lastapp = 'Queue'
GROUP BY c.dcontext, queue_name, DATE(c.calldate)
ORDER BY call_date DESC;

COMMIT;

-- ========================================
-- Affichage des tables créées
-- ========================================
SELECT 
    'call_recordings' AS table_name,
    COUNT(*) AS record_count
FROM call_recordings
UNION ALL
SELECT 
    'cdr' AS table_name,
    COUNT(*) AS record_count
FROM cdr;

-- ========================================
-- Exemples de requêtes utiles
-- ========================================

-- 1. Voir tous les appels avec enregistrements
-- SELECT * FROM v_call_history WHERE has_recording = 'OUI' LIMIT 10;

-- 2. Statistiques par jour
-- SELECT * FROM v_call_statistics WHERE call_date >= CURRENT_DATE - INTERVAL '7 days';

-- 3. Statistiques des queues
-- SELECT * FROM v_queue_statistics WHERE call_date = CURRENT_DATE;

-- 4. Appels non répondus des dernières 24h
-- SELECT 
--     calldate, 
--     src AS appelant, 
--     dst AS destinataire, 
--     duration AS duree_sonnerie
-- FROM cdr 
-- WHERE disposition = 'NO ANSWER' 
--   AND calldate >= NOW() - INTERVAL '24 hours'
-- ORDER BY calldate DESC;

-- 5. Top 10 des appelants
-- SELECT 
--     src AS numero, 
--     COUNT(*) AS nombre_appels,
--     SUM(billsec) AS duree_totale_secondes
-- FROM cdr
-- WHERE calldate >= CURRENT_DATE - INTERVAL '30 days'
-- GROUP BY src
-- ORDER BY nombre_appels DESC
-- LIMIT 10;

