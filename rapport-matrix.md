# Rapport d’installation et de configuration de Matrix Synapse

> Version publiée pour le portfolio : les noms d’hôtes et adresses propres à l’environnement de l’IUT ont été remplacés par des exemples. Les commandes sont une documentation de projet et doivent être vérifiées et adaptées avant toute réutilisation en production.

Ce document détaille les étapes nécessaires pour mettre en place un serveur Matrix Synapse, une base de données PostgreSQL, un client web Element, ainsi que la configuration réseau et Nginx associée.

## 1. Configuration SSH et Accès Distant

Pour simplifier la connexion aux machines virtuelles via le bastion, nous configurons le fichier `~/.ssh/config` sur la machine locale.

**Fichier :** `~/.ssh/config`

```ssh
Host virt
    Hostname bastion.example.edu
    User <VOTRE_USER>

Host vm
    Hostname 192.0.2.20
    User user
    ProxyJump virt
    # Tunnels pour accéder aux services depuis la machine locale
    LocalForward 8000 0.0.0.0:8008  # Synapse
    LocalForward 8080 0.0.0.0:8080  # Element (via Nginx)
    LocalForward 9090 0.0.0.0:80    # Test Nginx
    GatewayPorts true
```

Une fois configuré, la connexion se fait simplement via :

```bash
ssh vm
```

## 2. Création de la Machine Virtuelle

Sur le serveur hôte (`virt`), utiliser les commandes spécifiques à l'environnement (ex: `vmiut`) :

1. **Créer la VM :** `vmiut creer matrix`
2. **Démarrer la VM :** `vmiut demarrer matrix`
3. **Récupérer l'IP :** `vmiut info matrix`
4. **Connexion initiale :** `ssh user@<IP-POTENTIELLE>`

## 3. Configuration Réseau et Système de la VM

### A. Configuration des Interfaces

Passer en root (`su -`) et modifier `/etc/network/interfaces` :

```bash
auto enp0s3
iface enp0s3 inet static
        address <IP_ATTRIBUE>
        netmask 255.255.255.0
        gateway 192.0.2.1
        dns-nameservers 192.0.2.1
        dns-search example.edu
```

_Note : Redémarrer la machine (`reboot`) pour appliquer les changements._

### B. Nom d'Hôte et Résolution

1. Changer le hostname : `nano /etc/hostname` (mettre `matrix`).
2. Mettre à jour `/etc/hosts` en remplaçant l'ancien nom (ex: `debian`) par `matrix`.

### C. Installation des Outils de Base

Mise à jour et installation des paquets essentiels :

```bash
apt update && apt full-upgrade
apt install vim less tree rsync sudo -y
```

### D. Configuration Sudo

Ajouter l'utilisateur standard au groupe sudo :

```bash
su -
usermod -a -G sudo user
# Vérification avec la commande 'groups'
```

## 4. Installation et Configuration de PostgreSQL

Synapse nécessite une base de données. Nous utiliserons PostgreSQL.

1. **Installation :**

   ```bash
   sudo apt install postgresql
   ```

2. **Création de l'utilisateur et de la base de données :**

   ```bash
   sudo -i -u postgres
   createuser -W -d matrix  # Création user 'matrix' avec prompt password
   createdb matrix          # Création DB 'matrix'
   exit
   ```

   _Alternative via SQL direct :_

   ```sql
   CREATE USER matrix WITH CREATEDB PASSWORD 'votre_mdp';
   ```

## 5. Installation et Configuration de Synapse

### A. Installation

Suivre la procédure officielle pour Debian :

```bash
sudo apt install -y lsb-release wget apt-transport-https
sudo wget -O /usr/share/keyrings/matrix-org-archive-keyring.gpg https://packages.matrix.org/debian/matrix-org-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/matrix-org-archive-keyring.gpg] https://packages.matrix.org/debian/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/matrix-org.list
sudo apt update
sudo apt install matrix-synapse-py3
```

