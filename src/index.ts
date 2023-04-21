import { randomUUID } from "crypto";
import { promises as fs } from 'fs';
import * as path from "path";
import yargs from 'yargs';
import { connect } from 'mqtt';

const parser = yargs(process.argv.slice(2))
    .options({
        host: {type: 'string', demandOption: true},
        port: {type: 'number', demandOption: true},
        username: {type: 'string', demandOption: true},
        password: {type: 'string', demandOption: true},
        clientId: {type: 'string'},
    });

(async () => {
    const argv = await parser.argv;
    connectToMqttBroker(argv.host, argv.port, argv.username, argv.password, argv.clientId);
})();

function connectToMqttBroker(host: string, port: number, username: string, password: string, clientId: string | undefined) {
    clientId = clientId ?? ('collector_' + randomUUID());
    const connectUrl = `mqtt://${host}:${port}`;
    const mqttClient = connect(connectUrl, {
        username,
        password,
        clientId,
    });

    mqttClient.subscribe(['#']);

    mqttClient.on('connect', function () {
        console.log(`Connected to ${connectUrl} as ${username}. Client id: ${clientId}.`);
    })

    mqttClient.on('message', saveMessageToFile)

    mqttClient.on('error', (err: unknown, err2: unknown) => {
        console.error('Connection error: ', err, err2);
        mqttClient.end();
    });
}

async function saveMessageToFile(topic: string, message: Buffer) {
    const fourRandomDigits = Math.floor(1000 + Math.random() * 9000);
    const fileName = `./messages/${topic}/${new Date().toISOString()}_${fourRandomDigits}.json`;
    console.log(`Saving message to file ${fileName}...`);
    const dirname = path.dirname(fileName);

    try {
        if (!(await exists(dirname))) {
            console.log(`Creating directory ${dirname}...`);
            await fs.mkdir(dirname, {recursive: true});
        }
        await fs.writeFile(fileName, message)
    } catch (err) {
        console.error(`Failed to save message to file ${fileName}: ${err}`);
    }
}

async function exists(f: string) {
    try {
        await fs.stat(f);
        return true;
    } catch {
        return false;
    }
}
