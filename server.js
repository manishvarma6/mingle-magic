

const axios = require('axios');



const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Separate sets of clients for text messaging and video calling
let textMessageClients = new Map();
let videoChatClients = new Map();
// Serve static files like HTML, CSS, JS
app.use(express.static(__dirname));

// Serve the homepage on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


wss.on('connection', (ws, req) => {


    console.log('Client connected. Total clients:', videoChatClients.size);
    // console.log('Client connected. Total clients:', textMessageClients.size + videoChatClients.size);
    ws.send(JSON.stringify({type:'activeclient', data:textMessageClients.size + videoChatClients.size}))

    updateclient();

    // // Determine if the client is connecting for text messaging or video calling
    const urlPath = req.url || '';
    let clientsMap;

    switch (true) {
        case urlPath.includes('textmessage'):
            clientsMap = textMessageClients;
            break;
        case urlPath.includes('video'):
            clientsMap = videoChatClients;
            break;
        default:
            // Handle other cases or invalid paths
            ws.close();
            return;
    }

    clientsMap.set(ws, { paired: null });

    (async () => {
        const { country, region } = await getUserLocation(ws , req);
        // clientsMap.set(ws, { paired: null, country: country, states: region });
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

        // Determine if the client is connecting for text messaging or video calling
        const urlPath = req.url || '';
        let senderInfo;

        switch (true) {
            case urlPath.includes('textmessage'):
                senderInfo = textMessageClients.get(ws);
                break;
            case urlPath.includes('video'):
                senderInfo = videoChatClients.get(ws);
                break;
            default:
                // Handle other cases or invalid paths
                ws.close();
                return;
        }


        //setting the people based on country wise
        // if(parsedMessage.type==='changecountry'){
        //     countryname = parsedMessage.message
        //     console.log("mk",parsedMessage.message);
        //     const receiver = findcoutrywiseclient(clientsMap ,ws , countryname);

        //     if (receiver) {
        //         pairClients(clientsMap, ws, receiver);
        //         ws.send(JSON.stringify({ type: 'info', data: 'Your pair has been found.' }));
        //         ws.send(JSON.stringify({ type: 'enablebutton', data: 'Enable button for sender' }));
        
        //         const receiverInfo = clientsMap.get(receiver);
        //         receiver.send(JSON.stringify({ type: 'info', data: 'Your pair has been found' }));
        //         receiver.send(JSON.stringify({ type: 'enablebutton', data: 'Enable button for receiver' }));
        //     } else {
        //         ws.send(JSON.stringify({ type: 'info', data: `waiting for people from ${countryname} ` }));
        //         ws.send(JSON.stringify({ type: 'disablebutton', data: 'disable button for current receiver that is connected' }));
        //     }

            
        //     if (!senderInfo.paired) {
        //         // ws.send(JSON.stringify({type: 'info', data: 'You are not pair.. waiting for connection'}));
        //     } 
        //     else {
        //         const receiver = senderInfo.paired;
        //         receiver.send(JSON.stringify({type:'enablenextbutton', data:'disable next button'}));
        //         if (parsedMessage.type === 'offer' || parsedMessage.type === 'answer' || parsedMessage.type === 'candidate'  || parsedMessage.type === 'video' || parsedMessage.type==='messagetosend' || parsedMessage.type === 'videotoggle' || parsedMessage.type === 'mictoggle'){
        //             receiver.send(message);

        //         }
        //         if(parsedMessage.type==='searchnext'){
        //             //remove prvious remote video 
        //             ws.send(JSON.stringify({type:'removideoclean', data:'remover remote video'}));
        //             // disable next button so it can not click more than one time in each period
        //             ws.send(JSON.stringify({type:'disablenextbutton', data:'disable next button'}));
        //             //this is send by sender to his reciver
        //             searchnextcountryclient(clientsMap, receiver , countryname);
        //         }
        //     }

        // }
        

        if (!senderInfo.paired) {
            ws.send(JSON.stringify({type: 'info', data: 'You are not pair.. waiting for connection'}));
        } 
        else {
            const receiver = senderInfo.paired;
            receiver.send(JSON.stringify({type:'enablenextbutton', data:'disable next button'}));
            if (parsedMessage.type === 'offer' || parsedMessage.type === 'answer' || parsedMessage.type === 'candidate'  || parsedMessage.type === 'video' || parsedMessage.type==='messagetosend' || parsedMessage.type === 'videotoggle' || parsedMessage.type === 'mictoggle'){
                receiver.send(message);

            }
            if(parsedMessage.type==='searchnext'){
                //remove prvious remote video 
                ws.send(JSON.stringify({type:'removideoclean', data:'remover remote video'}));
                // disable next button so it can not click more than one time in each period
                ws.send(JSON.stringify({type:'disablenextbutton', data:'disable next button'}));
                //this is send by sender to his reciver
                searchfornext(clientsMap, receiver);
            }
        }
    });

    ws.on('close', () => {
        handleClientDisconnect(clientsMap, ws);
    });
});


