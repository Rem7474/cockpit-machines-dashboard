/*
 * This file is part of Cockpit Machines Dashboard.
 *
 * Copyright (C) 2026
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 */

import cockpit from "cockpit";

const _ = cockpit.gettext;

/**
 * Interface representing update information for a machine
 */
export interface UpdateInfo {
    total: number;
    security: number;
    loading: boolean;
    error: string | null;
    lastChecked: Date | null;
}

/**
 * Interface representing a machine
 */
export interface Machine {
    key: string;
    address: string;
    label: string;
    user?: string;
    color?: string;
    state?: string;
    visible?: boolean;
    avatar?: string;
}

/**
 * Interface for the machines store
 */
export interface MachinesData {
    content: Record<string, Machine>;
    overlay: Record<string, Partial<Machine>>;
}

const SESSION_KEY = cockpit.sessionStorage.prefixedKey("v2-machines.json");

/**
 * Get the list of machines from session storage
 */
export function getMachinesList(): Machine[] {
    try {
        const data = window.sessionStorage.getItem(SESSION_KEY);
        if (!data) {
            // Return at least localhost if no machines data exists
            return [{
                key: "localhost",
                address: "localhost",
                label: window.location.hostname || "localhost",
                state: "connected",
                visible: true
            }];
        }
        
        const parsed: MachinesData = JSON.parse(data);
        const machines: Machine[] = [];
        
        const content = parsed.content || {};
        const overlay = parsed.overlay || {};
        
        // Merge content and overlay
        const allHosts = new Set([...Object.keys(content), ...Object.keys(overlay)]);
        
        for (const host of allHosts) {
            const machine: Machine = {
                key: host,
                address: host,
                label: host,
                ...content[host],
                ...overlay[host]
            };
            
            // Only include visible machines
            if (machine.visible !== false) {
                // Set default label if not present
                if (!machine.label) {
                    if (host === "localhost" || host === "localhost.localdomain") {
                        machine.label = window.location.hostname;
                    } else {
                        machine.label = host;
                    }
                }
                
                machines.push(machine);
            }
        }
        
        // If no machines found, return at least localhost
        if (machines.length === 0) {
            return [{
                key: "localhost",
                address: "localhost",
                label: window.location.hostname || "localhost",
                state: "connected",
                visible: true
            }];
        }
        
        return machines.sort((a, b) => a.label.localeCompare(b.label));
    } catch (e) {
        console.error("Failed to parse machines data:", e);
        return [{
            key: "localhost",
            address: "localhost",
            label: window.location.hostname || "localhost",
            state: "connected",
            visible: true
        }];
    }
}

/**
 * Subscribe to machine list changes
 * Uses polling since storage events only fire from other tabs
 */
export function subscribeMachines(callback: (machines: Machine[]) => void): () => void {
    let lastData = window.sessionStorage.getItem(SESSION_KEY);
    let isActive = true;
    
    // Storage event handler (for changes from other tabs)
    const storageHandler = (ev: StorageEvent) => {
        if (ev.key === SESSION_KEY && ev.storageArea === window.sessionStorage) {
            lastData = ev.newValue;
            callback(getMachinesList());
        }
    };
    
    window.addEventListener("storage", storageHandler);
    
    // Polling to detect changes within the same tab
    // Cockpit updates sessionStorage when machines change
    const pollInterval = setInterval(() => {
        if (!isActive) return;
        
        const currentData = window.sessionStorage.getItem(SESSION_KEY);
        if (currentData !== lastData) {
            lastData = currentData;
            callback(getMachinesList());
        }
    }, 2000); // Poll every 2 seconds
    
    // Initial call
    callback(getMachinesList());
    
    // Return unsubscribe function
    return () => {
        isActive = false;
        window.removeEventListener("storage", storageHandler);
        clearInterval(pollInterval);
    };
}

/**
 * Get PackageKit updates for a specific host
 */
