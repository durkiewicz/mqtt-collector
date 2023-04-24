# mqtt-collector

A simple Node.js server that collects all the MQTT messages and write them to text files. Every message is written to a 
separate file within the `./messages` directory. The file path is the topic name, the file name is an ISO date string 
concatenated with some random characters, and the file content is the message payload.

## Requirements

- Node.js version 18 or higher

## Installation

```bash
npm ci
```

## Usage

### Check available commands

```bash
npm start -- help
```

### `collect` command

To check the available options for the `collect` command, run the following command:

```bash
npm start -- collect --help
```

To collect all the messages from a broker, run the following command:

```bash
npm start -- collect --host=<your-host> --port=<your-port> --username=<username> --password=<password>
```

### `replay` command

To check the available options for the `replay` command, run the following command:

```bash
npm start -- replay --help
```

To replay previously collected messages, run the following command:

```bash
npm start -- replay --host=<your-host> --port=<your-port> --username=<username> --password=<password>
```
