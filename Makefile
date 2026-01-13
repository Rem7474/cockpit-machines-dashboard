# Cockpit Machines Dashboard Makefile
#
# Install with: make install
# Uninstall with: make uninstall

PACKAGE_NAME = machines-dashboard
DESTDIR ?=
PREFIX ?= /usr/local
DATADIR ?= $(PREFIX)/share/cockpit

# Build the project
all: build

build: node_modules
	npm run build

node_modules: package.json
	npm install

# Development mode with watch
watch: node_modules
	npm run watch

# Install to system
install: build
	mkdir -p $(DESTDIR)$(DATADIR)/$(PACKAGE_NAME)
	cp -r dist/* $(DESTDIR)$(DATADIR)/$(PACKAGE_NAME)/

# Install to user's home directory (for development)
install-home: build
	mkdir -p ~/.local/share/cockpit/$(PACKAGE_NAME)
	cp -r dist/* ~/.local/share/cockpit/$(PACKAGE_NAME)/

# Uninstall from system
uninstall:
	rm -rf $(DESTDIR)$(DATADIR)/$(PACKAGE_NAME)

# Uninstall from user's home directory
uninstall-home:
	rm -rf ~/.local/share/cockpit/$(PACKAGE_NAME)

# Clean build artifacts
clean:
	rm -rf dist/ node_modules/

# Create distribution tarball
dist: build
	tar -czf $(PACKAGE_NAME)-$(shell node -p "require('./package.json').version").tar.gz \
		--transform 's,^dist,$(PACKAGE_NAME),' dist/

.PHONY: all build watch install install-home uninstall uninstall-home clean dist
