-- ========================================
-- Configuration des files d'attente (Queues)
-- ========================================

BEGIN;

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
    'support_queue',                    -- nom de la queue
    'default',                           -- classe de musique d'attente
    'ringall',                           -- stratégie: faire sonner tous les agents disponibles
    20,                                  -- timeout: 20 secondes par agent
    5,                                   -- retry: attendre 5 secondes avant de réessayer
    15,                                  -- wrapuptime: 15 secondes de pause après chaque appel
    0,                                   -- maxlen: 0 = illimité
    30,                                  -- annoncer la position toutes les 30 secondes
    'yes',                               -- annoncer le temps d'attente estimé
    'yes',                               -- annoncer la position dans la queue
    'queue-periodic-announce',           -- message périodique
    60,                                  -- fréquence du message périodique (60 sec)
    'MixMonitor',                        -- type d'enregistrement
    'wav',                               -- format d'enregistrement
    'no',                                -- ringinuse: ne pas appeler un agent déjà en ligne
    'yes',                               -- définir des variables d'interface
    'yes',                               -- définir des variables de queue
    'yes'                                -- autofill: distribuer les appels en parallèle
) ON CONFLICT (name) DO UPDATE SET
    musiconhold = EXCLUDED.musiconhold,
    strategy = EXCLUDED.strategy,
    timeout = EXCLUDED.timeout,
    retry = EXCLUDED.retry,
    wrapuptime = EXCLUDED.wrapuptime,
    maxlen = EXCLUDED.maxlen,
    announce_frequency = EXCLUDED.announce_frequency,
    announce_holdtime = EXCLUDED.announce_holdtime,
    announce_position = EXCLUDED.announce_position,
    periodic_announce = EXCLUDED.periodic_announce,
    periodic_announce_frequency = EXCLUDED.periodic_announce_frequency,
    monitor_type = EXCLUDED.monitor_type,
    monitor_format = EXCLUDED.monitor_format,
    ringinuse = EXCLUDED.ringinuse,
    setinterfacevar = EXCLUDED.setinterfacevar,
    setqueuevar = EXCLUDED.setqueuevar,
    autofill = EXCLUDED.autofill;

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
    1,                                   -- uniqueid (doit être unique)
    'Agent 101',
    0,                                   -- penalty: 0 = priorité la plus haute
    0                                    -- paused: 0 = actif
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
    2,                                   -- uniqueid (doit être unique)
    'Agent 102',
    0,                                   -- penalty: 0 = priorité la plus haute
    0                                    -- paused: 0 = actif
) ON CONFLICT (queue_name, interface) DO UPDATE SET
    membername = EXCLUDED.membername,
    penalty = EXCLUDED.penalty,
    paused = EXCLUDED.paused;

-- Créer une deuxième queue pour les ventes (exemple)
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
    'sales_queue',                       -- nom de la queue ventes
    'default',                           -- classe de musique d'attente
    'rrmemory',                          -- stratégie: round-robin avec mémoire
    20,                                  -- timeout: 20 secondes par agent
    5,                                   -- retry: attendre 5 secondes avant de réessayer
    15,                                  -- wrapuptime: 15 secondes de pause après chaque appel
    10,                                  -- maxlen: maximum 10 appels en attente
    30,                                  -- annoncer la position toutes les 30 secondes
    'yes',                               -- annoncer le temps d'attente estimé
    'yes',                               -- annoncer la position dans la queue
    'queue-periodic-announce',           -- message périodique
    60,                                  -- fréquence du message périodique (60 sec)
    'MixMonitor',                        -- type d'enregistrement
    'wav',                               -- format d'enregistrement
    'no',                                -- ringinuse: ne pas appeler un agent déjà en ligne
    'yes',                               -- définir des variables d'interface
    'yes',                               -- définir des variables de queue
    'yes'                                -- autofill: distribuer les appels en parallèle
) ON CONFLICT (name) DO UPDATE SET
    musiconhold = EXCLUDED.musiconhold,
    strategy = EXCLUDED.strategy,
    timeout = EXCLUDED.timeout,
    retry = EXCLUDED.retry,
    wrapuptime = EXCLUDED.wrapuptime,
    maxlen = EXCLUDED.maxlen,
    announce_frequency = EXCLUDED.announce_frequency,
    announce_holdtime = EXCLUDED.announce_holdtime,
    announce_position = EXCLUDED.announce_position,
    periodic_announce = EXCLUDED.periodic_announce,
    periodic_announce_frequency = EXCLUDED.periodic_announce_frequency,
    monitor_type = EXCLUDED.monitor_type,
    monitor_format = EXCLUDED.monitor_format,
    ringinuse = EXCLUDED.ringinuse,
    setinterfacevar = EXCLUDED.setinterfacevar,
    setqueuevar = EXCLUDED.setqueuevar,
    autofill = EXCLUDED.autofill;

COMMIT;

-- ========================================
-- Affichage des queues créées
-- ========================================
SELECT 
    q.name AS "Queue", 
    q.strategy AS "Strategie", 
    q.musiconhold AS "Musique",
    COUNT(qm.interface) AS "Nombre d'agents"
FROM queues q
LEFT JOIN queue_members qm ON q.name = qm.queue_name
WHERE q.name IN ('support_queue', 'sales_queue')
GROUP BY q.name, q.strategy, q.musiconhold;

SELECT 
    queue_name AS "Queue", 
    membername AS "Nom Agent", 
    interface AS "Interface", 
    penalty AS "Priorite",
    CASE WHEN paused = 0 THEN 'Actif' ELSE 'En pause' END AS "Statut"
FROM queue_members
WHERE queue_name IN ('support_queue', 'sales_queue')
ORDER BY queue_name, penalty, membername;