export async function getUpdatesForHost(host: string): Promise<UpdateInfo> {
    const result: UpdateInfo = {
        total: 0,
        security: 0,
        loading: false,
        error: null,
        lastChecked: new Date()
    };
    
    try {
        // Connect to the host's PackageKit
        const options = host === "localhost" ? {} : { host };
        const pkProxy = cockpit.dbus("org.freedesktop.PackageKit", options);
        
        // Create transaction for getting updates
        const transactionPath = await pkProxy.call(
            "/org/freedesktop/PackageKit",
            "org.freedesktop.PackageKit",
            "CreateTransaction",
            []
        ) as [string];
        
        if (!transactionPath || !transactionPath[0]) {
            throw new Error(_("Failed to create PackageKit transaction"));
        }
        
        const transaction = pkProxy.proxy(
            "org.freedesktop.PackageKit.Transaction",
            transactionPath[0]
        );
        
        await transaction.wait();
        
        // Subscribe to Package signals
        const updates: { name: string; severity: string }[] = [];
        
        const packageSignal = pkProxy.subscribe(
            { path: transactionPath[0], interface: "org.freedesktop.PackageKit.Transaction", member: "Package" },
            (_path: string, _iface: string, _signal: string, args: unknown[]) => {
                const info = args[0] as number;
                const packageId = args[1] as string;
                const name = packageId.split(";")[0];
                
                // Info values: PK_INFO_ENUM_SECURITY = 8
                const isSecurity = info === 8;
                updates.push({ name, severity: isSecurity ? "security" : "normal" });
            }
        );
        
        // Wait for completion
        await new Promise<void>((resolve, reject) => {
            const finishedSignal = pkProxy.subscribe(
                { path: transactionPath[0], interface: "org.freedesktop.PackageKit.Transaction", member: "Finished" },
                () => {
                    finishedSignal.remove();
                    resolve();
                }
            );
            
            const errorSignal = pkProxy.subscribe(
                { path: transactionPath[0], interface: "org.freedesktop.PackageKit.Transaction", member: "ErrorCode" },
                (_path: string, _iface: string, _signal: string, args: unknown[]) => {
                    errorSignal.remove();
                    reject(new Error(args[1] as string));
                }
            );
            
            // Call GetUpdates (0 = FILTER_NONE)
            (transaction as unknown as { GetUpdates: (filter: number) => Promise<void> }).GetUpdates(0).catch(reject);
        });
        
        packageSignal.remove();
        
        result.total = updates.length;
        result.security = updates.filter(u => u.severity === "security").length;
        
    } catch (error) {
        const err = error as Error;
        // Don't treat "service not available" as an error - just no updates info
        if (err.message?.includes("not-found") || err.message?.includes("ServiceUnknown")) {
            result.error = _("PackageKit not available");
        } else {
            result.error = err.message || _("Failed to check for updates");
        }
    }
    
    return result;
}

/**
 * Install all updates on a specific host
 */
