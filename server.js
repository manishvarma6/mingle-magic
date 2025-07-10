const axios = require('axios');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Separate sets of clients for text messaging and video calling
let textMessageClients = new Map();
let videoChatClients = new Map();

// Serve static files like HTML, CSS, JS
app.use(express.static(__dirname));

// Serve homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

wss.on('connection', (ws, req) => {
    console.log('Client connected. Total clients:', textMessageClients.size + videoChatClients.size);

    ws.send(JSON.stringify({ type: 'activeclient', data: textMessageClients.size + videoChatClients.size }));
    updateclient();

    // fallback to videoChatClients by default (can extend later)
    let clientsMap = videoChatClients;
    clientsMap.set(ws, { paired: null });

    (async () => {
        const { country, region } = await getUserLocation(ws, req);
        videoChatClients.forEach((clientInfo, clientWs) => {
            console.log(`WebSocket: ${clientWs}, Paired: ${clientInfo.paired}, Country: ${clientInfo.country}, State: ${clientInfo.states}`);
        });
    })();

    const senderInfo = clientsMap.get(ws);
    const receiver = findAvailableClient(clientsMap, ws);

    if (receiver) {
        pairClients(clientsMap, ws, receiver);
        ws.send(JSON.stringify({ type: 'info', data: 'Your pair has been found.' }));
        ws.send(JSON.stringify({ type: 'enablebutton', data: 'Enable button for sender' }));

        const receiverInfo = clientsMap.get(receiver);
        receiver.send(JSON.stringify({ type: 'info', data: 'Your pair has been found' }));
        receiver.send(JSON.stringify({ type: 'enablebutton', data: 'Enable button for receiver' }));
    } else {
        ws.send(JSON.stringify({ type: 'info', data: 'waiting for available pair' }));
        ws.send(JSON.stringify({ type: 'disablebutton', data: 'disable button for current receiver that is connected' }));
    }

    ws.on('message', (message) => {
        console.log('Received:', message);
        const parsedMessage = JSON.parse(message);
        const senderInfo = clientsMap.get(ws);

        if (!senderInfo.paired) {
            ws.send(JSON.stringify({ type: 'info', data: 'You are not paired.. waiting for connection' }));
        } else {
            const receiver = senderInfo.paired;
            receiver.send(JSON.stringify({ type: 'enablenextbutton', data: 'disable next button' }));

            const passTypes = ['offer', 'answer', 'candidate', 'video', 'messagetosend', 'videotoggle', 'mictoggle'];

            if (passTypes.includes(parsedMessage.type)) {
                receiver.send(message);
            }

            if (parsedMessage.type === 'searchnext') {
                ws.send(JSON.stringify({ type: 'removideoclean', data: 'remover remote video' }));
                ws.send(JSON.stringify({ type: 'disablenextbutton', data: 'disable next button' }));
                searchfornext(clientsMap, receiver);
            }
        }
    });

    ws.on('close', () => {
        handleClientDisconnect(clientsMap, ws);
    });
});

function searchfornext(clients, receiverClient) {
    const clientInfo = clients.get(receiverClient);
    receiverClient.send(JSON.stringify({ type: 'info', data: 'Your chat partner has disconnected. Searching for another client...' }));
    receiverClient.send(JSON.stringify({ type: 'disablebutton', data: 'disable button for current receiver' }));

    if (clientInfo.paired) {
        const pairedClient = clientInfo.paired;
        unpairClients(clients, receiverClient, pairedClient);
        clients.delete(pairedClient);

        const nextReceiver = findAvailableClient(clients, receiverClient);

        if (nextReceiver) {
            nextReceiver.send(JSON.stringify({ type: 'activeclient', data: textMessageClients.size + videoChatClients.size }));
            pairClients(clients, receiverClient, nextReceiver);

            receiverClient.send(JSON.stringify({ type: 'info', data: 'Your pair has been found.' }));
            receiverClient.send(JSON.stringify({ type: 'clearmsgcontainer', data: 'message deleted' }));
            receiverClient.send(JSON.stringify({ type: 'enablebutton', data: 'Enable button for sender' }));
            receiverClient.send(JSON.stringify({ type: 'newvideoforloacl', data: 'new video will be sent to the next receiver' }));

            nextReceiver.send(JSON.stringify({ type: 'info', data: 'Your pair has been found' }));
            nextReceiver.send(JSON.stringify({ type: 'enablebutton', data: 'Enable button for receiver' }));
            nextReceiver.send(JSON.stringify({ type: 'enablenextbutton', data: 'Enable button for receiver' }));
        } else {
            receiverClient.send(JSON.stringify({ type: 'info', data: 'waiting for available pair' }));
        }
    } else {
        receiverClient.send(JSON.stringify({ type: 'info', data: 'Something went wrong, please refresh the page' }));
    }

    console.log('Client disconnected. Total clients:', clients.size);
}

function findAvailableClient(clients, excludeClient) {
    for (const [client, clientInfo] of clients.entries()) {
        if (client !== excludeClient && !clientInfo.paired) {
            return client;
        }
    }
    return null;
}

function pairClients(clients, client1, client2) {
    clients.get(client1).paired = client2;
    clients.get(client2).paired = client1;
}

function unpairClients(clients, client1, client2) {
    clients.get(client1).paired = null;
    clients.get(client2).paired = null;
}

function handleClientDisconnect(clients, client) {
    const clientInfo = clients.get(client);

    if (clientInfo && clientInfo.paired) {
        const pairedClient = clientInfo.paired;
        pairedClient.send(JSON.stringify({ type: 'info', data: 'Your chat partner has disconnected.' }));
        unpairClients(clients, client, pairedClient);
    }

    clients.delete(client);
    updateclient();
    console.log('Client disconnected. Total clients:', textMessageClients.size + videoChatClients.size);
}

function updateclient() {
    const total = textMessageClients.size + videoChatClients.size;

    videoChatClients.forEach((client, ws) => {
        ws.send(JSON.stringify({ type: 'activeclient', data: total }));
    });

    textMessageClients.forEach((client, ws) => {
        ws.send(JSON.stringify({ type: 'activeclient', data: total }));
    });
}

async function getUserLocation(ws, req) {
    try {
        const ipAddress = "2409:408a:eb2:2c87:74cd:e89a:110b:aeeb"; // You can replace this with dynamic IP
        const response = await axios.get(`https://ipinfo.io/${ipAddress}/json`);
        const { country, region } = response.data;

        categorizeuserloc(ws, country, region);
        return { country, region };
    } catch (error) {
        console.error('Error fetching user location:', error.message);
        return { country: "Unknown", region: "Unknown" };
    }
}

function categorizeuserloc(ws, country, region) {
    let clientsMap = videoChatClients; // default fallback
    clientsMap.set(ws, { country, states: region });
}

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});
