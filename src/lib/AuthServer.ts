import express from "express";
import { Server } from "http";
import { nanoid } from "nanoid";

export interface AuthServerOptions {
    serverPort: number;
    redirectPath: string;
}

export type AuthServerData = {
    code: string;
    state: string;
    stateVerified: boolean;
    authFinished: boolean;
};

export default class AuthServer {
    private _port: number;
    private _callbackPath: string;
    private _app: express.Express;
    private _server: Server;

    private _data: Partial<AuthServerData>;

    constructor(options: AuthServerOptions) {
        if (!options) throw new Error("options is required");

        if (!options.serverPort) throw new Error("port is required");
        this._port = options.serverPort;

        if (!options.redirectPath) throw new Error("callbackPath is required");
        this._callbackPath = options.redirectPath;

        this._app = express();
        this._server = null;

        this._initializeAuthServer();

        this._data = {
            code: "",
            state: nanoid(16),
            stateVerified: false,
            authFinished: false,
        };
    }

    get port() {
        return this._port;
    }

    get callbackPath() {
        return this._callbackPath;
    }

    protected get data() {
        return this._data;
    }

    protected set data(data: Partial<AuthServerData>) {
        this._data = {
            ...this._data,
            ...data,
        };
    }

    protected get isAuthFinished() {
        return this.data.authFinished;
    }

    protected set isAuthFinished(value: boolean) {
        this.data.authFinished = value;
    }

    protected get code() {
        return this.data.code;
    }

    protected set code(value: string) {
        this.data.code = value;
    }

    protected get state() {
        return this.data.state;
    }

    protected set state(value: string) {
        this.data.state = value;
    }

    protected get stateVerified() {
        return this.data.stateVerified;
    }

    protected set stateVerified(value: boolean) {
        this.data.stateVerified = value;
    }

    private _initializeAuthServer() {
        this._app.use(express.urlencoded({ extended: true }));
        this._app.use(express.json());
        this._app.use(express.static("static"));
    }

    public setup() {
        const callback = express.Router();

        callback.get("/", (req, res) => {
            this.isAuthFinished = true;
            this.code = req.query.code as string;
            this.stateVerified = req.query.state === this.state;

            res.sendFile("callback.html", {
                root: "static",
            });
        });

        this._app.use(this._callbackPath, callback);

        this._app.use((req, res) => {
            res.status(404).send("Not found");
        });
    }

    public start() {
        if (this._server) throw new Error("Server is already running");

        this._server = this._app.listen(this.port, () => {
            console.log(`Listening on port ${this.port}`);
        });
    }

    public stop() {
        if (!this._server) throw new Error("Server is not running");

        this._server.close();
        this._server = null;

        console.log(`Stopped listening on port ${this.port}`);
    }
}
