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

```bash
npm start -- --host=<your-host> --port=<your-port> --username=<username> --password=<password>
```
