-- ========================================
-- Données de test pour le multi-tenant
-- ========================================

-- Création de deux clients (tenants)
INSERT INTO tenants (id, name) VALUES (1, 'Client A - Entreprise Alpha');
INSERT INTO tenants (id, name) VALUES (2, 'Client B - Société Beta');

-- ========================================
-- Configuration pour le Client A (Tenant 1)
-- ========================================

-- Téléphone 101 pour Client A
INSERT INTO ps_endpoints (id, tenant_id, transport, aors, auth, context, disallow, allow, direct_media, rtp_symmetric, force_rport, rewrite_contact, webrtc) 
VALUES ('101', 1, NULL, '101', '101', 'client-a-context', 'all', 'opus,ulaw,alaw,g722', 'no', 'yes', 'yes', 'yes', 'yes');

INSERT INTO ps_auths (id, tenant_id, auth_type, password, username) 
VALUES ('101', 1, 'userpass', 'password101', '101');

INSERT INTO ps_aors (id, tenant_id, max_contacts) 
VALUES ('101', 1, 5);

-- Téléphone 102 pour Client A
INSERT INTO ps_endpoints (id, tenant_id, transport, aors, auth, context, disallow, allow, direct_media, rtp_symmetric, force_rport, rewrite_contact, webrtc) 
VALUES ('102', 1, NULL, '102', '102', 'client-a-context', 'all', 'opus,ulaw,alaw,g722', 'no', 'yes', 'yes', 'yes', 'yes');

INSERT INTO ps_auths (id, tenant_id, auth_type, password, username) 
VALUES ('102', 1, 'userpass', 'password102', '102');

INSERT INTO ps_aors (id, tenant_id, max_contacts) 
VALUES ('102', 1, 5);

-- Dialplan pour Client A (permet aux utilisateurs de s'appeler entre eux)
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata) 
VALUES (1, 'client-a-context', '_1XX', 1, 'Dial', 'PJSIP/${EXTEN},20');

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

-- Dialplan pour Client B (permet aux utilisateurs de s'appeler entre eux)
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata) 
VALUES (2, 'client-b-context', '_2XX', 1, 'Dial', 'PJSIP/${EXTEN},20');

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
-- Configuration du transport PJSIP
-- ========================================
-- On définit le transport UDP, en spécifiant l'IP publique et le réseau local
-- C'est crucial pour que l'audio (RTP) fonctionne correctement derrière un NAT.
INSERT INTO ps_transports (id, protocol, bind, local_net) 
VALUES ('transport-udp', 'udp', '0.0.0.0:5060', '172.18.0.0/16,192.168.1.0/24');
