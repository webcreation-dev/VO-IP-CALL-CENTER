const db = require('../../db');
const amiConfig = require('../config/ami');

/**
 * Service pour la gestion des endpoints PJSIP
 * Gère les 3 tables : ps_endpoints, ps_auths, ps_aors
 */
class EndpointService {
  /**
   * Récupérer tous les endpoints avec leurs informations complètes (enrichi avec AMI)
   */
  async getAllEndpoints(tenantId = null) {
    let query = `
      SELECT
        e.id,
        e.tenant_id,
        t.name as tenant_name,
        e.transport,
        e.context,
        e.allow,
        e.disallow,
        e.direct_media,
        e.webrtc,
        e.use_avpf,
        e.media_encryption,
        a.username,
        a.auth_type,
        aor.max_contacts,
        aor.qualify_frequency,
        (SELECT COUNT(*) FROM ps_contacts c WHERE c.id = e.id) as active_contacts
      FROM ps_endpoints e
      LEFT JOIN tenants t ON e.tenant_id = t.id
      LEFT JOIN ps_auths a ON e.id = a.id
      LEFT JOIN ps_aors aor ON e.id = aor.id
    `;

    const params = [];
    if (tenantId) {
      query += ' WHERE e.tenant_id = $1';
      params.push(tenantId);
    }

    query += ' ORDER BY e.id';

    const { rows } = await db.query(query, params);

    // Enrichir avec les données AMI si disponible
    if (!amiConfig.isConnected()) {
      console.warn('⚠️ AMI non connecté - retour des données DB uniquement');
      return rows.map(row => ({
        ...row,
        data_source: 'database',
        warning: 'AMI non disponible',
      }));
    }

    try {
      const amiEndpoints = await this.getAllEndpointsFromAMI();

      // Fusionner les données DB avec AMI
      return rows.map(row => {
        const amiData = amiEndpoints[row.id];
        if (amiData) {
          return {
            ...row,
            device_state: amiData.device_state,
            active_channels_ami: amiData.active_channels,
            registered: amiData.device_state !== 'Unavailable' && amiData.device_state !== 'Unknown',
            data_source: 'hybrid',
          };
        }
        return {
          ...row,
          device_state: 'Unknown',
          active_channels_ami: 0,
          registered: false,
          data_source: 'database',
        };
      });

    } catch (amiErr) {
      console.warn('⚠️ Erreur lors de la récupération AMI:', amiErr.message);
      return rows.map(row => ({
        ...row,
        data_source: 'database_fallback',
        warning: `Erreur AMI: ${amiErr.message}`,
      }));
    }
  }

  /**
   * Récupérer un endpoint par ID (enrichi avec AMI)
   */
  async getEndpointById(id) {
    const query = `
      SELECT
        e.*,
        t.name as tenant_name,
        a.username,
        a.password,
        a.auth_type,
        aor.max_contacts,
        aor.default_expiration,
        aor.qualify_frequency
      FROM ps_endpoints e
      LEFT JOIN tenants t ON e.tenant_id = t.id
      LEFT JOIN ps_auths a ON e.id = a.id
      LEFT JOIN ps_aors aor ON e.id = aor.id
      WHERE e.id = $1
    `;

    const { rows } = await db.query(query, [id]);
    const endpoint = rows[0] || null;

    if (!endpoint) {
      return null;
    }

    // Enrichir avec AMI si disponible
    if (!amiConfig.isConnected()) {
      return {
        ...endpoint,
        data_source: 'database',
        warning: 'AMI non disponible',
      };
    }

    try {
      const amiStatus = await this.getEndpointStatusFromAMI(id);

      const deviceState = amiStatus.device_state || 'Unknown';
      const activeChannels = amiStatus.active_channels || 0;
      const contacts = amiStatus.contacts || [];

      // Déterminer si l'endpoint est enregistré
      const registered = contacts.length > 0 || deviceState === 'Not in use' || deviceState === 'Ringing' || deviceState === 'InUse';

      return {
        ...endpoint,
        device_state: deviceState,
        active_channels: activeChannels,
        registered: registered,
        contacts_ami: contacts,
        data_source: 'hybrid',
      };

    } catch (amiErr) {
      console.warn(`⚠️ Erreur AMI pour endpoint ${id}:`, amiErr.message);
      return {
        ...endpoint,
        data_source: 'database_fallback',
        warning: `Erreur AMI: ${amiErr.message}`,
      };
    }
  }

