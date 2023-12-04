import path from "node:path";
import { Server } from "node:http";
import { OAuth2API, RESTPostOAuth2AccessTokenResult } from "@discordjs/core";
import { REST } from "@discordjs/rest";

import { randomUUID } from "node:crypto";

import express from "express";
import { open } from "openurl";

import ConfigManager, { DefaultConfigOptions } from "./ConfigManager.js";
import { page as callbackSuccessPage } from "../views/callback.js";

export interface DiscordCLIOptions {
    host: string;
    port: number;
    protocol: string;
    callback: string;
    scopes: string[];
}

export type CLICode = string;

export default class DiscordCLI {
    private _configs: ConfigManager;
    private oauth2: OAuth2API;
    private rest: REST;
    private app: express.Express;
    private server: Server;
    private _state: string;

    constructor(options: DiscordCLIOptions) {
        this.rest = new REST({ version: "10", authPrefix: "Bearer" });
        this.oauth2 = new OAuth2API(this.rest);

        this._configs = new ConfigManager();
        this._configs.load({
            host: options.host || undefined,
            port: options.port || undefined,
            protocol: options.protocol || undefined,
            callback: options.callback || undefined,
            scopes: options.scopes.join(" ") || undefined,
        });

        this.app = express();
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.json());
    }

    public get configs(): ConfigManager {
        return this._configs;
    }

    public config(data: Partial<DefaultConfigOptions>) {
        this._configs.load(data);
    }

    public set state(state: string) {
        this._state = state;
    }

    public get state(): string {
        return this._state;
    }

    public async setClientSecret(secret: string): Promise<void> {
        if (!this.configs.id) {
            throw new Error("Client ID must be set before client secret.");
        }

        this.rest = this.rest.setToken(secret);
        this.oauth2 = new OAuth2API(this.rest);

        await this.configs.setCredentials({
            secret: secret,
        });
    }

    public get redirectUri(): string {
        if (
            !this.configs.host ||
            !this.configs.port ||
            !this.configs.callback
        ) {
            throw new Error(
                "Server must be configured before redirect URI can be generated."
            );
        }

        return `${this.configs.protocol}://${this.configs.host}:${
            this.configs.port
        }${path.join("/", this.configs.callback)}`;
    }

    public get authorizationUrl(): string {
        if (
            !this.configs.id ||
            !this.configs.host ||
            !this.configs.port ||
            !this.configs.callback ||
            !this.configs.scopes
        ) {
            throw new Error(
                "CLI must be configured before authorization URL can be generated."
            );
        }

        this.state = randomUUID();

        return this.oauth2.generateAuthorizationURL({
            client_id: this.configs.id,
            redirect_uri: this.redirectUri,
            scope: this.configs.scopes,
            response_type: "code",
            state: this.state,
        });
    }

    public async hasTokens(): Promise<boolean> {
        const { accessToken, refreshToken } = await this.configs.getTokens();

        return !!accessToken && !!refreshToken;
    }

    public async saveTokens(
        tokens: RESTPostOAuth2AccessTokenResult
    ): Promise<void> {
        await this.configs.setTokens({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
        });
    }

    public async deleteTokens(): Promise<void> {
        await this.configs.deleteTokens();
    }

    public async getTokens(): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        const { accessToken, refreshToken } = await this.configs.getTokens();

        return { accessToken, refreshToken };
    }

    public async refreshTokens(): Promise<RESTPostOAuth2AccessTokenResult> {
        const { secret } = await this.configs.getCredentials();
        const { refreshToken } = await this.configs.getTokens();

        const response = await this.oauth2.refreshToken({
            client_id: this.configs.id,
            client_secret: secret,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        });

        await this.saveTokens(response);

        return;
    }

    public async exchangeCodeForTokens(
        code: CLICode
    ): Promise<RESTPostOAuth2AccessTokenResult> {
        if (!this.configs.id) {
            throw new Error(
                "Client ID must be set before tokens can be exchanged."
            );
        }

        const { secret } = await this.configs.getCredentials();
        const response = await this.oauth2.tokenExchange({
            client_id: this.configs.id,
            client_secret: secret,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: this.redirectUri,
        });

        return response;
    }

    public async initializeServer(): Promise<CLICode> {
        if (!this.configs.callback) {
            throw new Error(
                "Redirect path must be set before server can be initialized."
            );
        }

        const { secret } = await this.configs.getCredentials();
        if (!secret) {
            throw new Error(
                "Client secret must be set before server can be initialized."
            );
        }
        this.rest = this.rest.setToken(secret);
        this.oauth2 = new OAuth2API(this.rest);

        const promise = new Promise<CLICode>((resolve, reject) => {
            this.app.get(path.join("/", this.configs.callback), (req, res) => {
                const { code, state } = req.query;

                if (this.state !== state) {
                    res.send("Invalid state parameter.");
                    reject("Invalid state parameter.");
                }

                res.send(callbackSuccessPage);
                resolve(code as string);
            });
        });

        return promise;
    }

    public async openBrowser(): Promise<void> {
        await open(this.authorizationUrl);
    }

    public static MAX_AWAIT_DELAY = 5 * 60 * 1000;

    public async awaitAuthorizationCode(
        codePromise: Promise<CLICode>
    ): Promise<CLICode> {
        const code = await codePromise;

        if (!code) throw new Error("Max delay exceeded.");

        return code;
    }

    public startServer() {
        if (!this.configs.host || !this.configs.port) {
            throw new Error(
                "Server must be configured before it can be started."
            );
        }

        this.server = this.app.listen(this.configs.port, () => {
            console.log(
                `[Auth] Server started (${this.configs.protocol}://${this.configs.host}:${this.configs.port})`
            );
        });
    }

    public stopServer() {
        if (!this.server) {
            throw new Error("Server must be started before it can be stopped.");
        }

        this.server.close();
        this.server = null;

        console.log(
            `[Auth] Server stopped (${this.configs.protocol}://${this.configs.host}:${this.configs.port})`
        );
    }

    public async login(): Promise<void> {
        const hasTokens = await this.hasTokens();

        if (!hasTokens) {
            const codePromise = this.initializeServer();
            this.startServer();
            await this.openBrowser();
            const code = await this.awaitAuthorizationCode(codePromise);
            const tokens = await this.exchangeCodeForTokens(code);
            await this.saveTokens(tokens);
            this.stopServer();
        }
    }

    public async logout(): Promise<void> {
        const hasToken = await this.hasTokens();

        if (!hasToken) return;
        await this.deleteTokens();
    }
}
