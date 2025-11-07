# Vérifications Asterisk - Module CONTEXTS

Les contexts Asterisk ne sont PAS stockés dans des tables realtime. Ils sont définis dans le dialplan `extensions.conf` ou via AEL. Cependant, les contexts sont utilisés par les endpoints et queues.

## Commandes CLI Asterisk

### 1. Vérifier les contexts disponibles dans Asterisk

```bash
asterisk -rx "dialplan show contexts"
```

**Résultat attendu :** Liste tous les contexts, incluant ceux définis manuellement comme `t1_context`, `t2_context`, etc.

---

### 2. Voir le dialplan d'un context spécifique

```bash
# Remplacer t1_context par le nom réel du context
asterisk -rx "dialplan show t1_context"
```

**Résultat :** Affiche toutes les extensions dans ce context.

---

### 3. Vérifier qu'un endpoint utilise le bon context

```bash
asterisk -rx "pjsip show endpoint t1_101"
```

**Résultat attendu :** Le champ `context` doit pointer vers `t1_context` ou le context approprié du tenant.

---

### 4. Vérifier qu'une queue utilise le bon context

```bash
asterisk -rx "queue show t1_sales"
```

**Résultat :** La queue devrait rediriger vers le context approprié lors du routage.

---

## Note importante

Les contexts dans cette application sont gérés au niveau de la base de données (table `tenant_contexts`) mais doivent être manuellement configurés dans Asterisk via `extensions.conf` ou via le dialplan dynamique.

L'API ne crée pas automatiquement les contexts dans Asterisk - elle les enregistre pour référence et les associe aux endpoints/queues.