  /**
   * Vérifier si un endpoint existe
   */
  async endpointExists(id) {
    const query = 'SELECT id FROM ps_endpoints WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows.length > 0;
  }

  /**
   * Générer automatiquement la prochaine extension disponible pour un tenant
   * Format: tenant_id * 100 + numéro (ex: Tenant 1 → 101-199, Tenant 2 → 201-299)
   */
  async generateNextExtension(tenantId) {
    // Calculer la plage basée sur tenant_id
    const rangeStart = tenantId * 100 + 1;   // Ex: Tenant 1 → 101, Tenant 13 → 1301
    const rangeEnd = tenantId * 100 + 99;     // Ex: Tenant 1 → 199, Tenant 13 → 1399

    // Trouver les extensions existantes dans cette plage avec FOR UPDATE pour éviter les race conditions
    const query = `
      SELECT id FROM ps_endpoints
      WHERE id ~ '^[0-9]+$'
      AND CAST(id AS INTEGER) BETWEEN $1 AND $2
      ORDER BY CAST(id AS INTEGER) ASC
    `;

    const { rows } = await db.query(query, [rangeStart, rangeEnd]);

    // Trouver le premier numéro disponible
    const usedExtensions = rows.map(r => parseInt(r.id));

    for (let ext = rangeStart; ext <= rangeEnd; ext++) {
      if (!usedExtensions.includes(ext)) {
        return ext.toString();
      }
    }

    throw new Error(`Plus d'extensions disponibles pour le tenant ${tenantId} (plage ${rangeStart}-${rangeEnd} complète)`);
  }

