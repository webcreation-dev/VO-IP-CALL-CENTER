-- ========================================
-- Données de test pour le multi-tenant
-- ========================================

-- Création de deux clients (tenants)
INSERT INTO tenants (id, name) VALUES (1, 'Client A - Entreprise Alpha');
INSERT INTO tenants (id, name) VALUES (2, 'Client B - Société Beta');

-- ========================================
-- Configuration pour le Client A (Tenant 1)
-- ========================================

-- Téléphone 101 pour Client A (WebRTC configuré)
INSERT INTO ps_endpoints (id, tenant_id, transport, aors, auth, context, disallow, allow, direct_media, rtp_symmetric, force_rport, rewrite_contact, webrtc, use_avpf, media_encryption, dtls_verify, dtls_cert_file, dtls_private_key, dtls_setup, ice_support) 
VALUES ('101', 1, 'transport-wss', '101', '101', 'client-a-context', 'all', 'opus,ulaw,alaw,g722', 'no', 'yes', 'yes', 'yes', 'yes', 'yes', 'dtls', 'fingerprint', '/etc/asterisk/keys/fullchain.pem', '/etc/asterisk/keys/privkey.pem', 'actpass', 'yes');

INSERT INTO ps_auths (id, tenant_id, auth_type, password, username) 
VALUES ('101', 1, 'userpass', 'password101', '101');

INSERT INTO ps_aors (id, tenant_id, max_contacts, qualify_frequency) 
VALUES ('101', 1, 5, 0);

-- Téléphone 102 pour Client A (WebRTC configuré)
INSERT INTO ps_endpoints (id, tenant_id, transport, aors, auth, context, disallow, allow, direct_media, rtp_symmetric, force_rport, rewrite_contact, webrtc, use_avpf, media_encryption, dtls_verify, dtls_cert_file, dtls_private_key, dtls_setup, ice_support) 
VALUES ('102', 1, 'transport-wss', '102', '102', 'client-a-context', 'all', 'opus,ulaw,alaw,g722', 'no', 'yes', 'yes', 'yes', 'yes', 'yes', 'dtls', 'fingerprint', '/etc/asterisk/keys/fullchain.pem', '/etc/asterisk/keys/privkey.pem', 'actpass', 'yes');

INSERT INTO ps_auths (id, tenant_id, auth_type, password, username) 
VALUES ('102', 1, 'userpass', 'password102', '102');

INSERT INTO ps_aors (id, tenant_id, max_contacts, qualify_frequency) 
VALUES ('102', 1, 5, 0);

-- ========================================
-- Dialplan pour Client A (appels internes)
-- ========================================

-- Appels entre extensions 101-199
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata)
VALUES
(1, 'client-a-context', '_1XX', 1, 'NoOp', 'Appel interne vers ${EXTEN}'),
(1, 'client-a-context', '_1XX', 2, 'Set', 'CALLERID(name)=Agent ${CALLERID(num)}'),
(1, 'client-a-context', '_1XX', 3, 'Dial', 'PJSIP/${EXTEN},30,TtWw'),
(1, 'client-a-context', '_1XX', 4, 'Hangup', '');

-- Extension 800 - File d'attente support
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata)
VALUES
(1, 'client-a-context', '800', 1, 'NoOp', '=== Entrée file support ==='),
(1, 'client-a-context', '800', 2, 'Answer', ''),
(1, 'client-a-context', '800', 3, 'Wait', '1'),
(1, 'client-a-context', '800', 4, 'Set', 'CHANNEL(language)=fr'),
(1, 'client-a-context', '800', 5, 'Set', 'CHANNEL(musicclass)=default'),
(1, 'client-a-context', '800', 6, 'Queue', 'support_queue,t'),
(1, 'client-a-context', '800', 7, 'Hangup', '');

-- Extension 801 - File d'attente ventes
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
-- Configuration pour le Client B (Tenant 2)
-- ========================================

-- Téléphone 201 pour Client B
INSERT INTO ps_endpoints (id, tenant_id, transport, aors, auth, context, disallow, allow, direct_media, rtp_symmetric, force_rport, rewrite_contact) 
VALUES ('201', 2, 'transport-udp', '201', '201', 'client-b-context', 'all', 'ulaw,alaw,g722', 'no', 'yes', 'yes', 'yes');

