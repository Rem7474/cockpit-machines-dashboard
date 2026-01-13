/*
 * Cockpit TypeScript type definitions
 * Simplified version for standalone packages
 */

declare module 'cockpit' {
    type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
    type JsonObject = Record<string, JsonValue>;

    // Basic functions
    function gettext(message: string): string;
    function format(format: string, ...args: unknown[]): string;

    // Session storage with prefix
    const sessionStorage: {
        prefixedKey(key: string): string;
    };

    // User information
    interface UserInfo {
        name: string;
        full_name?: string;
        id: number;
        gid: number;
        groups: string[];
        home: string;
        shell: string;
    }

    function user(): Promise<UserInfo>;

    // D-Bus interface
    interface DBusClient {
        proxy(iface: string, path: string): DBusProxy;
        call(path: string, iface: string, method: string, args: unknown[]): Promise<unknown[]>;
        subscribe(
            match: { path?: string; interface?: string; member?: string },
            callback: (path: string, iface: string, signal: string, args: unknown[]) => void
        ): { remove(): void };
        close(): void;
    }

    interface DBusProxy {
        wait(): Promise<void>;
        [method: string]: unknown;
    }

    interface DBusOptions {
        bus?: string;
        host?: string;
        superuser?: string;
    }

    function dbus(name: string | null, options?: DBusOptions): DBusClient;

    // Variant helper
    function variant(type: string, value: unknown): { t: string; v: unknown };

    // Script execution
    function script(script: string, args?: string[], options?: { err?: string }): Promise<string>;

    // File operations
    interface FileHandle {
        read(): Promise<string>;
        replace(content: string): Promise<void>;
        close(): void;
    }

    function file(path: string, options?: { syntax?: unknown }): FileHandle;

    // Spawn processes
    interface SpawnOptions {
        host?: string;
        superuser?: string | boolean;
        err?: string;
    }

    interface SpawnHandle extends Promise<string> {
        stream(callback: (data: string) => void): SpawnHandle;
        close(problem?: string): void;
    }

    function spawn(args: string[], options?: SpawnOptions): SpawnHandle;

    // Transport
    const transport: {
        csrf_token: string;
        origin: string;
        host: string;
        application(): string;
    };

    // Location/navigation
    interface Location {
        url: string;
        path: string[];
        options: Record<string, string>;
        go(path: string | string[], options?: Record<string, string>): void;
        replace(path: string | string[], options?: Record<string, string>): void;
    }

    const location: Location;

    // Event handling
    function addEventListener(event: string, handler: () => void): void;
    function removeEventListener(event: string, handler: () => void): void;
}

export = cockpit;
export as namespace cockpit;