  /**
   * Créer un endpoint complet (endpoint + auth + aor) en une transaction
   * Génération automatique de l'extension et récupération du context depuis le tenant
   */
  async createEndpoint(data) {
    let {
      id,
      tenant_id,
      password,
      transport = 'transport-udp',
      context,
      allow,
      disallow = 'all',
      direct_media = 'no',
      rtp_symmetric = 'yes',
      force_rport = 'yes',
      rewrite_contact = 'yes',
      max_contacts = 1,
      webrtc,
      use_avpf,
      media_encryption,
      dtls_verify,
      dtls_cert_file,
      dtls_private_key,
      dtls_setup,
      ice_support,
      from_domain,
      from_user,
    } = data;

    // Validation minimale
    if (!tenant_id || !password) {
      throw new Error('Les champs tenant_id et password sont requis');
    }

    // Vérifier si le tenant existe et récupérer son context
    const tenantCheck = await db.query('SELECT id, context FROM tenants WHERE id = $1', [tenant_id]);
    if (tenantCheck.rows.length === 0) {
      throw new Error(`Le tenant avec l'ID ${tenant_id} n'existe pas`);
    }

    const tenant = tenantCheck.rows[0];

    // Si context n'est pas fourni, utiliser celui du tenant
    if (!context) {
      context = tenant.context;
      if (!context) {
        throw new Error(`Le tenant ${tenant_id} n'a pas de context défini. Veuillez le configurer d'abord.`);
      }
    }

    // Si id (extension) n'est pas fourni, générer automatiquement
    if (!id) {
      id = await this.generateNextExtension(tenant_id);
      console.log(`✅ Extension générée automatiquement: ${id} pour tenant ${tenant_id}`);
    } else {
      // Vérifier si l'endpoint existe déjà
      if (await this.endpointExists(id)) {
        throw new Error(`Un endpoint avec l'ID "${id}" existe déjà`);
      }
    }

    // Configuration automatique selon le transport
    const isWebRTC = transport === 'transport-wss';

    if (webrtc === undefined) {
      webrtc = isWebRTC ? 'yes' : 'no';
    }

    if (!allow) {
      allow = isWebRTC ? 'opus,ulaw,alaw' : 'ulaw,alaw,g722';
    }

    if (isWebRTC) {
      // Configuration WebRTC par défaut
      use_avpf = use_avpf || 'yes';
      media_encryption = media_encryption || 'dtls';
      dtls_verify = dtls_verify || 'fingerprint';
      dtls_cert_file = dtls_cert_file || '/etc/asterisk/keys/asterisk.pem';
      dtls_setup = dtls_setup || 'actpass';
      ice_support = ice_support || 'yes';
    }

    // Transaction pour créer les 3 entrées avec retry en cas de conflit
    const client = await db.pool.connect();
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        await client.query('BEGIN');

        // Vérifier une dernière fois si l'ID n'existe pas déjà (race condition protection)
        const checkQuery = 'SELECT id FROM ps_endpoints WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);

        if (checkResult.rows.length > 0) {
          console.warn(`⚠️ L'ID ${id} existe déjà, génération d'un nouveau numéro...`);
          await client.query('ROLLBACK');
          id = await this.generateNextExtension(tenant_id);
          console.log(`✅ Nouvel ID généré: ${id}`);
          attempts++;
          continue;
        }

        // 1. Créer ps_endpoints
        const endpointQuery = `
          INSERT INTO ps_endpoints (
            id, tenant_id, transport, aors, auth, context,
            disallow, allow, direct_media, rtp_symmetric,
            force_rport, rewrite_contact, webrtc, use_avpf,
            media_encryption, dtls_verify, dtls_cert_file,
            dtls_private_key, dtls_setup, ice_support, from_domain, from_user
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          RETURNING *
        `;

        const endpointValues = [
          id, tenant_id, transport, id, id, context,
          disallow, allow, direct_media, rtp_symmetric,
          force_rport, rewrite_contact, webrtc, use_avpf,
          media_encryption, dtls_verify, dtls_cert_file,
          dtls_private_key, dtls_setup, ice_support, from_domain, from_user
        ];

        await client.query(endpointQuery, endpointValues);

        // 2. Créer ps_auths
        const authQuery = `
          INSERT INTO ps_auths (id, tenant_id, auth_type, password, username)
          VALUES ($1, $2, 'userpass', $3, $4)
          RETURNING *
        `;

        await client.query(authQuery, [id, tenant_id, password, id]);

        // 3. Créer ps_aors
        const aorQuery = `
          INSERT INTO ps_aors (id, tenant_id, max_contacts)
          VALUES ($1, $2, $3)
          RETURNING *
        `;

        await client.query(aorQuery, [id, tenant_id, max_contacts]);

        await client.query('COMMIT');
        break; // Succès, sortir de la boucle

      } catch (err) {
        await client.query('ROLLBACK');

        // Si c'est une erreur de contrainte d'unicité et qu'on n'a pas atteint le max de tentatives
        if (err.code === '23505' && attempts < maxAttempts - 1) {
          console.warn(`⚠️ Conflit d'ID détecté (tentative ${attempts + 1}/${maxAttempts}), nouvelle tentative...`);
          id = await this.generateNextExtension(tenant_id);
          console.log(`✅ Nouvel ID généré: ${id}`);
          attempts++;
          continue;
        }

        // Sinon, propager l'erreur
        client.release();
        throw err;
      }
    }

    // Vérifier si on a réussi
    if (attempts >= maxAttempts) {
      client.release();
      throw new Error(`Impossible de créer l'endpoint après ${maxAttempts} tentatives`);
    }

    client.release();

    // Récupérer l'endpoint complet créé
    const created = await this.getEndpointById(id);
    return created;
  }

  /**
   * Mettre à jour un endpoint
   */
  async updateEndpoint(id, data) {
    const endpoint = await this.getEndpointById(id);
    if (!endpoint) {
      throw new Error(`Endpoint avec l'ID "${id}" introuvable`);
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Mise à jour ps_endpoints
      if (data.transport || data.context || data.allow || data.disallow ||
          data.direct_media || data.webrtc || data.use_avpf || data.media_encryption ||
          data.from_domain !== undefined || data.from_user !== undefined) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (data.transport) {
          fields.push(`transport = $${paramIndex++}`);
          values.push(data.transport);
        }
        if (data.context) {
          fields.push(`context = $${paramIndex++}`);
          values.push(data.context);
        }
        if (data.allow) {
          fields.push(`allow = $${paramIndex++}`);
          values.push(data.allow);
        }
        if (data.disallow) {
          fields.push(`disallow = $${paramIndex++}`);
          values.push(data.disallow);
        }
        if (data.direct_media) {
          fields.push(`direct_media = $${paramIndex++}`);
          values.push(data.direct_media);
        }
        if (data.webrtc) {
          fields.push(`webrtc = $${paramIndex++}`);
          values.push(data.webrtc);
        }
        if (data.use_avpf) {
          fields.push(`use_avpf = $${paramIndex++}`);
          values.push(data.use_avpf);
        }
        if (data.media_encryption) {
          fields.push(`media_encryption = $${paramIndex++}`);
          values.push(data.media_encryption);
        }
        if (data.from_domain !== undefined) {
          fields.push(`from_domain = $${paramIndex++}`);
          values.push(data.from_domain);
        }
        if (data.from_user !== undefined) {
          fields.push(`from_user = $${paramIndex++}`);
          values.push(data.from_user);
        }

        if (fields.length > 0) {
          values.push(id);
          const updateQuery = `UPDATE ps_endpoints SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
          await client.query(updateQuery, values);
        }
      }

      // Mise à jour ps_auths (password)
      if (data.password) {
        await client.query(
          'UPDATE ps_auths SET password = $1 WHERE id = $2',
          [data.password, id]
        );
      }

      // Mise à jour ps_aors (max_contacts)
      if (data.max_contacts) {
        await client.query(
          'UPDATE ps_aors SET max_contacts = $1 WHERE id = $2',
          [data.max_contacts, id]
        );
      }

      await client.query('COMMIT');

      // Récupérer l'endpoint mis à jour
      const updated = await this.getEndpointById(id);
      return updated;

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Supprimer un endpoint (supprime aussi auth et aor via CASCADE)
   */
  async deleteEndpoint(id) {
    const endpoint = await this.getEndpointById(id);
    if (!endpoint) {
      throw new Error(`Endpoint avec l'ID "${id}" introuvable`);
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Supprimer ps_contacts d'abord (pas de CASCADE)
      await client.query('DELETE FROM ps_contacts WHERE id = $1', [id]);

      // Supprimer ps_endpoints (CASCADE supprimera ps_auths et ps_aors)
      await client.query('DELETE FROM ps_endpoints WHERE id = $1', [id]);

      await client.query('COMMIT');

      return endpoint;

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Récupérer le statut d'un endpoint depuis Asterisk via AMI (avec event listeners)
   */
  async getEndpointStatusFromAMI(endpointId) {
    return new Promise((resolve, reject) => {
      const ami = amiConfig.ami;
      let endpointData = null;
      const contacts = [];
      const actionId = `${Date.now()}`;

      const eventHandler = (event) => {
        if (event.actionid !== actionId) return;

        if (event.event === 'EndpointDetail') {
          endpointData = {
            device_state: event.devicestate || 'Unknown',
            active_channels: parseInt(event.activechannels || '0'),
          };
        } else if (event.event === 'ContactStatusDetail') {
          contacts.push({
            uri: event.uri,
            status: event.status,
          });
        } else if (event.event === 'EndpointDetailComplete') {
          ami.removeListener('managerevent', eventHandler);
          resolve({ ...endpointData, contacts });
        }
      };

      ami.on('managerevent', eventHandler);

      amiConfig.executeAction(
        {
          Action: 'PJSIPShowEndpoint',
          Endpoint: endpointId,
          ActionID: actionId,
        },
        (err, response) => {
          if (err) {
            ami.removeListener('managerevent', eventHandler);
            return reject(err);
          }
        }
      );

      // Timeout de sécurité
      setTimeout(() => {
        ami.removeListener('managerevent', eventHandler);
        resolve(endpointData || { device_state: 'Unknown', active_channels: 0, contacts: [] });
      }, 5000);
    });
  }

  /**
   * Récupérer tous les endpoints depuis Asterisk via AMI (avec event listeners)
   */
  async getAllEndpointsFromAMI() {
    return new Promise((resolve, reject) => {
      const ami = amiConfig.ami;
      const endpoints = {};
      const actionId = `${Date.now()}`;

      const eventHandler = (event) => {
        if (event.actionid !== actionId) return;

        if (event.event === 'EndpointList') {
          const endpointId = event.objectname;
          if (endpointId) {
            endpoints[endpointId] = {
              id: endpointId,
              device_state: event.devicestate || 'Unknown',
              active_channels: parseInt(event.activechannels || '0'),
            };
          }
        } else if (event.event === 'EndpointListComplete') {
          ami.removeListener('managerevent', eventHandler);
          resolve(endpoints);
        }
      };

      ami.on('managerevent', eventHandler);

      amiConfig.executeAction(
        {
          Action: 'PJSIPShowEndpoints',
          ActionID: actionId,
        },
        (err, response) => {
          if (err) {
            ami.removeListener('managerevent', eventHandler);
            return reject(err);
          }
        }
      );

      // Timeout de sécurité
      setTimeout(() => {
        ami.removeListener('managerevent', eventHandler);
        resolve(endpoints);
      }, 5000);
    });
  }

  /**
   * Obtenir le statut d'enregistrement d'un endpoint (avec AMI)
   */
  async getEndpointStatus(id) {
    const endpoint = await this.getEndpointById(id);
    if (!endpoint) {
      throw new Error(`Endpoint avec l'ID "${id}" introuvable`);
    }

    // Récupérer les contacts depuis la DB (historique)
    const contactQuery = `
      SELECT id, uri, expiration_time, qualify_frequency
      FROM ps_contacts
      WHERE id = $1
    `;

    const { rows: dbContacts } = await db.query(contactQuery, [id]);

    // Vérifier si AMI est connecté
    if (!amiConfig.isConnected()) {
      return {
        endpoint_id: id,
        registered: dbContacts.length > 0,
        contacts: dbContacts,
        contact_count: dbContacts.length,
        data_source: 'database',
        warning: 'AMI non disponible - données potentiellement obsolètes',
      };
    }

    // Récupérer le statut réel depuis Asterisk via AMI
    try {
      const amiStatus = await this.getEndpointStatusFromAMI(id);

      const deviceState = amiStatus.device_state || 'Unknown';
      const activeChannels = amiStatus.active_channels || 0;
      const contacts = amiStatus.contacts || [];

      // Déterminer si l'endpoint est enregistré
      const registered = contacts.length > 0 || deviceState === 'Not in use' || deviceState === 'Ringing' || deviceState === 'InUse';

      return {
        endpoint_id: id,
        registered: registered,
        device_state: deviceState,
        active_channels: activeChannels,
        contacts: contacts.length > 0 ? contacts : dbContacts,
        contact_count: contacts.length,
        data_source: 'asterisk',
        db_contacts: dbContacts,
      };

    } catch (amiErr) {
      console.warn(`⚠️ Erreur AMI pour endpoint ${id}:`, amiErr.message);

      return {
        endpoint_id: id,
        registered: dbContacts.length > 0,
        contacts: dbContacts,
        contact_count: dbContacts.length,
        data_source: 'database_fallback',
        warning: `Erreur AMI: ${amiErr.message}`,
      };
    }
  }
}

module.exports = new EndpointService();