export async function installUpdatesOnHost(
    host: string,
    onProgress?: (percent: number, status: string) => void,
    securityOnly?: boolean
): Promise<{ success: boolean; error?: string; rebootRequired?: boolean }> {
    try {
        const options = host === "localhost" ? {} : { host };
        const pkProxy = cockpit.dbus("org.freedesktop.PackageKit", options);
        
        // Create transaction
        const transactionPath = await pkProxy.call(
            "/org/freedesktop/PackageKit",
            "org.freedesktop.PackageKit",
            "CreateTransaction",
            []
        ) as [string];
        
        if (!transactionPath || !transactionPath[0]) {
            throw new Error(_("Failed to create PackageKit transaction"));
        }
        
        const transaction = pkProxy.proxy(
            "org.freedesktop.PackageKit.Transaction",
            transactionPath[0]
        );
        
        await transaction.wait();
        
        // Subscribe to progress
        if (onProgress) {
            pkProxy.subscribe(
                { path: transactionPath[0], interface: "org.freedesktop.PackageKit.Transaction", member: "Percentage" },
                (_path: string, _iface: string, _signal: string, args: unknown[]) => {
                    const percent = args[0] as number;
                    if (percent <= 100) {
                        onProgress(percent, _("Installing updates..."));
                    }
                }
            );
            
            pkProxy.subscribe(
                { path: transactionPath[0], interface: "org.freedesktop.PackageKit.Transaction", member: "ItemProgress" },
                (_path: string, _iface: string, _signal: string, args: unknown[]) => {
                    const packageId = args[0] as string;
                    const percent = args[1] as number;
                    const name = packageId.split(";")[0];
                    if (percent <= 100) {
                        onProgress(percent, cockpit.format(_("Updating $0..."), name));
                    }
                }
            );
        }
        
        let rebootRequired = false;
        
        // Wait for completion
        await new Promise<void>((resolve, reject) => {
            pkProxy.subscribe(
                { path: transactionPath[0], interface: "org.freedesktop.PackageKit.Transaction", member: "Finished" },
                (_path: string, _iface: string, _signal: string, args: unknown[]) => {
                    // exit value 1 means reboot required
                    const exitCode = args[0] as number;
                    rebootRequired = exitCode === 1;
                    resolve();
                }
            );
            
            pkProxy.subscribe(
                { path: transactionPath[0], interface: "org.freedesktop.PackageKit.Transaction", member: "ErrorCode" },
                (_path: string, _iface: string, _signal: string, args: unknown[]) => {
                    reject(new Error(args[1] as string));
                }
            );
            
            // UpdatePackages: installs all available updates
            // Flags: 1 = ONLY_TRUSTED, 4 = SECURITY if securityOnly
            const flags = securityOnly ? 5 : 1;
            (transaction as unknown as { UpdatePackages: (flags: number, packages: string[]) => Promise<void> })
                .UpdatePackages(flags, []).catch(reject);
        });
        
        return { success: true, rebootRequired };
        
    } catch (error) {
        const err = error as Error;
        return { success: false, error: err.message || _("Failed to install updates") };
    }
}

/**
 * Refresh package cache on a host
 */
export async function refreshPackageCache(host: string): Promise<void> {
    const options = host === "localhost" ? {} : { host };
    const pkProxy = cockpit.dbus("org.freedesktop.PackageKit", options);
    
    const transactionPath = await pkProxy.call(
        "/org/freedesktop/PackageKit",
        "org.freedesktop.PackageKit",
        "CreateTransaction",
        []
    ) as [string];
    
    if (!transactionPath || !transactionPath[0]) {
        throw new Error(_("Failed to create PackageKit transaction"));
    }
    
    const transaction = pkProxy.proxy(
        "org.freedesktop.PackageKit.Transaction",
        transactionPath[0]
    );
    
    await transaction.wait();
    
    await new Promise<void>((resolve, reject) => {
        pkProxy.subscribe(
            { path: transactionPath[0], interface: "org.freedesktop.PackageKit.Transaction", member: "Finished" },
            () => resolve()
        );
        
        pkProxy.subscribe(
            { path: transactionPath[0], interface: "org.freedesktop.PackageKit.Transaction", member: "ErrorCode" },
            (_path: string, _iface: string, _signal: string, args: unknown[]) => {
                reject(new Error(args[1] as string));
            }
        );
        
        // force=true to refresh even if cache is valid
        (transaction as unknown as { RefreshCache: (force: boolean) => Promise<void> })
            .RefreshCache(true).catch(reject);
    });
}

/**
 * Get the connection state description
 */
export function getStateDescription(state?: string): string {
    switch (state) {
    case "connected":
        return _("Connected");
    case "connecting":
        return _("Connecting...");
    case "failed":
        return _("Connection failed");
    case "unknown":
        return _("Not checked");
    default:
        return _("Unknown");
    }
}

/**
 * Check if a remote machine is reachable by attempting a simple command
 * Returns the connection state
 */
export async function checkMachineConnection(host: string): Promise<"connected" | "failed"> {
    if (host === "localhost") {
        return "connected";
    }
    
    try {
        // Try to run a simple command on the remote host
        const channel = cockpit.channel({
            host,
            payload: "stream",
            spawn: ["echo", "ok"],
            superuser: false,
        });
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                channel.close();
                resolve("failed");
            }, 10000); // 10 second timeout
            
            channel.addEventListener("close", (ev: Event, options: { problem?: string }) => {
                clearTimeout(timeout);
                if (options.problem) {
                    resolve("failed");
                } else {
                    resolve("connected");
                }
            });
        });
    } catch {
        return "failed";
    }
}
