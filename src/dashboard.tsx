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

import './dashboard.scss';

import cockpit from "cockpit";
import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from 'react-dom/client';

// PatternFly Components
import {
    Alert,
    AlertGroup,
    AlertActionCloseButton,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    CardFooter,
    Checkbox,
    Content,
    DescriptionList,
    DescriptionListDescription,
    DescriptionListGroup,
    DescriptionListTerm,
    EmptyState,
    EmptyStateActions,
    EmptyStateBody,
    EmptyStateFooter,
    Flex,
    FlexItem,
    Gallery,
    Page,
    PageSection,
    Progress,
    ProgressSize,
    Spinner,
    Split,
    SplitItem,
    Title,
    Toolbar,
    ToolbarContent,
    ToolbarItem,
    ToolbarGroup,
    Tooltip,
} from "@patternfly/react-core";

// PatternFly Icons
import {
    CheckCircleIcon,
    ExclamationCircleIcon,
    InProgressIcon,
    OutlinedClockIcon,
    RedoIcon,
    SecurityIcon,
    ServerIcon,
    SyncAltIcon,
} from "@patternfly/react-icons";

// Local modules
import {
    type Machine,
    type UpdateInfo,
    getMachinesList,
    subscribeMachines,
    getUpdatesForHost,
    installUpdatesOnHost,
    refreshPackageCache,
    getStateDescription,
    checkMachineConnection
} from "./machines-api";

const _ = cockpit.gettext;

interface MachineWithUpdates extends Machine {
    updates: UpdateInfo;
    updateProgress?: {
        percent: number;
        status: string;
    };
    updating?: boolean;
    selected?: boolean;
}

interface AlertInfo {
    key: string;
    variant: "success" | "danger" | "warning" | "info";
    title: string;
}

/**
 * Machine Card Component
 */
