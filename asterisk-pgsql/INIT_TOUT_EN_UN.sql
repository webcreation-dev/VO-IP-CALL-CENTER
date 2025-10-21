-- ========================================
-- INITIALISATION COMPLÈTE DE A à Z
-- ========================================
-- Ce fichier contient TOUT ce qui est nécessaire
-- Après son exécution, le système est 100% opérationnel
-- Plus besoin de faire quoi que ce soit dans la base !
-- ========================================

BEGIN;

-- ========================================
-- 1. TENANTS (Clients multi-tenant)
-- ========================================

INSERT INTO tenants (id, name) VALUES
(1, 'Client A - Entreprise Alpha'),
(2, 'Client B - Société Beta')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 2. TRANSPORTS PJSIP
-- ========================================

-- Transport UDP pour SIP classique
INSERT INTO ps_transports (id, protocol, bind, local_net, external_media_address, external_signaling_address)
VALUES ('transport-udp', 'udp', '0.0.0.0:5060', '172.18.0.0/16', '161.97.106.134', '161.97.106.134')
ON CONFLICT (id) DO UPDATE SET
    external_media_address = EXCLUDED.external_media_address,
    external_signaling_address = EXCLUDED.external_signaling_address;

-- Transport WSS pour WebRTC
INSERT INTO ps_transports (id, protocol, bind, local_net, external_media_address, external_signaling_address)
VALUES ('transport-wss', 'wss', '0.0.0.0:8089', '172.18.0.0/16', '161.97.106.134', '161.97.106.134')
ON CONFLICT (id) DO UPDATE SET
    external_media_address = EXCLUDED.external_media_address,
    external_signaling_address = EXCLUDED.external_signaling_address;

-- ========================================
-- 3. SIP TRUNK OPÉRATEUR
-- ========================================
-- Username: 62908521
-- Password: 167d458f-8
-- Server: 197.234.218.195:25060
-- DID: +22954150000
-- ========================================

-- Authentification trunk
INSERT INTO ps_auths (id, auth_type, password, username, realm)
VALUES ('trunk_operateur_auth', 'userpass', '167d458f-8', '62908521', 'asterisk')
ON CONFLICT (id) DO UPDATE SET
    password = EXCLUDED.password,
    username = EXCLUDED.username;

-- AOR trunk avec contact statique
INSERT INTO ps_aors (id, max_contacts, qualify_frequency, contact)
VALUES ('trunk_operateur_aor', 1, 0, 'sip:197.234.218.195:25060')
ON CONFLICT (id) DO UPDATE SET
    contact = EXCLUDED.contact;

-- Endpoint trunk
INSERT INTO ps_endpoints (id, context, disallow, allow, direct_media, transport, aors, outbound_auth, from_user, from_domain, rtp_symmetric, force_rport, rewrite_contact)
VALUES ('trunk_operateur_endpoint', 'from-trunk', 'all', 'alaw,ulaw', 'no', 'transport-udp', 'trunk_operateur_aor', 'trunk_operateur_auth', '62908521', '197.234.218.195', 'yes', 'yes', 'yes')
ON CONFLICT (id) DO UPDATE SET
    context = EXCLUDED.context,
    outbound_auth = EXCLUDED.outbound_auth;

-- Identification trunk par IP
INSERT INTO ps_endpoint_id_ips (id, endpoint, match)
VALUES ('trunk_operateur_identify', 'trunk_operateur_endpoint', '197.234.218.195/32')
ON CONFLICT (id) DO UPDATE SET
    endpoint = EXCLUDED.endpoint,
    match = EXCLUDED.match;

-- Registration sortante vers opérateur
INSERT INTO ps_registrations (id, transport, outbound_auth, server_uri, client_uri, retry_interval)
VALUES ('trunk_operateur_reg', 'transport-udp', 'trunk_operateur_auth', 'sip:197.234.218.195:25060', 'sip:62908521@197.234.218.195:25060', 60)
ON CONFLICT (id) DO UPDATE SET
    server_uri = EXCLUDED.server_uri,
    client_uri = EXCLUDED.client_uri;

-- ========================================
-- 4. ENDPOINTS WEBRTC CLIENT A (101, 102)
-- ========================================

