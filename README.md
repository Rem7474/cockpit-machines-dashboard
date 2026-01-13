# Cockpit Machines Dashboard

Un module Cockpit standalone pour gérer les mises à jour sur toutes les machines connectées à votre instance Cockpit.

## Fonctionnalités

- 📊 **Vue d'ensemble** : Visualisez rapidement le statut de toutes vos machines
- 🔄 **Mises à jour centralisées** : Gérez les mises à jour de toutes vos machines depuis un seul endroit
- 🛡️ **Mises à jour de sécurité** : Identifiez et installez rapidement les correctifs de sécurité
- ✅ **Mise à jour groupée** : Mettez à jour toutes les machines ou une sélection en un clic
- 📈 **Suivi en temps réel** : Suivez la progression des mises à jour avec des barres de progression

## Installation

### Prérequis

- **Git** : pour cloner le projet
- **Node.js 18+** et **npm** : pour gérer les dépendances JavaScript
- **Make** : pour exécuter les scripts de build et d'installation
- Un serveur avec **Cockpit** installé
- **PackageKit** sur les machines à gérer

#### Installation des prérequis (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install git make npm nodejs
```

#### Installation des prérequis (RHEL/CentOS/Fedora)

```bash
sudo dnf install git make npm nodejs
```

### Développement local

```bash
# Cloner le projet
cd cockpit-machines-dashboard

# Installer les dépendances
npm install

# Construire le projet
npm run build

# Installer dans votre répertoire utilisateur (pour le développement)
make install-home
```

### Installation système

```bash
# Construire et installer
make
sudo make install
```

### Depuis une archive

```bash
# Créer une archive de distribution
make dist

# L'archive peut ensuite être installée sur n'importe quel système
tar -xzf machines-dashboard-*.tar.gz -C /usr/share/cockpit/
```

## Développement

### Mode watch (reconstruction automatique)

```bash
npm run watch
```

### Vérification des types TypeScript

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Structure du projet

```
cockpit-machines-dashboard/
├── package.json           # Dépendances et scripts npm
├── webpack.config.js      # Configuration Webpack
├── tsconfig.json          # Configuration TypeScript
├── Makefile               # Scripts d'installation
├── src/
│   ├── manifest.json      # Configuration du module Cockpit
│   ├── index.html         # Page HTML d'entrée
│   ├── dashboard.tsx      # Composant React principal
│   ├── dashboard.scss     # Styles SCSS
│   ├── machines-api.ts    # API pour les machines et PackageKit
│   └── types/
│       └── cockpit.d.ts   # Types TypeScript pour Cockpit
└── dist/                  # Fichiers compilés (généré)
```

## Utilisation

1. Après installation, accédez à Cockpit via votre navigateur
2. Le "Machines Dashboard" apparaît dans le menu de navigation
3. Ajoutez des machines via le sélecteur d'hôtes dans la barre de navigation
4. Utilisez le dashboard pour voir et gérer les mises à jour

## API PackageKit

Le module utilise PackageKit via D-Bus pour :
- `GetUpdates` : Récupérer la liste des mises à jour disponibles
- `UpdatePackages` : Installer les mises à jour
- `RefreshCache` : Rafraîchir le cache des paquets

## Configuration

Le module utilise les machines configurées dans Cockpit (stockées en session storage).
Aucune configuration supplémentaire n'est nécessaire.

## Licence

LGPL-2.1-or-later

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir des issues ou des pull requests.