const MachineCard = ({
    machine,
    onRefresh,
    onUpdate,
    onSelect,
    isSelected,
}: {
    machine: MachineWithUpdates;
    onRefresh: (host: string) => void;
    onUpdate: (host: string, securityOnly?: boolean) => void;
    onSelect: (host: string, selected: boolean) => void;
    isSelected: boolean;
}) => {
    const stateClass = machine.state === "connected" ? "machine-connected"
        : machine.state === "failed" ? "machine-failed"
            : "machine-connecting";
    
    const statusClass = machine.state === "connected" ? "status-connected"
        : machine.state === "failed" ? "status-failed"
            : "status-connecting";
    
    const statusIcon = machine.state === "connected" ? <CheckCircleIcon />
        : machine.state === "failed" ? <ExclamationCircleIcon />
            : <InProgressIcon />;
    
    const hasSecurityUpdates = machine.updates.security > 0;
    const hasUpdates = machine.updates.total > 0;
    const isDisabled = machine.state !== "connected" || machine.updating;
    
    return (
        <Card 
            className={`machine-card ${stateClass}`} 
            isSelectable 
            isSelected={isSelected}
            isDisabled={isDisabled}
        >
            <CardHeader
                selectableActions={{
                    selectableActionId: `select-${machine.key}`,
                    selectableActionAriaLabel: cockpit.format(_("Select $0"), machine.label),
                    onChange: (_event, checked) => onSelect(machine.key, checked),
                    name: `machine-select-${machine.key}`,
                }}
            >
                <CardTitle>
                    <div className="machine-header">
                        <div 
                            className="machine-color" 
                            style={{ backgroundColor: machine.color || "#6a6e73" }}
                        />
                        <span className="machine-label">{machine.label}</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardBody>
                <DescriptionList isHorizontal isCompact>
                    <DescriptionListGroup>
                        <DescriptionListTerm>{_("Address")}</DescriptionListTerm>
                        <DescriptionListDescription>
                            {machine.user ? `${machine.user}@` : ""}{machine.address}
                        </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                        <DescriptionListTerm>{_("Status")}</DescriptionListTerm>
                        <DescriptionListDescription>
                            <span className={`machine-status ${statusClass}`}>
                                {statusIcon}
                                {getStateDescription(machine.state)}
                            </span>
                        </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                        <DescriptionListTerm>{_("Updates")}</DescriptionListTerm>
                        <DescriptionListDescription>
                            {machine.updates.loading ? (
                                <Spinner size="sm" />
                            ) : machine.updates.error ? (
                                <Tooltip content={machine.updates.error}>
                                    <span className="machine-status status-failed">
                                        <ExclamationCircleIcon />
                                        {_("Error")}
                                    </span>
                                </Tooltip>
                            ) : hasUpdates ? (
                                <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                                    <FlexItem>
                                        <span className="update-badge update-badge-normal">
                                            <Badge>{machine.updates.total}</Badge>
                                            {_("available")}
                                        </span>
                                    </FlexItem>
                                    {hasSecurityUpdates && (
                                        <FlexItem>
                                            <span className="update-badge update-badge-security">
                                                <SecurityIcon />
                                                <Badge>{machine.updates.security}</Badge>
                                                {_("security")}
                                            </span>
                                        </FlexItem>
                                    )}
                                </Flex>
                            ) : (
                                <span className="machine-status status-connected">
                                    <CheckCircleIcon />
                                    {_("Up to date")}
                                </span>
                            )}
                        </DescriptionListDescription>
                    </DescriptionListGroup>
                    {machine.updates.lastChecked && (
                        <DescriptionListGroup>
                            <DescriptionListTerm>{_("Last checked")}</DescriptionListTerm>
                            <DescriptionListDescription className="machine-details">
                                <OutlinedClockIcon /> {machine.updates.lastChecked.toLocaleTimeString()}
                            </DescriptionListDescription>
                        </DescriptionListGroup>
                    )}
                </DescriptionList>
                
                {machine.updating && machine.updateProgress && (
                    <Progress
                        className="update-progress"
                        value={machine.updateProgress.percent}
                        title={machine.updateProgress.status}
                        size={ProgressSize.sm}
                    />
                )}
            </CardBody>
            <CardFooter>
                <Split hasGutter>
                    <SplitItem>
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<RedoIcon />}
                            onClick={() => onRefresh(machine.key)}
                            isDisabled={machine.state !== "connected" || machine.updates.loading || machine.updating}
                        >
                            {_("Check")}
                        </Button>
                    </SplitItem>
                    {hasUpdates && !machine.updating && (
                        <>
                            <SplitItem>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => onUpdate(machine.key)}
                                    isDisabled={machine.state !== "connected"}
                                >
                                    {_("Update all")}
                                </Button>
                            </SplitItem>
                            {hasSecurityUpdates && (
                                <SplitItem>
                                    <Button
                                        variant="warning"
                                        size="sm"
                                        icon={<SecurityIcon />}
                                        onClick={() => onUpdate(machine.key, true)}
                                        isDisabled={machine.state !== "connected"}
                                    >
                                        {_("Security only")}
                                    </Button>
                                </SplitItem>
                            )}
                        </>
                    )}
                </Split>
            </CardFooter>
        </Card>
    );
};

/**
 * Summary Card Component
 */