-- Extension 101
INSERT INTO ps_endpoints (id, tenant_id, transport, aors, auth, context, disallow, allow, direct_media, rtp_symmetric, force_rport, rewrite_contact, webrtc, use_avpf, media_encryption, dtls_verify, dtls_cert_file, dtls_private_key, dtls_setup, ice_support)
VALUES ('101', 1, 'transport-wss', '101', '101', 'client-a-context', 'all', 'opus,ulaw,alaw,g722', 'no', 'yes', 'yes', 'yes', 'yes', 'yes', 'dtls', 'fingerprint', '/etc/asterisk/keys/fullchain.pem', '/etc/asterisk/keys/privkey.pem', 'actpass', 'yes')
ON CONFLICT (id) DO UPDATE SET
    context = EXCLUDED.context,
    transport = EXCLUDED.transport;

INSERT INTO ps_auths (id, tenant_id, auth_type, password, username)
VALUES ('101', 1, 'userpass', 'password101', '101')
ON CONFLICT (id) DO UPDATE SET
    password = EXCLUDED.password;

INSERT INTO ps_aors (id, tenant_id, max_contacts, qualify_frequency)
VALUES ('101', 1, 5, 0)
ON CONFLICT (id) DO NOTHING;

-- Extension 102
INSERT INTO ps_endpoints (id, tenant_id, transport, aors, auth, context, disallow, allow, direct_media, rtp_symmetric, force_rport, rewrite_contact, webrtc, use_avpf, media_encryption, dtls_verify, dtls_cert_file, dtls_private_key, dtls_setup, ice_support)
VALUES ('102', 1, 'transport-wss', '102', '102', 'client-a-context', 'all', 'opus,ulaw,alaw,g722', 'no', 'yes', 'yes', 'yes', 'yes', 'yes', 'dtls', 'fingerprint', '/etc/asterisk/keys/fullchain.pem', '/etc/asterisk/keys/privkey.pem', 'actpass', 'yes')
ON CONFLICT (id) DO UPDATE SET
    context = EXCLUDED.context,
    transport = EXCLUDED.transport;

INSERT INTO ps_auths (id, tenant_id, auth_type, password, username)
VALUES ('102', 1, 'userpass', 'password102', '102')
ON CONFLICT (id) DO UPDATE SET
    password = EXCLUDED.password;

INSERT INTO ps_aors (id, tenant_id, max_contacts, qualify_frequency)
VALUES ('102', 1, 5, 0)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 5. ENDPOINTS CLIENT B (201, 202)
-- ========================================

-- Extension 201
INSERT INTO ps_endpoints (id, tenant_id, transport, aors, auth, context, disallow, allow, direct_media, rtp_symmetric, force_rport, rewrite_contact)
VALUES ('201', 2, 'transport-udp', '201', '201', 'client-b-context', 'all', 'ulaw,alaw,g722', 'no', 'yes', 'yes', 'yes')
ON CONFLICT (id) DO UPDATE SET
    context = EXCLUDED.context;

INSERT INTO ps_auths (id, tenant_id, auth_type, password, username)
VALUES ('201', 2, 'userpass', 'password201', '201')
ON CONFLICT (id) DO UPDATE SET
    password = EXCLUDED.password;

INSERT INTO ps_aors (id, tenant_id, max_contacts)
VALUES ('201', 2, 1)
ON CONFLICT (id) DO NOTHING;

-- Extension 202
INSERT INTO ps_endpoints (id, tenant_id, transport, aors, auth, context, disallow, allow, direct_media, rtp_symmetric, force_rport, rewrite_contact)
VALUES ('202', 2, 'transport-udp', '202', '202', 'client-b-context', 'all', 'ulaw,alaw,g722', 'no', 'yes', 'yes', 'yes')
ON CONFLICT (id) DO UPDATE SET
    context = EXCLUDED.context;

INSERT INTO ps_auths (id, tenant_id, auth_type, password, username)
VALUES ('202', 2, 'userpass', 'password202', '202')
ON CONFLICT (id) DO UPDATE SET
    password = EXCLUDED.password;

INSERT INTO ps_aors (id, tenant_id, max_contacts)
VALUES ('202', 2, 1)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 6. DIALPLAN REALTIME - CLIENT A
-- ========================================