function searchfornext(clients, reciverclient) {
    const clientInfo = clients.get(reciverclient);
    reciverclient.send(JSON.stringify({ type: 'info', data: 'Your chat partner has disconnected. Searching for another client....' }));

    reciverclient.send(JSON.stringify({ type: 'disablebutton', data: 'disable button for current reciver that is connected' }));
    if (clientInfo.paired) {

        const pairedClient = clientInfo.paired;
        // pairedClient.send(JSON.stringify({type: 'info', data: 'Your chat partner has disconnected. Searching for another client....'}));
        unpairClients(clients, reciverclient, pairedClient);
        clients.delete(pairedClient);

        const nextreceiver = findAvailableClient(clients, reciverclient);

        // check pair or not for sending notification
        if (nextreceiver) {
            nextreceiver.send(JSON.stringify({type:'activeclient', data:textMessageClients.size + videoChatClients.size}))

            pairClients(clients, reciverclient, nextreceiver);

            reciverclient.send(JSON.stringify({ type: 'info', data: 'Your pair has been found.' }));

            // send the below message to reciver to handle it in text message
            reciverclient.send(JSON.stringify({ type: 'clearmsgcontainer', data: 'message deleted' }));
            reciverclient.send(JSON.stringify({ type: 'enablebutton', data: 'Enable button for current reciver that is now sender' }));
            // send the below video message to next reciver to handle it in video calling
            reciverclient.send(JSON.stringify({ type: 'newvideoforloacl', data: 'new video will be sent to the next reciver' }));

            // send the below message to next reciver to handle it in text message
            nextreceiver.send(JSON.stringify({ type: 'info', data: 'Your pair has been found' }));
            nextreceiver.send(JSON.stringify({ type: 'enablebutton', data: 'Enable button for next reciver' }));
            nextreceiver.send(JSON.stringify({ type: 'enablenextbutton', data: 'Enable button for next reciver' }));

        } else {
            reciverclient.send(JSON.stringify({ type: 'info', data: 'waiting for available pair' }));

        }
    } else {
        reciverclient.send(JSON.stringify({ type: 'info', data: 'Something went wrong, please refresh the page' }))
    }

    console.log('Client disconnected. Total clients:', clients.size);
}