const SummaryCard = ({
    machines
}: {
    machines: MachineWithUpdates[];
}) => {
    const connected = machines.filter(m => m.state === "connected").length;
    const failed = machines.filter(m => m.state === "failed").length;
    const totalUpdates = machines.reduce((sum, m) => sum + (m.updates.total || 0), 0);
    const securityUpdates = machines.reduce((sum, m) => sum + (m.updates.security || 0), 0);
    const upToDate = machines.filter(m => m.state === "connected" && m.updates.total === 0 && !m.updates.error).length;
    
    return (
        <Card className="summary-card">
            <CardTitle>
                <Title headingLevel="h2">{_("Overview")}</Title>
            </CardTitle>
            <CardBody>
                <div className="summary-item">
                    <span className="summary-value">{machines.length}</span>
                    <span className="summary-label">{_("Total machines")}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-value" style={{ color: "var(--pf-v6-global--success-color--100)" }}>
                        {connected}
                    </span>
                    <span className="summary-label">{_("Connected")}</span>
                </div>
                {failed > 0 && (
                    <div className="summary-item">
                        <span className="summary-value" style={{ color: "var(--pf-v6-global--danger-color--100)" }}>
                            {failed}
                        </span>
                        <span className="summary-label">{_("Failed")}</span>
                    </div>
                )}
                <div className="summary-item">
                    <span className="summary-value" style={{ color: "var(--pf-v6-global--info-color--100)" }}>
                        {totalUpdates}
                    </span>
                    <span className="summary-label">{_("Updates available")}</span>
                </div>
                {securityUpdates > 0 && (
                    <div className="summary-item">
                        <span className="summary-value" style={{ color: "var(--pf-v6-global--danger-color--100)" }}>
                            {securityUpdates}
                        </span>
                        <span className="summary-label">{_("Security updates")}</span>
                    </div>
                )}
                <div className="summary-item">
                    <span className="summary-value" style={{ color: "var(--pf-v6-global--success-color--100)" }}>
                        {upToDate}
                    </span>
                    <span className="summary-label">{_("Up to date")}</span>
                </div>
            </CardBody>
        </Card>
    );
};

/**
 * Main Dashboard Component
 */
