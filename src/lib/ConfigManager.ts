import fs from "node:fs";
import keytar from "keytar";

export interface DiscordCredentials {
    secret: string;
}

export interface DiscordTokens {
    accessToken: string;
    refreshToken: string;
}

export interface CLIConfig {
    id: string;
    secret: string;
    host: string;
    port: number;
    protocol: string;
    callback: string;
    scopes: string;
}

export interface DefaultConfigOptions extends CLIConfig {}

export enum ConfigKey {
    DISCORD_CLIENT = "discord-secret",
    CLI_ACCESS = "cli-access",
    CLI_REFRESH = "cli-refresh",
}

export default class ConfigManager {
    public static readonly SERVICE_NAME = "discord-cli";

    private _configPath: string = ".env.json";
    private _id: string;
    private _host: string;
    private _port: number;
    private _protocol: string;
    private _callback: string;
    private _scopes: string;

    constructor() {}

    public get id(): string {
        return this._id;
    }

    public set id(id: string) {
        this._id = id;
        this._write({ id });
    }

    public get host(): string {
        return this._host;
    }

    public set host(host: string) {
        this._host = host;
        this._write({ host });
    }

    public get port(): number {
        return this._port;
    }

    public set port(port: number) {
        this._port = port;
        this._write({ port });
    }

    public get protocol(): string {
        return this._protocol;
    }

    public set protocol(protocol: string) {
        this._protocol = protocol;
        this._write({ protocol });
    }

    public get callback(): string {
        return this._callback;
    }

    public set callback(callback: string) {
        this._callback = callback;
        this._write({ callback });
    }

    public get scopes(): string {
        return this._scopes;
    }

    public set scopes(scopes: string) {
        this._scopes = scopes;
        this._write({ scopes });
    }

    public async getCredentials(): Promise<DiscordCredentials> {
        const secret = await keytar.getPassword(
            ConfigManager.SERVICE_NAME,
            ConfigKey.DISCORD_CLIENT
        );
        return { secret };
    }

    public async setCredentials(
        credentials: DiscordCredentials
    ): Promise<void> {
        const { secret } = credentials;

        await keytar.setPassword(
            ConfigManager.SERVICE_NAME,
            ConfigKey.DISCORD_CLIENT,
            secret
        );
    }

    public async deleteCredentials(): Promise<void> {
        await keytar.deletePassword(
            ConfigManager.SERVICE_NAME,
            ConfigKey.DISCORD_CLIENT
        );
    }

    public async hasCredentials(): Promise<boolean> {
        const { secret } = await this.getCredentials();

        return !!secret;
    }

    public async getTokens(): Promise<DiscordTokens> {
        const accessToken = await keytar.getPassword(
            ConfigManager.SERVICE_NAME,
            ConfigKey.CLI_ACCESS
        );
        const refreshToken = await keytar.getPassword(
            ConfigManager.SERVICE_NAME,
            ConfigKey.CLI_REFRESH
        );
        return { accessToken, refreshToken };
    }

    public async setTokens(tokens: DiscordTokens): Promise<void> {
        const { accessToken, refreshToken } = tokens;

        await keytar.setPassword(
            ConfigManager.SERVICE_NAME,
            ConfigKey.CLI_ACCESS,
            accessToken
        );
        await keytar.setPassword(
            ConfigManager.SERVICE_NAME,
            ConfigKey.CLI_REFRESH,
            refreshToken
        );
    }

    public async deleteTokens(): Promise<void> {
        await keytar.deletePassword(
            ConfigManager.SERVICE_NAME,
            ConfigKey.CLI_ACCESS
        );
        await keytar.deletePassword(
            ConfigManager.SERVICE_NAME,
            ConfigKey.CLI_REFRESH
        );
    }

    public async hasTokens(): Promise<boolean> {
        const { accessToken, refreshToken } = await this.getTokens();

        return !!accessToken && !!refreshToken;
    }

    /**
     * Write data to the config file for provided options and keep the rest of the config the same
     * @param data
     * @returns {void}
     */
    private _write(data: Partial<CLIConfig>): void {
        const config = {
            id: this._id,
            host: this._host,
            port: this._port,
            protocol: this._protocol,
            callback: this._callback,
            scopes: this._scopes,
            ...data,
        };

        fs.writeFileSync(this._configPath, JSON.stringify(config));
    }

    /**
     * Load the config file and set the config values
     * @param options
     */
    public load(options: Partial<DefaultConfigOptions>): void {
        const exists = fs.existsSync(this._configPath);
        if (!exists) {
            this._write({});
        }

        const data = fs.readFileSync(this._configPath);

        if (!data) {
            this._write(options);
        }

        const config = JSON.parse(data.toString());
        const newConfig = {
            ...config,
            ...options,
        };

        this._id = newConfig.id;
        this._host = newConfig.host;
        this._port = newConfig.port;
        this._protocol = newConfig.protocol;
        this._callback = newConfig.callback;
        this._scopes = newConfig.scopes;
    }
}
