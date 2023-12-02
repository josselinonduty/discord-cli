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

const config = program.command("config").description("Configure the client");

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