const MachinesDashboard = () => {
    const [machines, setMachines] = useState<MachineWithUpdates[]>([]);
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<AlertInfo[]>([]);
    const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set());
    const [bulkUpdating, setBulkUpdating] = useState(false);
    
    // Add alert helper
    const addAlert = useCallback((variant: AlertInfo["variant"], title: string) => {
        const key = `alert-${Date.now()}`;
        setAlerts(prev => [...prev, { key, variant, title }]);
    }, []);
    
    // Remove alert helper
    const removeAlert = useCallback((key: string) => {
        setAlerts(prev => prev.filter(a => a.key !== key));
    }, []);
    
    // Load machines and their update status
    const loadMachines = useCallback(async () => {
        const machineList = getMachinesList();
        
        // Initialize with loading state - mark unknown states as "connecting"
        const initialMachines: MachineWithUpdates[] = machineList.map(m => ({
            ...m,
            state: m.state || "unknown",
            updates: {
                total: 0,
                security: 0,
                loading: true,
                error: null,
                lastChecked: null
            }
        }));
        
        setMachines(initialMachines);
        setLoading(false);
        
        // Process each machine
        for (const machine of machineList) {
            let effectiveState = machine.state;
            let machineLabel = machine.label;
            
            // If state is unknown or undefined, check the connection
            if (!effectiveState || effectiveState === "unknown") {
                // Update to connecting state
                setMachines(prev => prev.map(m =>
                    m.key === machine.key ? { ...m, state: "connecting" } : m
                ));
                
                // Check the actual connection and get hostname
                const { state, hostname } = await checkMachineConnection(machine.address);
                effectiveState = state;
                
                // Use hostname if available, otherwise keep existing label
                if (hostname) {
                    machineLabel = hostname;
                }
                
                // Update with actual state and hostname
                setMachines(prev => prev.map(m =>
                    m.key === machine.key ? { ...m, state: effectiveState, label: machineLabel } : m
                ));
            }
            
            // Now load updates if connected
            if (effectiveState === "connected") {
                try {
                    const updates = await getUpdatesForHost(machine.address);
                    setMachines(prev => prev.map(m =>
                        m.key === machine.key ? { ...m, updates } : m
                    ));
                } catch (error) {
                    const err = error as Error;
                    setMachines(prev => prev.map(m =>
                        m.key === machine.key ? {
                            ...m,
                            updates: {
                                total: 0,
                                security: 0,
                                loading: false,
                                error: err.message,
                                lastChecked: new Date()
                            }
                        } : m
                    ));
                }
            } else {
                setMachines(prev => prev.map(m =>
                    m.key === machine.key ? {
                        ...m,
                        updates: {
                            total: 0,
                            security: 0,
                            loading: false,
                            error: effectiveState === "failed" ? _("Machine not connected") : null,
                            lastChecked: null
                        }
                    } : m
                ));
            }
        }
    }, []);
    
    // Refresh updates for a specific machine
    const refreshMachine = useCallback(async (host: string) => {
        // First, set to connecting/loading state
        setMachines(prev => prev.map(m =>
            m.key === host ? {
                ...m,
                state: m.state === "connected" ? "connected" : "connecting",
                updates: { ...m.updates, loading: true }
            } : m
        ));
        
        try {
            // Check connection if not already connected
            const machine = machines.find(m => m.key === host);
            if (machine && machine.state !== "connected") {
                const { state: connectionState, hostname } = await checkMachineConnection(host);
                setMachines(prev => prev.map(m =>
                    m.key === host ? { 
                        ...m, 
                        state: connectionState,
                        label: hostname || m.label 
                    } : m
                ));
                
                if (connectionState !== "connected") {
                    setMachines(prev => prev.map(m =>
                        m.key === host ? {
                            ...m,
                            updates: {
                                total: 0,
                                security: 0,
                                loading: false,
                                error: _("Machine not connected"),
                                lastChecked: new Date()
                            }
                        } : m
                    ));
                    return;
                }
            }
            
            // Refresh cache and get updates
            await refreshPackageCache(host);
            const updates = await getUpdatesForHost(host);
            setMachines(prev => prev.map(m =>
                m.key === host ? { ...m, state: "connected", updates } : m
            ));
        } catch (error) {
            const err = error as Error;
            setMachines(prev => prev.map(m =>
                m.key === host ? {
                    ...m,
                    updates: {
                        ...m.updates,
                        loading: false,
                        error: err.message
                    }
                } : m
            ));
            addAlert("danger", cockpit.format(_("Failed to check updates on $0: $1"), host, err.message));
        }
    }, [addAlert, machines]);
    
    // Update a specific machine
    const updateMachine = useCallback(async (host: string, securityOnly = false) => {
        setMachines(prev => prev.map(m =>
            m.key === host ? {
                ...m,
                updating: true,
                updateProgress: { percent: 0, status: _("Starting update...") }
            } : m
        ));
        
        try {
            const result = await installUpdatesOnHost(
                host,
                (percent, status) => {
                    setMachines(prev => prev.map(m =>
                        m.key === host ? {
                            ...m,
                            updateProgress: { percent, status }
                        } : m
                    ));
                },
                securityOnly
            );
            
            if (result.success) {
                addAlert("success", cockpit.format(_("Updates installed successfully on $0"), host));
                if (result.rebootRequired) {
                    addAlert("warning", cockpit.format(_("$0 requires a reboot to complete the update"), host));
                }
                // Refresh to show current state
                await refreshMachine(host);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            const err = error as Error;
            addAlert("danger", cockpit.format(_("Failed to update $0: $1"), host, err.message));
        } finally {
            setMachines(prev => prev.map(m =>
                m.key === host ? {
                    ...m,
                    updating: false,
                    updateProgress: undefined
                } : m
            ));
        }
    }, [addAlert, refreshMachine]);
    
    // Bulk refresh all machines
    const refreshAll = useCallback(async () => {
        const connectedMachines = machines.filter(m => m.state === "connected");
        for (const machine of connectedMachines) {
            await refreshMachine(machine.key);
        }
    }, [machines, refreshMachine]);
    
    // Bulk update selected machines
    const updateSelected = useCallback(async (securityOnly = false) => {
        setBulkUpdating(true);
        const selectedList = machines.filter(m => selectedMachines.has(m.key) && m.state === "connected");
        
        for (const machine of selectedList) {
            if (machine.updates.total > 0) {
                await updateMachine(machine.key, securityOnly);
            }
        }
        
        setBulkUpdating(false);
        setSelectedMachines(new Set());
    }, [machines, selectedMachines, updateMachine]);
    
    // Update all machines with pending updates
    const updateAll = useCallback(async (securityOnly = false) => {
        setBulkUpdating(true);
        const machinesWithUpdates = machines.filter(m =>
            m.state === "connected" && m.updates.total > 0 && !m.updating
        );
        
        for (const machine of machinesWithUpdates) {
            await updateMachine(machine.key, securityOnly);
        }
        
        setBulkUpdating(false);
    }, [machines, updateMachine]);
    
    // Handle machine selection
    const handleSelect = useCallback((host: string, selected: boolean) => {
        setSelectedMachines(prev => {
            const next = new Set(prev);
            if (selected) {
                next.add(host);
            } else {
                next.delete(host);
            }
            return next;
        });
    }, []);
    
    // Select all/none
    const selectAll = useCallback((selected: boolean) => {
        if (selected) {
            const connectedMachines = machines.filter(m => m.state === "connected" && !m.updating);
            setSelectedMachines(new Set(connectedMachines.map(m => m.key)));
        } else {
            setSelectedMachines(new Set());
        }
    }, [machines]);
    
    // Subscribe to machine changes
    useEffect(() => {
        loadMachines();
        
        const unsubscribe = subscribeMachines((newMachineList) => {
            // Check if machine list has actually changed
            setMachines(prev => {
                const prevKeys = new Set(prev.map(m => m.key));
                const newKeys = new Set(newMachineList.map(m => m.key));
                
                // Check if keys changed or if any machine state changed
                const keysChanged = prevKeys.size !== newKeys.size ||
                    [...prevKeys].some(k => !newKeys.has(k)) ||
                    [...newKeys].some(k => !prevKeys.has(k));
                
                const stateChanged = newMachineList.some(newM => {
                    const oldM = prev.find(p => p.key === newM.key);
                    return oldM && oldM.state !== newM.state;
                });
                
                if (keysChanged || stateChanged) {
                    // Merge new machine data with existing update info
                    return newMachineList.map(newM => {
                        const existing = prev.find(p => p.key === newM.key);
                        if (existing) {
                            // Keep existing update info, update machine state
                            const needsRefresh = existing.state !== newM.state && newM.state === "connected";
                            return {
                                ...existing,
                                ...newM,
                                updates: needsRefresh ? { ...existing.updates, loading: true } : existing.updates
                            };
                        }
                        // New machine - will load updates
                        return {
                            ...newM,
                            updates: {
                                total: 0,
                                security: 0,
                                loading: newM.state === "connected",
                                error: null,
                                lastChecked: null
                            }
                        };
                    });
                }
                return prev;
            });
        });
        
        return () => {
            unsubscribe();
        };
    }, []);
    
    // Auto-refresh updates for machines that need it
    useEffect(() => {
        const machinesNeedingRefresh = machines.filter(m => 
            m.state === "connected" && 
            m.updates.loading && 
            !m.updating
        );
        
        for (const machine of machinesNeedingRefresh) {
            getUpdatesForHost(machine.address).then(updates => {
                setMachines(prev => prev.map(m =>
                    m.key === machine.key ? { ...m, updates } : m
                ));
            }).catch(error => {
                const err = error as Error;
                setMachines(prev => prev.map(m =>
                    m.key === machine.key ? {
                        ...m,
                        updates: {
                            total: 0,
                            security: 0,
                            loading: false,
                            error: err.message,
                            lastChecked: new Date()
                        }
                    } : m
                ));
            });
        }
    }, [machines]);
    
    // Calculate summary stats
    const totalUpdates = machines.reduce((sum, m) => sum + (m.updates.total || 0), 0);
    const securityUpdates = machines.reduce((sum, m) => sum + (m.updates.security || 0), 0);
    const selectedUpdates = machines
        .filter(m => selectedMachines.has(m.key))
        .reduce((sum, m) => sum + (m.updates.total || 0), 0);
    
    if (loading) {
        return (
            <Page className="dashboard-page">
                <PageSection>
                    <EmptyState titleText={_("Loading machines...")} icon={Spinner} />
                </PageSection>
            </Page>
        );
    }
    
    if (machines.length === 0) {
        return (
            <Page className="dashboard-page">
                <PageSection>
                    <EmptyState headingLevel="h2" titleText={_("No machines configured")} icon={ServerIcon}>
                        <EmptyStateBody>
                            {_("Add machines through the host selector in the top navigation to manage them from this dashboard.")}
                        </EmptyStateBody>
                    </EmptyState>
                </PageSection>
            </Page>
        );
    }
    
    return (
        <Page className="dashboard-page">
            <AlertGroup isToast isLiveRegion>
                {alerts.map(alert => (
                    <Alert
                        key={alert.key}
                        variant={alert.variant}
                        title={alert.title}
                        actionClose={<AlertActionCloseButton onClose={() => removeAlert(alert.key)} />}
                        timeout={5000}
                        onTimeout={() => removeAlert(alert.key)}
                    />
                ))}
            </AlertGroup>
            
            <PageSection>
                <SummaryCard machines={machines} />
            </PageSection>
            
            <PageSection>
                <div className="toolbar-section">
                    <Toolbar>
                        <ToolbarContent>
                            <ToolbarGroup variant="action-group">
                                <ToolbarItem>
                                    <Button
                                        variant="secondary"
                                        icon={<SyncAltIcon />}
                                        onClick={refreshAll}
                                        isDisabled={bulkUpdating}
                                    >
                                        {_("Refresh all")}
                                    </Button>
                                </ToolbarItem>
                                {totalUpdates > 0 && (
                                    <>
                                        <ToolbarItem>
                                            <Button
                                                variant="primary"
                                                onClick={() => updateAll(false)}
                                                isLoading={bulkUpdating}
                                                isDisabled={bulkUpdating}
                                            >
                                                {cockpit.format(_("Update all ($0)"), totalUpdates)}
                                            </Button>
                                        </ToolbarItem>
                                        {securityUpdates > 0 && (
                                            <ToolbarItem>
                                                <Button
                                                    variant="warning"
                                                    icon={<SecurityIcon />}
                                                    onClick={() => updateAll(true)}
                                                    isLoading={bulkUpdating}
                                                    isDisabled={bulkUpdating}
                                                >
                                                    {cockpit.format(_("Security only ($0)"), securityUpdates)}
                                                </Button>
                                            </ToolbarItem>
                                        )}
                                    </>
                                )}
                            </ToolbarGroup>
                            <ToolbarGroup variant="action-group-plain" align={{ default: "alignEnd" }}>
                                <ToolbarItem>
                                    <Checkbox
                                        id="select-all"
                                        label={_("Select all")}
                                        isChecked={selectedMachines.size > 0 && selectedMachines.size === machines.filter(m => m.state === "connected" && !m.updating).length}
                                        onChange={(_event, checked) => selectAll(checked)}
                                        isDisabled={bulkUpdating}
                                    />
                                </ToolbarItem>
                                {selectedMachines.size > 0 && selectedUpdates > 0 && (
                                    <ToolbarItem>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => updateSelected(false)}
                                            isLoading={bulkUpdating}
                                            isDisabled={bulkUpdating}
                                        >
                                            {cockpit.format(_("Update selected ($0)"), selectedUpdates)}
                                        </Button>
                                    </ToolbarItem>
                                )}
                            </ToolbarGroup>
                        </ToolbarContent>
                    </Toolbar>
                </div>
            </PageSection>
            
            <PageSection isFilled>
                <div className="machines-gallery">
                    {machines.map(machine => (
                        <MachineCard
                            key={machine.key}
                            machine={machine}
                            onRefresh={refreshMachine}
                            onUpdate={updateMachine}
                            onSelect={handleSelect}
                            isSelected={selectedMachines.has(machine.key)}
                        />
                    ))}
                </div>
            </PageSection>
        </Page>
    );
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const root = createRoot(document.getElementById('app')!);
    root.render(<MachinesDashboard />);
});
