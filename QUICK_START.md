# ⚡ DÉMARRAGE RAPIDE

## 🚀 En 3 commandes

```bash
# 1. Aller dans le dossier
cd "/Users/macbookpro/Documents/BACKEND APPS/ManageAppBack/asterisk/asterisk-pgsql"

# 2. Lancer le script automatique
./start-fresh.sh

# 3. Vérifier que tout fonctionne
docker-compose ps
```

C'est tout ! Le système est prêt 🎉

---

## 🔗 Accès rapides

Une fois démarré :

### 🌐 Interfaces Web
- **Swagger API**: http://localhost:3001/api/v1/docs
- **Health Check**: http://localhost:3001/api/v1/health

### 🔑 Se connecter

**Admin API:**
```
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!"
  }'
```

**Base de données:**
```bash
docker exec -it asterisk-api-postgres psql -U api_user -d asterisk_api
```

**Asterisk CLI:**
```bash
docker exec -it asterisk asterisk -rx "core show version"
```

---

## 📊 Vérifications essentielles

```bash
# Tous les services sont-ils UP ?
docker-compose ps

# La DB est-elle prête ?
docker exec -it asterisk-api-postgres psql -U api_user -d asterisk_api -c "\dt"

# Asterisk est-il connecté à ODBC ?
docker exec -it asterisk asterisk -rx "odbc show"

# Le backend répond-il ?
curl http://localhost:3001/api/v1/health
```

---

## 🆘 En cas de problème

```bash
# Voir TOUS les logs
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f api-db
docker-compose logs -f asterisk
docker-compose logs -f backend

# Redémarrer tout
docker-compose down
./start-fresh.sh
```

---

## 📚 Documentation complète

- **README.md** - Vue d'ensemble du projet
- **MIGRATION_GUIDE.md** - Guide complet de migration
- **PHASE1_COMPLETE.md** - Détails de la Phase 1

---

## ✅ Checklist de démarrage

- [ ] Docker et Docker Compose installés
- [ ] Port 5432 disponible
- [ ] Dossier `api-pgdata` supprimé (si premier démarrage)
- [ ] Script `start-fresh.sh` exécutable
- [ ] Tous les services démarrés (docker-compose ps)
- [ ] Swagger UI accessible (http://localhost:3001/api/v1/docs)
- [ ] Login admin fonctionne (username: admin, password: Admin123!)

Tout est ✅ ? Vous êtes prêt ! 🎉