INSERT INTO ps_auths (id, tenant_id, auth_type, password, username) 
VALUES ('201', 2, 'userpass', 'password201', '201');

INSERT INTO ps_aors (id, tenant_id, max_contacts) 
VALUES ('201', 2, 1);

-- Téléphone 202 pour Client B
INSERT INTO ps_endpoints (id, tenant_id, transport, aors, auth, context, disallow, allow, direct_media, rtp_symmetric, force_rport, rewrite_contact) 
VALUES ('202', 2, 'transport-udp', '202', '202', 'client-b-context', 'all', 'ulaw,alaw,g722', 'no', 'yes', 'yes', 'yes');

INSERT INTO ps_auths (id, tenant_id, auth_type, password, username) 
VALUES ('202', 2, 'userpass', 'password202', '202');

INSERT INTO ps_aors (id, tenant_id, max_contacts) 
VALUES ('202', 2, 1);

-- ========================================
-- Dialplan pour Client B (appels internes)
-- ========================================

-- Appels entre extensions 201-299
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata)
VALUES
(2, 'client-b-context', '_2XX', 1, 'NoOp', 'Appel interne vers ${EXTEN}'),
(2, 'client-b-context', '_2XX', 2, 'Set', 'CALLERID(name)=Agent ${CALLERID(num)}'),
(2, 'client-b-context', '_2XX', 3, 'Dial', 'PJSIP/${EXTEN},30,TtWw'),
(2, 'client-b-context', '_2XX', 4, 'Hangup', '');

-- ========================================
-- Résumé de la configuration
-- ========================================
-- Client A : téléphones 101 et 102 dans le contexte 'client-a-context'
-- Client B : téléphones 201 et 202 dans le contexte 'client-b-context'
-- 
-- Les téléphones d'un même client peuvent s'appeler entre eux
-- mais ils ne peuvent PAS appeler les téléphones d'un autre client
-- car ils sont dans des contextes différents.

-- ========================================
-- Configuration des transports PJSIP
-- ========================================
-- Transport UDP pour les téléphones SIP classiques
INSERT INTO ps_transports (id, protocol, bind, local_net, external_media_address, external_signaling_address) 
VALUES ('transport-udp', 'udp', '0.0.0.0:5060', '172.18.0.0/16', '161.97.106.134', '161.97.106.134');

-- Transport WSS (WebSocket Secure) pour WebRTC
INSERT INTO ps_transports (id, protocol, bind, local_net, external_media_address, external_signaling_address)
VALUES ('transport-wss', 'wss', '0.0.0.0:8089', '172.18.0.0/16', '161.97.106.134', '161.97.106.134');

-- ========================================
-- Configuration du SIP Trunk Opérateur
-- Username: 62908521
-- Password: 167d458f-8
-- SIP Domain/IP: 197.234.218.195
-- Port: 25060
-- ========================================

-- Authentification pour le trunk
INSERT INTO ps_auths (id, auth_type, password, username, realm)
VALUES ('trunk_operateur_auth', 'userpass', '167d458f-8', '62908521', 'asterisk');

-- AOR pour le trunk
INSERT INTO ps_aors (id, max_contacts, qualify_frequency, contact)
VALUES ('trunk_operateur_aor', 1, 0, 'sip:197.234.218.195:25060');

-- Endpoint pour le trunk
INSERT INTO ps_endpoints (id, context, disallow, allow, direct_media, transport, aors, outbound_auth, from_user, from_domain, rtp_symmetric, force_rport, rewrite_contact)
VALUES ('trunk_operateur_endpoint', 'from-trunk', 'all', 'alaw,ulaw', 'no', 'transport-udp', 'trunk_operateur_aor', 'trunk_operateur_auth', '62908521', '197.234.218.195', 'yes', 'yes', 'yes');

-- Identify pour reconnaître l'opérateur par son IP
INSERT INTO ps_endpoint_id_ips (id, endpoint, match)
VALUES ('trunk_operateur_identify', 'trunk_operateur_endpoint', '197.234.218.195/32');

-- Registration vers l'opérateur (si nécessaire pour l'enregistrement sortant)
INSERT INTO ps_registrations (id, transport, outbound_auth, server_uri, client_uri, retry_interval)
VALUES ('trunk_operateur_reg', 'transport-udp', 'trunk_operateur_auth', 'sip:197.234.218.195:25060', 'sip:62908521@197.234.218.195:25060', 60);