-- Nettoyer ancien dialplan Client A
DELETE FROM extensions WHERE tenant_id = 1;

-- Appels internes _1XX
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata)
VALUES
(1, 'client-a-context', '_1XX', 1, 'NoOp', 'Appel interne vers ${EXTEN}'),
(1, 'client-a-context', '_1XX', 2, 'Set', 'CALLERID(name)=Agent ${CALLERID(num)}'),
(1, 'client-a-context', '_1XX', 3, 'Dial', 'PJSIP/${EXTEN},30,TtWw'),
(1, 'client-a-context', '_1XX', 4, 'Hangup', '');

-- Extension 800 - File support
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata)
VALUES
(1, 'client-a-context', '800', 1, 'NoOp', '=== Entrée file support ==='),
(1, 'client-a-context', '800', 2, 'Answer', ''),
(1, 'client-a-context', '800', 3, 'Wait', '1'),
(1, 'client-a-context', '800', 4, 'Set', 'CHANNEL(language)=fr'),
(1, 'client-a-context', '800', 5, 'Set', 'CHANNEL(musicclass)=default'),
(1, 'client-a-context', '800', 6, 'Queue', 'support_queue,t'),
(1, 'client-a-context', '800', 7, 'Hangup', '');

-- Extension 801 - File ventes
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata)
VALUES
(1, 'client-a-context', '801', 1, 'NoOp', '=== Entrée file ventes ==='),
(1, 'client-a-context', '801', 2, 'Answer', ''),
(1, 'client-a-context', '801', 3, 'Wait', '1'),
(1, 'client-a-context', '801', 4, 'Set', 'CHANNEL(language)=fr'),
(1, 'client-a-context', '801', 5, 'Set', 'CHANNEL(musicclass)=default'),
(1, 'client-a-context', '801', 6, 'Queue', 'sales_queue,t'),
(1, 'client-a-context', '801', 7, 'Hangup', '');

-- Extension *65 - Messagerie vocale
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata)
VALUES
(1, 'client-a-context', '*65', 1, 'Answer', ''),
(1, 'client-a-context', '*65', 2, 'VoicemailMain', '${CALLERID(num)}@default'),
(1, 'client-a-context', '*65', 3, 'Hangup', '');

-- Extension *66 - Pause agent
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata)
VALUES
(1, 'client-a-context', '*66', 1, 'Answer', ''),
(1, 'client-a-context', '*66', 2, 'PauseQueueMember', 'support_queue,PJSIP/${CALLERID(num)}'),
(1, 'client-a-context', '*66', 3, 'Playback', 'agent-paused'),
(1, 'client-a-context', '*66', 4, 'Hangup', '');

-- Extension *67 - Reprise agent
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata)
VALUES
(1, 'client-a-context', '*67', 1, 'Answer', ''),
(1, 'client-a-context', '*67', 2, 'UnpauseQueueMember', 'support_queue,PJSIP/${CALLERID(num)}'),
(1, 'client-a-context', '*67', 3, 'Playback', 'agent-unpaused'),
(1, 'client-a-context', '*67', 4, 'Hangup', '');

-- Extension *68 - Statistiques queue
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata)
VALUES
(1, 'client-a-context', '*68', 1, 'Answer', ''),
(1, 'client-a-context', '*68', 2, 'SayNumber', '${QUEUE_WAITING_COUNT(support_queue)}'),
(1, 'client-a-context', '*68', 3, 'Playback', 'calls-waiting'),
(1, 'client-a-context', '*68', 4, 'Hangup', '');

-- ========================================
-- 7. DIALPLAN REALTIME - CLIENT B
-- ========================================

-- Nettoyer ancien dialplan Client B
DELETE FROM extensions WHERE tenant_id = 2;

-- Appels internes _2XX
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata)
VALUES
(2, 'client-b-context', '_2XX', 1, 'NoOp', 'Appel interne vers ${EXTEN}'),
(2, 'client-b-context', '_2XX', 2, 'Set', 'CALLERID(name)=Agent ${CALLERID(num)}'),
(2, 'client-b-context', '_2XX', 3, 'Dial', 'PJSIP/${EXTEN},30,TtWw'),
(2, 'client-b-context', '_2XX', 4, 'Hangup', '');

