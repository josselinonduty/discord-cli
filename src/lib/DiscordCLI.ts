import path from "node:path";
import { Server } from "node:http";
import { OAuth2API, RESTPostOAuth2AccessTokenResult } from "@discordjs/core";
import { REST } from "@discordjs/rest";

import open from "open";
import keytar from "keytar";
import { randomUUID } from "crypto";

import express from "express";

export interface CLIOptions {
    serverPort: number;
    redirectPath: string;
    clientId: string;
    clientSecret: string;
    serverHost?: string;
    serverProtocol?: string;
    scopes: string[];
}

export type CLICode = string;

export const DISCORD_CLI_SERVICE = "discord-cli";

export default class DiscordCLI {
    private serverPort: number;
    private redirectPath: string;
    private clientId: string;
    private clientSecret: string;
    private serverHost: string;
    private serverProtocol: string;
    private scopes: string[];
    private oauth2: OAuth2API;
    private rest: REST;
    private app: express.Express;
    private server: Server;
    private state: string;

    constructor(options: CLIOptions) {
        if (!options) throw new Error("options is required");

        if (!options.serverPort) throw new Error("port is required");
        this.serverPort = options.serverPort;

        if (!options.redirectPath) throw new Error("callbackPath is required");
        this.redirectPath = options.redirectPath;

        if (!options.clientId) throw new Error("clientId is required");
        this.clientId = options.clientId;

        if (!options.clientSecret) throw new Error("clientSecret is required");
        this.clientSecret = options.clientSecret;

        this.serverHost = options.serverHost || "localhost";

        this.serverProtocol = options.serverProtocol || "http";

        if (!options.scopes) throw new Error("scopes is required");

        this.scopes = options.scopes;

        this.rest = new REST({ version: "10", authPrefix: "Bearer" }).setToken(
            this.clientSecret
        );
        this.oauth2 = new OAuth2API(this.rest);

        this.app = express();
    }

    public get redirectUri(): string {
        return `${this.serverProtocol}://${this.serverHost}:${
            this.serverPort
        }${path.join("/", this.redirectPath)}`;
    }

    public get authorizationUrl(): string {
        this.state = randomUUID();

        return this.oauth2.generateAuthorizationURL({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: this.scopes.join(" "),
            response_type: "code",
            state: this.state,
        });
    }

    public async hasTokens(): Promise<boolean> {
        const accessToken = await keytar.getPassword(
            DISCORD_CLI_SERVICE,
            "access"
        );
        const refreshToken = await keytar.getPassword(
            DISCORD_CLI_SERVICE,
            "refresh"
        );

        return !!accessToken && !!refreshToken;
    }

    public async saveTokens(
        tokens: RESTPostOAuth2AccessTokenResult
    ): Promise<void> {
        await keytar.setPassword(
            DISCORD_CLI_SERVICE,
            "access",
            tokens.access_token
        );
        await keytar.setPassword(
            DISCORD_CLI_SERVICE,
            "refresh",
            tokens.refresh_token
        );
    }

    public async deleteTokens(): Promise<void> {
        await keytar.deletePassword(DISCORD_CLI_SERVICE, "access");
        await keytar.deletePassword(DISCORD_CLI_SERVICE, "refresh");
    }

    public async getTokens(): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        const accessToken = await keytar.getPassword(
            DISCORD_CLI_SERVICE,
            "access"
        );
        const refreshToken = await keytar.getPassword(
            DISCORD_CLI_SERVICE,
            "refresh"
        );

        return { accessToken, refreshToken };
    }

    public async refreshTokens(): Promise<RESTPostOAuth2AccessTokenResult> {
        const { clientId, clientSecret } = this;
        const { refreshToken } = await this.getTokens();

        const response = await this.oauth2.refreshToken({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        });

        await this.saveTokens(response);

        return;
    }

    public async exchangeCodeForTokens(
        code: CLICode
    ): Promise<RESTPostOAuth2AccessTokenResult> {
        const { clientId, clientSecret } = this;
        const response = await this.oauth2.tokenExchange({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code: code,
            redirect_uri: this.redirectUri,
        });

        return response;
    }

    public initializeServer(): Promise<CLICode> {
        const promise = new Promise<CLICode>((resolve, reject) => {
            this.app.get(path.join("/", this.redirectPath), (req, res) => {
                const { code, state } = req.query;

                if (this.state !== state) {
                    res.send("Invalid state parameter.");
                    reject("Invalid state parameter.");
                }

                res.send("You may now close this window.");
                resolve(code as string);
            });
        });

        return promise;
    }

    public async openBrowser(): Promise<void> {
        await open(this.authorizationUrl, {
            wait: false,
            newInstance: true,
        });
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
        this.server = this.app.listen(this.serverPort, () => {
            console.log(
                `[Auth] Server started (${this.serverProtocol}://${this.serverHost}:${this.serverPort})`
            );
        });
    }

    public stopServer() {
        this.server.close();
        this.server = null;

        console.log(
            `[Auth] Server stopped (${this.serverProtocol}://${this.serverHost}:${this.serverPort})`
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
        this.deleteTokens();
    }
}