function searchnextcountryclient(clients, reciverclient , countryname) {
    const clientInfo = clients.get(reciverclient);
    reciverclient.send(JSON.stringify({ type: 'info', data: 'Your chat partner has disconnected. Searching for another client....' }));

    reciverclient.send(JSON.stringify({ type: 'disablebutton', data: 'disable button for current reciver that is connected' }));
    if (clientInfo.paired) {

        const pairedClient = clientInfo.paired;
        // pairedClient.send(JSON.stringify({type: 'info', data: 'Your chat partner has disconnected. Searching for another client....'}));
        unpairClients(clients, reciverclient, pairedClient);
        clients.delete(pairedClient);

        const nextreceiver = findcoutrywiseclient(clients, reciverclient ,countryname);

        // check pair or not for sending notification
        if (nextreceiver) {
            nextreceiver.send(JSON.stringify({type:'activeclient', data:textMessageClients.size + videoChatClients.size}))

            pairClients(clients, reciverclient, nextreceiver);

            reciverclient.send(JSON.stringify({ type: 'info', data: 'Your pair has been found.' }));

            // send the below message to reciver to handle it in text message
            reciverclient.send(JSON.stringify({ type: 'clearmsgcontainer', data: 'message deleted' }));
            reciverclient.send(JSON.stringify({ type: 'enablebutton', data: 'Enable button for current reciver that is now sender' }));
            // send the below video message to next reciver to handle it in video calling
            reciverclient.send(JSON.stringify({ type: 'newvideoforloacl', data: 'new video will be sent to the next reciver' }));

            // send the below message to next reciver to handle it in text message
            nextreceiver.send(JSON.stringify({ type: 'info', data: 'Your pair has been found' }));
            nextreceiver.send(JSON.stringify({ type: 'enablebutton', data: 'Enable button for next reciver' }));
            nextreceiver.send(JSON.stringify({ type: 'enablenextbutton', data: 'Enable button for next reciver' }));

        } else {
            reciverclient.send(JSON.stringify({ type: 'info', data: 'waiting for available pair' }));

        }
    } else {
        reciverclient.send(JSON.stringify({ type: 'info', data: 'Something went wrong, please refresh the page' }))
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

function findcoutrywiseclient(clients, excludeClient ,country) {
    for (const [client, clientInfo] of clients.entries()) {
        if (client !== excludeClient && !clientInfo.paired  && clientInfo.country == country) {
            return client;
        }
    }
    return null;
}

function pairClients(clients, client1, client2) {
    const client1Info = clients.get(client1);
    const client2Info = clients.get(client2);

    client1Info.paired = client2;
    client2Info.paired = client1;
}

function unpairClients(clients, client1, client2) {
    const client1Info = clients.get(client1);
    const client2Info = clients.get(client2);

    client1Info.paired = null;
    client2Info.paired = null;
}

function handleClientDisconnect(clients, client) {
    const clientInfo = clients.get(client);

    if (clientInfo.paired) {
        const pairedClient = clientInfo.paired;
        pairedClient.send(JSON.stringify({ type: 'info', data: 'Your chat partner has disconnected. Searching for another client....' }));
        unpairClients(clients, client, pairedClient);
    }

    clients.delete(client);
    updateclient();
    console.log('Client disconnected. Total clients:', textMessageClients.size + videoChatClients.size);
}



function updateclient() {
    videoChatClients.forEach((client, ws) => {
        ws.send(JSON.stringify({ type: 'activeclient', data: textMessageClients.size + videoChatClients.size }));
        
    });

    textMessageClients.forEach((client, ws) => {
        ws.send(JSON.stringify({ type: 'activeclient', data: textMessageClients.size + videoChatClients.size }));

    });
}




async function getUserLocation(ws, req) {
    try {
        let country ;
        let region ;
        const ipAddress = "2409:408a:eb2:2c87:74cd:e89a:110b:aeeb";
        // const ipAddress = req.socket.remoteAddress;

        const response =  await axios.get(`https://ipinfo.io/${ipAddress}/json`);
        
        ({ country, region } = response.data);

        categorizeuserloc(ws ,req,  country , region);

        return{ country, region};

    } catch (error) {

        console.error('Error fetching user location:', error.message);
    }
}



function categorizeuserloc(ws , req , country , region){
    // Determine if the client is connecting for text messaging or video calling
    const urlPath = req.url || '';
    let clientsMap;

    switch (true) {
        case urlPath.includes('textmessage'):
            clientsMap = textMessageClients;
            break;
        case urlPath.includes('video'):
            clientsMap = videoChatClients;
            break;
        default:
            // Handle other cases or invalid paths
            ws.close();
            return;
    }
    clientsMap.set(ws, { country: country, states: region });

}




server.listen(3000, () => {
    console.log('Server listening on port 3000');
});






















































// const express = require('express');
// const http = require('http');
// const WebSocket = require('ws');

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocket.Server({ server });


// let clients = new Map();
// // Separate sets of clients for text messaging and video calling
// let textMessageClients = new Map();
// let videoChatClients = new Map();

// wss.on('connection', (ws,req) => {
//     console.log('Client connected. Total clients:', clients.size);


//     clients.set(ws, { paired: null });

//     const senderInfo = clients.get(ws);
//     const receiver = findAvailableClient(ws);
        

//     //check pair or not for sending notification
//     if (receiver) {
//         pairClients(ws, receiver);
//         ws.send(JSON.stringify({type: 'info', data: 'Your pair has been found.'}));
//         ws.send(JSON.stringify({type: 'enablebutton', data: 'Enable  button for sender '}));
        

//         const receiverInfo = clients.get(receiver);
//         receiver.send(JSON.stringify({type: 'info', data: 'Your pair has been found'}));
//         receiver.send(JSON.stringify({type: 'enablebutton', data: 'Enable button for reciver'}));

//     } else {
//         ws.send(JSON.stringify({type: 'info', data: 'waiting for available pair'}));
//         ws.send(JSON.stringify({type: 'disablebutton', data: 'disable button for current reciver that is connected'}));
//     }

//     ws.on('message', (message) => {
//         console.log('Received:', message);
//         const parsedMessage = JSON.parse(message);

//         const senderInfo = clients.get(ws);

//         if (!senderInfo.paired) {
//             ws.send(JSON.stringify({type: 'info', data: 'You are not pair.. waiting for connection'}));
//         } 

//         else {
//             const receiver = senderInfo.paired;
//             receiver.send(JSON.stringify({type:'enablenextbutton', data:'disable next button'}));
//             if (parsedMessage.type === 'offer' || parsedMessage.type === 'answer' || parsedMessage.type === 'candidate'  || parsedMessage.type === 'video' || parsedMessage.type==='messagetosend' || parsedMessage.type === 'videotoggle' || parsedMessage.type === 'mictoggle'){
//                 receiver.send(message);

//                 const clientsArray = Array.from(clients);
//                 // Stringify the array
//                 // console.log(clientsArray); 
//             }
//             if(parsedMessage.type==='searchnext'){
//                 //remove prvious remote video 
//                 ws.send(JSON.stringify({type:'removideoclean', data:'remover remote video'}));
//                 // disable next button so it can not click more than one time in each period
//                 ws.send(JSON.stringify({type:'disablenextbutton', data:'disable next button'}));
//                 //this is send by sender to his reciver
//                 searchfornext(receiver);

//             }
//         }
//     });

//     ws.on('close', () => {
//         // Remove the closed connection from the list of connected clients
//         // connectedClients = connectedClients.filter((client) => client !== ws);
//         handleClientDisconnect(ws);
//     });
// });

// function logClientsPairingInfo() {
//     console.log('Clients Pairing Information:');
//     clients.forEach((clientInfo, client) => {
//         const pairingStatus = clientInfo.paired ? `Paired with ${clientInfo.paired}` : 'Not Paired';
//         console.log(`${client} - ${pairingStatus}`);
//     });
// }



// function searchfornext(reciverclient) {
//     const clientInfo = clients.get(reciverclient);
//     reciverclient.send(JSON.stringify({type: 'info', data: 'Your chat partner has disconnected. Searching for another client....'}));

//     reciverclient.send(JSON.stringify({type: 'disablebutton', data: 'disable button for current reciver that is connected'}));
//     if (clientInfo.paired) {

//         const pairedClient = clientInfo.paired;
//         // pairedClient.send(JSON.stringify({type: 'info', data: 'Your chat partner has disconnected. Searching for another client....'}));
//         unpairClients(reciverclient, pairedClient);
//         clients.delete(pairedClient);

//         const nextreceiver = findAvailableClient(reciverclient);
        
//         //check pair or not for sending notification
//         if (nextreceiver) {

//             pairClients(reciverclient, nextreceiver);

//             reciverclient.send(JSON.stringify({type: 'info', data: 'Your pair has been found.'}));

//             //send the below message to reciver to handle it in text message
//             reciverclient.send(JSON.stringify({type: 'clearmsgcontainer', data: 'message deleted'}));
//             reciverclient.send(JSON.stringify({type: 'enablebutton', data: 'Enable button for current reciver that is now sender' }));
//             //send the below video message to next reciver to handle it in video calling
//             reciverclient.send(JSON.stringify({type:'newvideoforloacl', data:'new video will be send to next reciver'}));


//             //send the below message to next reciver to handle it in text message
//             nextreceiver.send(JSON.stringify({type: 'info', data: 'Your pair has been found'}));
//             nextreceiver.send(JSON.stringify({type: 'enablebutton', data: 'Enable button for next reciver'}));
//             nextreceiver.send(JSON.stringify({type: 'enablenextbutton', data: 'Enable button for next reciver'}));

//         } else {
//             reciverclient.send(JSON.stringify({type: 'info', data: 'waiting for available pair'}));

//         }
//     }
//     else{
//         reciverclient.send(JSON.stringify({type:info,data:'Something went wrong, please refresh the page' }))
//     }

//     console.log('Client disconnected. Total clients:', clients.size);
// }

// function handleClientDisconnect(client) {
//     const clientInfo = clients.get(client);

//     if (clientInfo.paired) {
//         const pairedClient = clientInfo.paired;
//         pairedClient.send(JSON.stringify({type: 'info', data: 'Your chat partner has disconnected. Searching for another client....'}));
//         unpairClients(client, pairedClient);
//     }

//     clients.delete(client);
//     console.log('Client disconnected. Total clients:', clients.size);
// }

// function findAvailableClient(excludeClient) {
//     for (const [client, clientInfo] of clients.entries()) {
//         if (client !== excludeClient && !clientInfo.paired) {
//             return client;
//         }
//     }
//     return null;
// }

// function pairClients(client1, client2) {
//     const client1Info = clients.get(client1);
//     const client2Info = clients.get(client2);

//     client1Info.paired = client2;
//     client2Info.paired = client1;
// }

// function unpairClients(client1, client2) {
//     const client1Info = clients.get(client1);
//     const client2Info = clients.get(client2);

//     client1Info.paired = null;
//     client2Info.paired = null;
// }

// server.listen(3000, () => {
//     console.log('Server listening on port 3000');
// });












