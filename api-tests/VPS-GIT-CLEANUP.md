# Commandes à exécuter sur le VPS pour nettoyer le volume PostgreSQL

## Contexte

Le dossier `asterisk-pgsql/api-pgdata/` contenait des données PostgreSQL qui polluaient Git avec des modifications constantes. Ce dossier a été supprimé localement et retiré du tracking Git. Voici les commandes à exécuter sur le VPS pour synchroniser.

---

## Étape 1 : Sauvegarder les modifications locales (VPS)

Avant de faire quoi que ce soit, vérifie l'état actuel :

```bash
cd /path/to/your/project
git status
```

Si tu as des modifications non commitées que tu veux garder :

```bash
git stash
```

---

## Étape 2 : Récupérer les changements depuis le dépôt

```bash
git fetch origin integration_v2
```

---

## Étape 3 : Fusionner les changements

```bash
git pull origin integration_v2
```

Si tu as des conflits avec `api-pgdata/`, Git va te dire que les fichiers sont supprimés. Accepte la suppression :

```bash
git merge origin/integration_v2
```

---

## Étape 4 : Nettoyer le dossier api-pgdata si présent

Si le dossier existe encore localement sur le VPS :

```bash
# Vérifier s'il existe
ls -la asterisk-pgsql/api-pgdata

# Le supprimer s'il existe
rm -rf asterisk-pgsql/api-pgdata
```

---

## Étape 5 : Vérifier que tout est propre

```bash
git status
```

Tu devrais voir :
```
On branch integration_v2
Your branch is up to date with 'origin/integration_v2'.

nothing to commit, working tree clean
```

---

## Étape 6 : Vérifier que le volume Docker fonctionne

Le `docker-compose.yml` utilise maintenant un volume Docker nommé `asterisk-api-pgdata` :

```yaml
volumes:
  - asterisk-api-pgdata:/var/lib/postgresql/data
```

Vérifie que le volume existe :

```bash
docker volume ls | grep asterisk-api-pgdata
```

Si le volume n'existe pas, il sera créé automatiquement au prochain démarrage de PostgreSQL :

```bash
docker-compose up -d api-db
```

---

## Étape 7 : Redémarrer les services si nécessaire

```bash
docker-compose restart api-db
```

Vérifie les logs pour t'assurer que PostgreSQL démarre correctement :

```bash
docker-compose logs -f api-db
```

---

## En cas de problème

### Si tu as des conflits Git qui ne se résolvent pas

```bash
# Sauvegarder tes modifications
git stash

# Forcer la mise à jour
git reset --hard origin/integration_v2

# Restaurer tes modifications si nécessaire
git stash pop
```

### Si le volume Docker ne fonctionne pas

```bash
# Supprimer le volume (ATTENTION : cela supprime les données PostgreSQL)
docker-compose down
docker volume rm asterisk-api-pgdata

# Recréer le volume
docker-compose up -d api-db
```

### Si les données PostgreSQL sont corrompues

Tu devras peut-être réinitialiser la base de données :

```bash
# 1. Sauvegarder la base si possible
docker exec asterisk-api-db pg_dump -U api_user asterisk_api > backup.sql

# 2. Supprimer le volume
docker-compose down
docker volume rm asterisk-api-pgdata

# 3. Recréer la base
docker-compose up -d api-db

# 4. Attendre que PostgreSQL soit prêt (30 secondes)
sleep 30

# 5. Restaurer la sauvegarde
docker exec -i asterisk-api-db psql -U api_user asterisk_api < backup.sql
```

---

## Résumé des commandes rapides

```bash
# Commandes minimales pour synchroniser
cd /path/to/your/project
git fetch origin integration_v2
git pull origin integration_v2
rm -rf asterisk-pgsql/api-pgdata  # Si le dossier existe encore
git status  # Vérifier que tout est propre
```

---

## Vérification finale

Après avoir fait tout ça, vérifie que :

1. `git status` montre un working tree propre
2. Le dossier `asterisk-pgsql/api-pgdata` n'existe pas
3. Docker utilise bien le volume nommé : `docker volume ls | grep asterisk-api-pgdata`
4. PostgreSQL fonctionne : `docker-compose ps` et `docker-compose logs api-db`

---

## Notes importantes

- Le `.gitignore` contient déjà la règle `**/api-pgdata/` donc ce dossier ne sera plus tracké à l'avenir
- Les données PostgreSQL sont maintenant stockées dans un volume Docker nommé, séparé du code source
- Cela évitera les conflits Git lors des push/pull futurs
