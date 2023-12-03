import { Command } from "commander";

import client from "../modules/client.js";

const program = new Command();

program
    .command("login")
    .description("Login to Discord")
    .action(async () => {
        await client.login();
    });

program
    .command("logout")
    .description("Logout of Discord")
    .action(async () => {
        await client.logout();
    });

const config = program
    .command("config")
    .description("Configure the client")
    .option("-i, --id <id>", "Set Discord client ID")
    .option("-s, --secret <secret>", "Set Discord client secret")
    .option("-h, --host <host>", "Set CLI host")
    .option("-p, --port <port>", "Set CLI port")
    .option("-P, --protocol <protocol>", "Set CLI protocol")
    .option("-c, --callback <url>", "Set CLI callback URL")
    .option("-S, --scopes <scopes>", "Set Discord OAuth2 scopes")
    .action(async (options) => {
        await client.config({
            id: options.id,
            host: options.host,
            port: options.port,
            protocol: options.protocol,
            callback: options.callback,
            scopes: options.scopes,
        });
    });

config
    .command("id")
    .description("Set Discord client ID")
    .arguments("<id>")
    .action(async (id) => {
        client.configs.id = id;
    });

config
    .command("secret")
    .description("Set Discord client secret")
    .arguments("<secret>")
    .action(async (secret) => {
        await client.setClientSecret(secret);
    });

config
    .command("host")
    .description("Set CLI host")
    .arguments("<host>")
    .action(async (host) => {
        client.configs.host = host;
    });

config
    .command("port")
    .description("Set CLI port")
    .arguments("<port>")
    .action(async (port) => {
        client.configs.port = port;
    });

config
    .command("protocol")
    .description("Set CLI protocol")
    .arguments("<protocol>")
    .action(async (protocol) => {
        client.configs.protocol = protocol;
    });

config
    .command("callback")
    .description("Set CLI callback URL")
    .arguments("<url>")
    .action(async (url) => {
        client.configs.callback = url;
    });

program.parse(process.argv);

export default program;
