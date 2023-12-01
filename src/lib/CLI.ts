import path from "node:path";
import { OAuth2API } from "@discordjs/core";
import { REST } from "@discordjs/rest";

import open from "open";
import keytar from "keytar";

import AuthServer, { AuthServerOptions } from "./AuthServer.js";

export interface CLIOptions extends AuthServerOptions {
    clientId: string;
    clientSecret: string;
    serverHost?: string;
    serverProtocol?: string;
    scopes: string[];
}

export default class CLI extends AuthServer {
    private _clientId: string;
    private _clientSecret: string;
    private _serverHost: string;
    private _serverProtocol: string;
    private _scopes: string[];

    private _rest: REST;
    private _oauth2: OAuth2API;

    private _state: {
        authStarted: boolean;
        authClosed: boolean;
        authError?: Error;
    };

    constructor(options: CLIOptions) {
        super({
            serverPort: options.serverPort || 26681,
            redirectPath: options.redirectPath || "/callback",
        });
        if (!options) throw new Error("options is required");

        if (!options.clientId) throw new Error("clientId is required");
        this._clientId = options.clientId;

        if (!options.clientSecret) throw new Error("clientSecret is required");
        this._clientSecret = options.clientSecret;

        this._serverHost = options.serverHost || "localhost";

        this._serverProtocol = options.serverProtocol || "http";

        if (!options.scopes) throw new Error("scopes is required");
        this._scopes = options.scopes;

        this._rest = new REST({ version: "10", authPrefix: "Bearer" }).setToken(
            this.clientSecret
        );
        this._oauth2 = new OAuth2API(this._rest);

        this._initializeCLI();
    }

    get clientId() {
        return this._clientId;
    }

    get clientSecret() {
        return this._clientSecret;
    }

    get serverHost() {
        return this._serverHost;
    }

    get serverProtocol() {
        return this._serverProtocol;
    }
    get scopes() {
        return this._scopes;
    }

    get redirectUri(): string {
        return `${this.serverProtocol}://${this.serverHost}:${
            this.port
        }${path.join("/", this.callbackPath)}`;
    }

    protected get isAuthStarted() {
        return this._state.authStarted;
    }

    protected set isAuthStarted(value: boolean) {
        this._state.authStarted = value;
    }

    protected get isAuthClosed() {
        return this._state.authClosed;
    }

    protected set isAuthClosed(value: boolean) {
        this._state.authClosed = value;
    }

    private _initializeCLI() {
        this._state = {
            authStarted: false,
            authClosed: false,
            authError: null,
        };
    }

    public getAuthorizationUrl() {
        return this._oauth2.generateAuthorizationURL({
            client_id: this._clientId,
            response_type: "code",
            redirect_uri: this.redirectUri,
            scope: this._scopes.join(" "),
            state: this.state,
        });
    }

    public setupCLI() {
        this.data = null;
        this.setup();
    }

    public launchAuthorizationRoutine() {
        this.start();

        this.isAuthStarted = true;
        open(this.getAuthorizationUrl(), { wait: false, newInstance: true })
            .then(() => {
                this.isAuthClosed = true;
                console.log(
                    `Authorization URL closed (without error) [${this.isAuthFinished}]`
                );

                this.stopAuthorizationRoutine();
            })
            .catch((error) => {
                this._state.authError = error;
                console.log("Authorization URL closed (with error):", error);
            });
    }

    public stopAuthorizationRoutine() {
        console.log("Stopping authorization routine");
        console.log(this.isAuthFinished);
        if (!this.isAuthFinished) {
            setTimeout(() => {
                this.stopAuthorizationRoutine();
            }, 3000);
        } else {
            if (!this.stateVerified) throw new Error("State is not verified");

            this.stop();
            this._doTokenExchange();
        }
    }

    private async _doTokenExchange() {
        if (!this.isAuthFinished)
            throw new Error("Authorization is not finished");
        if (this._state.authError) throw this._state.authError;

        if (!this.data)
            throw new Error(
                "No data was received from the authorization server"
            );

        this.start();
        const token = await this._oauth2.tokenExchange({
            client_id: this._clientId,
            client_secret: this._clientSecret,
            grant_type: "authorization_code",
            redirect_uri: this.redirectUri,
            code: this.data.code,
        });
        this.stop();

        console.log("Token exchange successful");
        await this.storeToken(token);
    }

    public async storeToken(token: {
        access_token: string;
        refresh_token: string;
    }) {
        await keytar.setPassword("discord-cli", "access", token.access_token);
        await keytar.setPassword("discord-cli", "refresh", token.refresh_token);
        console.log("Token stored");
    }

    public async getToken() {
        const access = await keytar.getPassword("discord-cli", "access");
        const refresh = await keytar.getPassword("discord-cli", "refresh");
        return { access, refresh };
    }

    public async login() {
        const { access, refresh } = await this.getToken();
        if (!!access && !!refresh) {
            console.log("Token found");
            console.log(access, refresh);
            return;
        }
        this.launchAuthorizationRoutine();
    }
}
