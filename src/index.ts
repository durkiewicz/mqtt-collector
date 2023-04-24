import { randomUUID } from "crypto";
import { promises as fs } from 'fs';
import * as path from "path";
import yargs from 'yargs';
import { connect } from 'mqtt';

const protocols = ['mqtt', 'mqtts', 'ws', 'wss'] as const;
const messagesDir = './messages';

type ConnectionOptions = {
    username: string,
    password: string,
    clientId?: string,
    protocol?: typeof protocols[number],
    host?: string,
    port: number,
}

const connectionCliOptions = {
    host: {type: 'string', desc: 'The MQTT broker host name or IP address', demandOption: true},
    port: {type: 'number', desc: 'The MQTT broker port number', demandOption: true},
    username: {type: 'string', desc: 'The username to use when connecting to the MQTT broker', demandOption: true},
    password: {type: 'string', desc: 'The password to use when connecting to the MQTT broker', demandOption: true},
    protocol: {choices: protocols, desc: 'The protocol to use when connecting to the MQTT broker', default: 'mqtt'},
    clientId: {
        type: 'string',
        desc: 'The client ID to use when connecting to the MQTT broker. If not specified, a random ID will be generated.',
        default: 'collector_' + randomUUID()
    },
} as const;

const parser = yargs(process.argv.slice(2))
    .command('collect', 'Collects messages from MQTT broker and saves them to files.', connectionCliOptions, collect)
    .command('replay', 'Replays messages from files to MQTT broker.', connectionCliOptions, replay)
    .demandCommand()
    .wrap(process.stdout.columns ?? 80);

(async () => {
    await parser.parseAsync();
})();

function collect(options: ConnectionOptions) {
    const mqttClient = connectToMqttBroker(options);
    mqttClient.subscribe(['#']);
    mqttClient.on('message', saveMessageToFile)
}

async function replay(options: ConnectionOptions) {
    const mqttClient = connectToMqttBroker(options);
    const allFiles = await readDirRecursive(messagesDir);
    const messages = await Promise.all(allFiles.map(readMessageFromFile));
    if (messages.length === 0) {
        console.log('No messages found');
        return;
    }
    messages.sort((a, b) => a.date.getTime() - b.date.getTime());
    const timeOffset = Date.now() - messages[0].date.getTime();

    console.log(`Replaying ${messages.length} messages, starting at ${messages[0].date.toISOString()}`);

    for (const message of messages) {
        const delay = message.date.getTime() + timeOffset - Date.now();
        if (delay > 0) {
            await sleep(delay);
        }
        mqttClient.publish(message.topic, message.binary);
        console.log(`Replayed message from ${message.date.toISOString()}, topic: ${message.topic}`);
    }
}

async function readDirRecursive(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, {withFileTypes: true});
    const files = await Promise.all(entries.map((entry) => {
        const res = path.resolve(dir, entry.name);
        return entry.isDirectory() ? readDirRecursive(res) : res;
    }));
    return Array.prototype.concat(...files);
}

async function readMessageFromFile(pathName: string) {
    const relative = path.relative(messagesDir, pathName);
    const match = /(.+)\/([^\/]+)_\d+\.json$/.exec(relative);
    if (match == null) {
        throw new Error(`Unexpected file name: ${pathName}`);
    }
    const [_, topic, timestamp] = match;
    const binary = await fs.readFile(pathName);
    return {topic, date: new Date(timestamp), binary};
}

function connectToMqttBroker(argv: ConnectionOptions) {
    const {username, password, port, clientId} = argv;
    const url = `${argv.protocol}://${argv.host}`;

    const mqttClient = connect(url, {
        username,
        password,
        clientId,
        port,
    });

    mqttClient.on('connect', function () {
        console.log(`Connected to ${url} as ${username}. Client id: ${clientId}.`);
    })

    mqttClient.on('error', (err: unknown, err2: unknown) => {
        console.error('Connection error: ', err, err2);
        mqttClient.end();
    });

    return mqttClient;
}

async function saveMessageToFile(topic: string, message: Buffer) {
    const fourRandomDigits = Math.floor(1000 + Math.random() * 9000);
    const fileName = `${messagesDir}/${topic}/${new Date().toISOString()}_${fourRandomDigits}.json`;
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));