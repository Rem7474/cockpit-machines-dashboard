# Cockpit Machines Dashboard

A standalone Cockpit module to manage updates across all machines connected to your Cockpit instance.

## Features

- 📊 **Dashboard Overview**: Quickly visualize the status of all your machines
- 🔄 **Centralized Updates**: Manage updates for all your machines from a single place
- 🛡️ **Security Updates**: Identify and quickly install security patches
- ✅ **Batch Updates**: Update all machines or a selection with a single click
- 📈 **Real-time Tracking**: Follow update progress with progress bars
- 🌙 **Dark Theme Support**: Automatically adapts to your system theme

## Installation

### Prerequisites

- **Git**: to clone the project
- **Node.js 18+** and **npm**: to manage JavaScript dependencies
- **Make**: to run build and installation scripts
- A server with **Cockpit** installed
- **PackageKit** on the machines to manage

#### Installing prerequisites (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install git make npm nodejs
```

#### Installing prerequisites (RHEL/CentOS/Fedora)

```bash
sudo dnf install git make npm nodejs
```

### Local Development

```bash
# Clone the project
cd cockpit-machines-dashboard

# Install dependencies
npm install

# Build the project
npm run build

# Install in your user directory (for development)
make install-home
```

### System Installation

```bash
# Build and install
make
sudo make install
```

### From an Archive

```bash
# Create a distribution archive
make dist

# The archive can then be installed on any system
tar -xzf machines-dashboard-*.tar.gz -C /usr/share/cockpit/
```

## Development

### Watch mode (automatic rebuild)

```bash
npm run watch
```

### TypeScript type checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Project Structure

```
cockpit-machines-dashboard/
├── package.json           # npm dependencies and scripts
├── webpack.config.js      # Webpack configuration
├── tsconfig.json          # TypeScript configuration
├── Makefile               # Installation scripts
├── src/
│   ├── manifest.json      # Cockpit module configuration
│   ├── index.html         # HTML entry point
│   ├── dashboard.tsx      # Main React component
│   ├── dashboard.scss     # SCSS styles (light & dark theme)
│   ├── machines-api.ts    # API for machines and PackageKit
│   └── types/
│       └── cockpit.d.ts   # TypeScript types for Cockpit
└── dist/                  # Compiled files (generated)
```

## Usage

1. After installation, access Cockpit via your browser
2. "Machines Dashboard" appears at the top of the navigation menu
3. Add machines via the host selector in the navigation bar
4. Use the dashboard to view and manage updates

## PackageKit API

The module uses PackageKit via D-Bus to:
- `GetUpdates`: Retrieve the list of available updates
- `UpdatePackages`: Install updates
- `RefreshCache`: Refresh the package cache

## Configuration

The module uses machines configured in Cockpit (stored in session storage).
No additional configuration is needed.

## Theme Support

The dashboard automatically adapts to your system's light or dark theme. PatternFly v6 CSS variables handle all theme-related styling.

## License

LGPL-2.1-or-later

## Contributing

Contributions are welcome! Feel free to open issues or pull requests.