_Nom du serveur suggéré :_ `matrix.example.edu:8008` (à adapter en fonction du poste occupé).

### B. Configuration (`homeserver.yaml`)

Éditer `/etc/matrix-synapse/homeserver.yaml` :

1. **Adresses d'écoute :**
   ```yaml
   bind_addresses: ["::1", "0.0.0.0"]
   ```
2. **Base de données (Remplacer SQLite par Postgres) :**
   ```yaml
   database:
     name: psycopg2
     args:
       user: synapse_user # ou 'matrix' selon création précédente
       password: mdp
       dbname: matrix
       host: localhost
       port: 5432
   ```
3. **Enregistrement des utilisateurs :**
   ```yaml
   enable_registration: true
   enable_registration_without_verification: true
   ```

### C. Démarrage et Création d'Utilisateur

1. Redémarrer le service : `sudo systemctl restart matrix-synapse`
2. Créer un utilisateur Matrix :
   ```bash
   sudo register_new_matrix_user -u <USER> -p <PASS> -c /etc/matrix-synapse/homeserver.yaml
   ```

### D. Gestion des Erreurs courantes (PostgreSQL)

Si le service ne démarre pas ou si vous rencontrez des erreurs liées à la base de données :

1. **Vérifier les logs** pour identifier la cause (ex: problème de connexion DB).
2. **Tester la connexion manuellement** :
   ```bash
   psql -d matrix -W -U synapse_user -h localhost -p 5432
   ```
3. **Erreur "incorrect collation"** :
   Si vous avez une erreur indiquant que la collation est `fr_FR` au lieu de `C`, connectez-vous en tant que `postgres` et exécutez :
   ```sql
   UPDATE pg_database SET datcollate='C', datctype='C' WHERE datname = 'matrix';
   ```
4. **Problème de droits sur le schéma public** :
   Si l'utilisateur manque de permissions, vous pouvez tenter :
   ```sql
   GRANT postgres TO synapse_user;
   ```

## 6. Installation d'Element (Client Web)

Element est le client web pour se connecter à Matrix.

1. **Téléchargement et Extraction :**

   ```bash
   sudo mkdir -p /var/www/element
   cd /tmp
   wget https://github.com/element-hq/element-web/releases/download/v1.11.54/element-v1.11.54.tar.gz
   sudo tar -xvf element-v1.11.54.tar.gz -C /var/www/element --strip-components=1
   ```

2. **Configuration :**
   ```bash
   cd /var/www/element
   sudo cp config.sample.json config.json
   # Éditer config.json pour pointer vers votre homeserver Synapse (base_url)
   ```

## 7. Configuration Nginx

Nous utilisons Nginx pour servir Element et potentiellement comme Reverse Proxy.

1. **Installation :** `sudo apt install nginx -y`
2. **Configuration du site :**
   Éditer `/etc/nginx/nginx.conf` ou un fichier dans `sites-available` :

   ```nginx
   server {
       listen 8080;
       server_name _;
       root /var/www/element;
       index index.html;

       location / {
           try_files $uri $uri/ =404;
       }
   }
   ```

3. **Accès :**
   Grâce au tunnel SSH (`LocalForward 8080`), Element est accessible sur `http://localhost:8080` de la machine physique.

## 8. Mise en place d'un Reverse Proxy (Architecture 2 VMs)

Pour une architecture plus robuste, une seconde VM peut agir comme Reverse Proxy frontal.

### Logiciels de Reverse Proxy

Quelques logiciels capables d'agir comme un reverse proxy :

- NGINX
- Apache
- Cloudflare
- HAProxy

**Configuration Nginx sur la VM Proxy :**

```nginx
server {
    listen 220;
    server_name _;
    location / {
        proxy_pass http://<IP_VM_MATRIX>:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Il faudra adapter les tunnels SSH pour pointer vers cette VM de proxy au lieu de la VM Matrix directement.