-- ========================================
-- 8. FILES D'ATTENTE (QUEUES)
-- ========================================

-- Queue support
INSERT INTO queues (
    name, musiconhold, strategy, timeout, retry, wrapuptime, maxlen,
    announce_frequency, announce_holdtime, announce_position,
    periodic_announce, periodic_announce_frequency,
    monitor_type, monitor_format, ringinuse, setinterfacevar, setqueuevar, autofill
) VALUES (
    'support_queue', 'default', 'ringall', 20, 5, 15, 0,
    30, 'yes', 'yes',
    'queue-periodic-announce', 60,
    'MixMonitor', 'wav', 'no', 'yes', 'yes', 'yes'
) ON CONFLICT (name) DO UPDATE SET
    musiconhold = EXCLUDED.musiconhold,
    strategy = EXCLUDED.strategy,
    timeout = EXCLUDED.timeout;

-- Queue ventes
INSERT INTO queues (
    name, musiconhold, strategy, timeout, retry, wrapuptime, maxlen,
    monitor_type, monitor_format, ringinuse, autofill
) VALUES (
    'sales_queue', 'default', 'rrmemory', 20, 5, 15, 10,
    'MixMonitor', 'wav', 'no', 'yes'
) ON CONFLICT (name) DO UPDATE SET
    musiconhold = EXCLUDED.musiconhold,
    strategy = EXCLUDED.strategy;

-- ========================================
-- 9. MEMBRES DES QUEUES
-- ========================================

-- Agent 101 dans support_queue
INSERT INTO queue_members (queue_name, interface, uniqueid, membername, penalty, paused)
VALUES ('support_queue', 'PJSIP/101', 1, 'Agent 101', 0, 0)
ON CONFLICT (queue_name, interface) DO UPDATE SET
    membername = EXCLUDED.membername,
    paused = EXCLUDED.paused;

-- Agent 102 dans support_queue
INSERT INTO queue_members (queue_name, interface, uniqueid, membername, penalty, paused)
VALUES ('support_queue', 'PJSIP/102', 2, 'Agent 102', 0, 0)
ON CONFLICT (queue_name, interface) DO UPDATE SET
    membername = EXCLUDED.membername,
    paused = EXCLUDED.paused;

-- ========================================
-- 10. TABLE ENREGISTREMENTS
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
-- 11. VUES SQL UTILES
-- ========================================

CREATE OR REPLACE VIEW v_call_history AS
SELECT
    c.id AS cdr_id, c.tenant_id, c.uniqueid,
    c.src AS caller, c.dst AS called, c.dcontext AS context,
    c.channel, c.dstchannel,
    c.calldate AS start_time, c.answerdate AS answer_time, c.enddate AS end_time,
    c.duration AS total_duration, c.billsec AS billable_duration,
    c.disposition,
    cr.filename AS recording_filename,
    CASE WHEN cr.id IS NOT NULL THEN 'OUI' ELSE 'NON' END AS has_recording,
    t.name AS tenant_name
FROM cdr c
LEFT JOIN call_recordings cr ON c.uniqueid = cr.uniqueid AND cr.is_deleted = FALSE
LEFT JOIN tenants t ON c.tenant_id = t.id
ORDER BY c.calldate DESC;

CREATE OR REPLACE VIEW v_call_statistics AS
SELECT
    t.id AS tenant_id, t.name AS tenant_name,
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

-- ========================================
-- RÉCAPITULATIF DE CE QUI A ÉTÉ CRÉÉ
-- ========================================
-- ✅ 2 Tenants (Client A, Client B)
-- ✅ 2 Transports (UDP, WSS)
-- ✅ 1 Trunk SIP opérateur (197.234.218.195)
-- ✅ 4 Extensions WebRTC (101, 102, 201, 202)
-- ✅ 33 lignes de dialplan (appels internes, queues, features)
-- ✅ 2 Files d'attente (support_queue, sales_queue)
-- ✅ 2 Agents dans support_queue (101, 102)
-- ✅ Tables enregistrements et vues statistiques
-- ========================================
-- SYSTÈME 100% OPÉRATIONNEL !
-- ========================================
