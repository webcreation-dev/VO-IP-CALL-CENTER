# Vérifications Asterisk - Module TENANTS

Après avoir exécuté les tests du module Tenants, voici les commandes à exécuter sur le VPS pour vérifier que les données sont bien en realtime dans Asterisk.

## Important

Les tenants eux-mêmes ne sont PAS stockés dans Asterisk. Ils sont uniquement dans PostgreSQL côté API. Ce qui est important, c'est que les **ressources** créées par le tenant (endpoints, queues, etc.) utilisent bien le préfixe du tenant.

## Commandes CLI Asterisk à exécuter sur le VPS

### 1. Vérifier la connectivité ODBC (connexion à PostgreSQL)

```bash
asterisk -rx "odbc show"
```

**Résultat attendu :**
```
ODBC DSN Settings
-----------------

  Name:   asterisk
  DSN:    asterisk
    Number of active connections: 1 (out of 1)
    Connected: Yes
```

Si la connexion n'est pas établie, les requêtes realtime ne fonctionneront pas.

---

### 2. Vérifier la configuration Realtime

```bash
asterisk -rx "realtime show config"
```

**Résultat attendu :**
```
Realtime Static Configuration
  File: extconfig.conf
  Family: ps_endpoints => odbc,asterisk
  Family: ps_auths => odbc,asterisk
  Family: ps_aors => odbc,asterisk
  Family: queues => odbc,asterisk,queues
  Family: queue_members => odbc,asterisk,queue_members
```

---

### 3. Vérifier les endpoints PJSIP (après création d'endpoints pour le tenant)

```bash
asterisk -rx "pjsip show endpoints"
```

**Note :** À ce stade, il n'y a peut-être pas encore d'endpoints créés car nous n'avons testé que les tenants. Les endpoints seront créés dans le module suivant.

**Résultat attendu (après création d'endpoints) :**
Les endpoints devraient avoir le préfixe `t{tenantId}_` :
```
 Endpoint:  t1_101/101                           Not in use    0 of inf
 Endpoint:  t1_102/102                           Not in use    0 of inf
 Endpoint:  t2_201/201                           Not in use    0 of inf
```

---

### 4. Vérifier les queues (après création de queues pour le tenant)

```bash
asterisk -rx "queue show"
```

**Note :** À ce stade, il n'y a peut-être pas encore de queues créées. Les queues seront testées dans le module suivant.

**Résultat attendu (après création de queues) :**
Les queues devraient avoir le préfixe `t{tenantId}_` :
```
t1_sales has 0 calls (max unlimited) in 'ringall' strategy
t1_support has 0 calls (max unlimited) in 'ringall' strategy
t2_general has 0 calls (max unlimited) in 'ringall' strategy
```

---

### 5. Tester une requête realtime directe

```bash
asterisk -rx "realtime load ps_endpoints id t1_testendpoint"
```

**Résultat :**
Si l'endpoint n'existe pas, cela retournera vide. C'est normal à ce stade. Cette commande sera utile après avoir créé des endpoints.

---

## Quand utiliser ces commandes

1. **Après avoir créé des tenants** : Vérifier que la connexion ODBC fonctionne
2. **Après avoir créé des endpoints** : Vérifier avec `pjsip show endpoints`
3. **Après avoir créé des queues** : Vérifier avec `queue show`
4. **En cas de problème** : Utiliser `realtime load` pour debugger

---

## Commandes de debug avancées

### Activer le debug ODBC

```bash
asterisk -rx "odbc set debug on"
```

### Activer le debug PJSIP

```bash
asterisk -rx "pjsip set logger on"
```

### Recharger la configuration realtime

```bash
asterisk -rx "module reload res_config_odbc.so"
asterisk -rx "module reload res_odbc.so"
```

---

## Prochaines étapes

Une fois les tests Tenants terminés, passez aux modules suivants pour créer des ressources :

1. **Module Contexts** : Création de contextes Asterisk pour les tenants
2. **Module Endpoints** : Création d'endpoints PJSIP avec préfixe tenant
3. **Module Queues** : Création de files d'attente avec préfixe tenant

À ce moment-là, vous pourrez vérifier que tout est bien en realtime avec les commandes ci-dessus.
