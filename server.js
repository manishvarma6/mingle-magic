const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const endButton = document.getElementById('endButton');
var videoToggleButton = document.querySelector('.videoToggleButton');
var micToggleButton = document.querySelector('.micToggleButton');

// const micToggleButton = document.getElementById('micToggleButton');

let localStream, remoteStream, peerConnection, socket, isMicOn = true, isVideoOn = true;

const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// startButton.addEventListener('click', startCall);
endButton.addEventListener('click', endCall);
videoToggleButton.addEventListener('click', toggleVideo);
micToggleButton.addEventListener('click', toggleMic);

startButton.addEventListener('click', function(){

    //send response to unpaire him 
    searchfornextreciver('searchnext' , 'searchnext reciver');
    startCall();

})

document.addEventListener('DOMContentLoaded', () => startCall());

function startCall() {

    initSocket();

    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            localStream = stream;
            localVideo.srcObject = stream;

            peerConnection = new RTCPeerConnection(configuration);
            peerConnection.ontrack = handleTrack;
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

            peerConnection.onicecandidate = handleIceCandidate;
            peerConnection.oniceconnectionstatechange = handleIceConnectionStateChange;

            return peerConnection.createOffer();
        })
        .then((offer) => peerConnection.setLocalDescription(offer))
        .then(() => socket.send(JSON.stringify({ type: 'offer', offer: peerConnection.localDescription })))
        .catch((error) => console.error('Error starting call:', error));
}

function startcallfornextreciver(){
    navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        localStream = stream;
        localVideo.srcObject = stream;

        peerConnection = new RTCPeerConnection(configuration);
        peerConnection.ontrack = handleTrack;
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.oniceconnectionstatechange = handleIceConnectionStateChange;

        return peerConnection.createOffer();
    })
    .then((offer) => peerConnection.setLocalDescription(offer))
    .then(() => socket.send(JSON.stringify({ type: 'offer', offer: peerConnection.localDescription })))
    .catch((error) => console.error('Error starting call:', error));
}

function toggleVideo() {
    isVideoOn = !isVideoOn;
    localStream.getVideoTracks()[0].enabled = isVideoOn;

    // Get the SVG elements inside the video toggle button
    var videoOnIcon = videoToggleButton.querySelector('.feather-video-on');
    var videoOffIcon = videoToggleButton.querySelector('.feather-video-off');

    // Change the visibility of the SVG icons based on the video state
    if (isVideoOn) {
        videoOnIcon.style.display = 'inline-block';
        videoOffIcon.style.display = 'none';
    } else {
        videoOnIcon.style.display = 'none';
        videoOffIcon.style.display = 'inline-block';
    }
    //send message to reciver that video is on aur of
    informvideomic('videotoggle' , (isVideoOn ? 'videoOn' : 'videoOff'));

}
function toggleMic() {
    isMicOn = !isMicOn;
    // localStream.getAudioTracks()[0].enabled = isMicOn;

    // Get the SVG elements inside the video toggle button
    var voiceOnIcon = micToggleButton.querySelector('.feather-voice-on');
    var voiceOffIcon = micToggleButton.querySelector('.feather-voice-off');

    // Change the visibility of the SVG icons based on the video state
    if (isMicOn) {
        voiceOnIcon.style.display = 'inline-block';
        voiceOffIcon.style.display = 'none';
    } else {
        voiceOnIcon.style.display = 'none';
        voiceOffIcon.style.display = 'inline-block';
    }

    //send message to reciver that mic is of or on
    informvideomic('mictoggle' , (isMicOn ? 'MicOn' : 'MicOff'));

}

function toogleRemVid(videOn){

    var videoRemToggle = document.getElementById('videoRemToggle');
    // Get the SVG elements inside the video toggle button
    var videoOnIcon = videoRemToggle.querySelector('.feather-rem-video-on');
    var videoOffIcon = videoRemToggle.querySelector('.feather-rem-video-off');

    // Change the visibility of the SVG icons based on the video state
    if (videOn == 'videoOn') {
        videoOnIcon.style.display = 'block';
        videoOffIcon.style.display = 'none';
    } else {

        videoOnIcon.style.display = 'none';
        videoOffIcon.style.display = 'block';
    }
}

function toogleRemMic(MicOn){

    var MicRemToggle = document.getElementById('MicRemToggle');
    // Get the SVG elements inside the video toggle button
    var MicOnIcon = MicRemToggle.querySelector('.feather-rem-voice-on');
    var MicOffIcon = MicRemToggle.querySelector('.feather-rem-voice-off');

    // Change the visibility of the SVG icons based on the video state
    if (MicOn == 'MicOn') {
        MicOnIcon.style.display = 'block';
        MicOffIcon.style.display = 'none';
    } else {

        MicOnIcon.style.display = 'none';
        MicOffIcon.style.display = 'block';
    }
}


function handleTrack(event) {
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
}

// document.addEventListener('DOMContentLoaded', () => initSocket());

function initSocket() {
    socket = new WebSocket('ws://localhost:3000/video.html');
    // socket = new WebSocket('ws://localhost:3000');

    socket.addEventListener('open', () => console.log('WebSocket connection opened'));

    socket.addEventListener('message', (event) => {

        if (event.data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => handleBinaryData(reader.result);
            reader.readAsArrayBuffer(event.data);
        } else {
            parseSocketMessage(event.data);
        }
    });

    socket.addEventListener('close', () => console.log('WebSocket connection closed'));
}

function parseSocketMessage(data) {
    try {
        const parsedMessage = JSON.parse(data);
        if (parsedMessage.type === 'offer' || parsedMessage.type === 'answer') {
            peerConnection.setRemoteDescription(new RTCSessionDescription(parsedMessage.offer))
                .then(() => peerConnection.createAnswer())
                .then((answer) => peerConnection.setLocalDescription(answer))
                .then(() => socket.send(JSON.stringify({ type: 'answer', answer: peerConnection.localDescription })))
                .catch((error) => console.error('Error creating answer:', error));
        } else if (parsedMessage.type === 'candidate') {
            peerConnection.addIceCandidate(new RTCIceCandidate(parsedMessage.candidate))
                .catch((error) => console.error('Error adding ICE candidate:', error));
        } else if (parsedMessage.type === 'info') {
            showMessage(parsedMessage.data);
        }
        else if(parsedMessage.type === 'messagetosend'){
            console.log("s2" );
            showrecivedmessage(parsedMessage.data);
        }
        
        else if(parsedMessage.type === 'newvideoforloacl'){
            console.log("loc");
            startcallfornextreciver();
        }
        
        //here clearmsgcontainer refer to delet previous video with whom it was connected
        else if(parsedMessage.type === 'removideoclean'){
            
            console.log("removideoclean");
            remoteVideo.srcObject =null;
        }
        else if(parsedMessage.type === 'disablenextbutton'){
            
            console.log("disablenextbutton");
            disablenextbutton();

        }
        else if(parsedMessage.type === 'enablenextbutton'){
            console.log(parsedMessage.data);
            enablenextbutton();
        }

        else if(parsedMessage.type==='activeclient'){
            updateactiveclient(parsedMessage.data);
        }

    } catch (error) {
        console.error('Error parsing JSON:', error);
    }
}

function handleBinaryData(data) {
    const text = new TextDecoder().decode(data);
    try {
        const parsedMessage = JSON.parse(text);
        if (parsedMessage.type === 'offer') {
            peerConnection.setRemoteDescription(new RTCSessionDescription(parsedMessage.offer))
                .then(() => peerConnection.createAnswer())
                .then((answer) => peerConnection.setLocalDescription(answer))
                .then(() => {
                    peerConnection.ontrack = handleTrack;
                    socket.send(JSON.stringify({ type: 'answer', answer: peerConnection.localDescription }));
                })
                .catch((error) => console.error('Error creating answer:', error));
        } else if (parsedMessage.type === 'candidate') {
            peerConnection.addIceCandidate(new RTCIceCandidate(parsedMessage.candidate))
                .catch((error) => console.error('Error adding ICE candidate:', error));
        } else if (parsedMessage.type === 'answer') {
            peerConnection.setRemoteDescription(new RTCSessionDescription(parsedMessage.answer))
                .catch((error) => console.error('Error setting remote description:', error));
        }
        else if(parsedMessage.type === 'messagetosend'){

            showrecivedmessage(parsedMessage.message);
        }
        else if(parsedMessage.type === 'videotoggle'){
            // console.log("aaa" + parsedMessage.message);
            toogleRemVid(parsedMessage.message);
        }
        else if(parsedMessage.type === 'mictoggle'){
            // console.log("aaa" + parsedMessage.message);
            toogleRemMic(parsedMessage.message);
        }
    } catch (error) {
        console.error('Error parsing JSON:', error);
    }
}

function handleIceCandidate(event) {


    if (event.candidate) {
        socket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
    } else {
        console.log('ICE Candidate gathering complete.');
    }
}

function handleIceConnectionStateChange() {
    if (peerConnection.iceConnectionState === 'disconnected') {
        endCall();
    }
}

function endCall() {
    if (peerConnection) {
        peerConnection.close();
    }
    remoteVideo.srcObject = null;
    socket.close();
    startCall();
}

function showMessage(message) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML += `<p>${message}</p>`;
    console.log('Message:', message);

    setTimeout(function () {
        messagesDiv.innerHTML = '';
    }, 8000);
}
// function to send message when enter is clicked 

document.getElementById('sendmessage').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendtextmessage();
    }
});

//send message to same device in message section
function sendtextmessage(){
    const sendmessage = document.getElementById('sendmessage');
    message_store = sendmessage.value;

    sendMessageToReceiver(message_store);
    display_msg = document.querySelector('.mc-content');
    display_msg.innerHTML += ` <div class="mb-loc d-flex gap-2 mb-3">
                    <div class="loc-logo">
                        I
                    </div>
                    <div class="msg-blo msgborder-loc">
                        <p class="text-break">${message_store}</p>
                    </div>
                </div>`;
    sendmessage.value = '';

}


function showrecivedmessage(recivedmsg){
    console.log("ss" + recivedmsg);
    display_msg = document.querySelector('.mc-content');
    display_msg.innerHTML+=`<div class="mb-rem d-flex gap-2 justify-content-end mb-2">
                    <div class="msg-blo msgborder-rem">
                        <p class="text-break">${recivedmsg}</p>
                    </div>
                    <div class="loc-logo">
                        S
                    </div>
                </div>`;
}


function sendMessageToReceiver(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({type:'messagetosend' , message}));
        console.log('s1' + message);

        // socket.send(JSON.stringify({ type: 'video', message }));
    }
}




function informvideomic(type , message){
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({type:type , message}));
        console.log(type);


    }
}

function searchfornextreciver(type , message){
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({type:type , message}));
        console.log(type);

    }
}
document.getElementById('sendmessage').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendtextmessage();
    }
});

document.getElementById('Countrywise').addEventListener('click' , function(){
    countryname = this.innerText;

    if(socket&&socket.readyState===WebSocket.OPEN){

        socket.send(JSON.stringify({type:'changecountry' , message:countryname}));
    }
});



//handle open and closing of message box

const arrowmsg = document.getElementById("arrow-msg");
const vts2 = document.querySelector('.vts2');
const arrowSvgClose = arrowmsg.querySelector('.arrow-svg-close');
const arrowSvgOpen = arrowmsg.querySelector('.arrow-svg-open');

arrowmsg.addEventListener('click', togglearrowmsg);

let isOpen = false;

function togglearrowmsg() {
    if (!isOpen) {
        vts2.style.transform = 'translateY(0%)';
        arrowSvgClose.style.display = 'block';
        arrowSvgOpen.style.display = 'none';
        vts2.style.transition = 'transform 1s cubic-bezier(0.52, 0.43, 0.37, 0.5) 0s';
    } else {
        vts2.style.transform = 'translateY(90%)';
        arrowSvgClose.style.display = 'none';
        arrowSvgOpen.style.display = 'block';
        arrowSvgOpen.style.marginTop = '10px';
        vts2.style.transition = 'transform 1s cubic-bezier(0.52, 0.43, 0.37, 0.5) 0s';
    }
    isOpen = !isOpen;
    checkscreensiz();
}



function enablenextbutton(){
    startButton.disabled = false;
    startButton.style.background = '#55c628';
    console.log('vi');

}
function disablenextbutton(){

    startButton.disabled = true;

    startButton.style.background = ' #cfcfcf';

}

  
function updateactiveclient(numberofactiveclient){
    activeclient = document.getElementById('activeclient');
    totalnum = 1 + numberofactiveclient;
    activeclient.innerHTML = totalnum;
}





































// const localVideo = document.getElementById('localVideo');
// const remoteVideo = document.getElementById('remoteVideo');
// const startButton = document.getElementById('startButton');
// const endButton = document.getElementById('endButton');

// const videoToggleButton = document.getElementById('videoToggleButton');
// const micToggleButton = document.getElementById('micToggleButton');


// let localStream;
// let remoteStream;
// let peerConnection;
// let socket;
// let isMicOn = true; // Initial state
// let isVideoOn = true; // Initial state


// const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };


// // const configuration = {
// //     iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
// //     // Add the simulcast configuration
// //     iceTransportPolicy: 'all',
// //     iceCandidatePoolSize: 2,
// //     bundlePolicy: 'max-bundle',
// //     rtcpMuxPolicy: 'require',
// //     sdpSemantics: 'unified-plan',

// //     // Configure simulcast settings
// //     encodedInsertableStreams: true,
// //     insertableStreams: [{ width: 640, height: 480, mimeType: 'video/H264' }],
// // };


// startButton.addEventListener('click', startCall);
// endButton.addEventListener('click', endCall);



// videoToggleButton.addEventListener('click', toggleVideo);
// micToggleButton.addEventListener('click', toggleMic);


//     function startCall() {
//         initSocket();

//         navigator.mediaDevices.getUserMedia({ video: true })
//             .then((stream) => {
//                 localStream = stream;
//                 localVideo.srcObject = stream;

//                 // Create peer connection
//                 peerConnection = new RTCPeerConnection(configuration);
                
//                 peerConnection.ontrack = handleTrack;

//                 // Add local stream to peer connection
//                 localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

//                 // Set up event handlers for ICE negotiation events
//                 peerConnection.onicecandidate = handleIceCandidate;
//                 peerConnection.oniceconnectionstatechange = handleIceConnectionStateChange;

//                 // Create offer
//                 return peerConnection.createOffer();
//             })
//             .then((offer) => {
//                 return peerConnection.setLocalDescription(offer);
//             })
//             .then(() => {
//                 // Send offer to the server
//                 socket.send(JSON.stringify({ type: 'offer', offer: peerConnection.localDescription }));
//             })
//             .catch((error) => {
//                 console.error('Error starting call:', error);
//             });
//     }

    
//     function toggleVideo() {
//         isVideoOn = !isVideoOn;
//         localStream.getVideoTracks()[0].enabled = isVideoOn;



//         const videoText = isVideoOn ? 'Video On' : 'Video Off';
    
//         // Change the innerHTML of the videoIcon element
//         videoToggleButton.innerHTML = videoText;


//         // Send message to the receiver to inform about the video state
//         const messageType = isVideoOn ? 'videoOn' : 'videoOff';
//         sendMessageToReceiver( messageType );
//     }

//     function toggleMic() {
//         isMicOn = !isMicOn;
//         localStream.getAudioTracks()[0].enabled = isMicOn;
    
//         // Update UI to reflect the microphone state
//         const micIcon = document.getElementById('micIcon');
//         micIcon.src = isMicOn ? 'mic-on.png' : 'mic-off.png';
    
//         // Send message to the receiver to inform about the microphone state
//         const messageType = isMicOn ? 'micOn' : 'micOff';
//         sendMessageToReceiver({ messageType });
//     }


//     function handleTrack(event) {
//         console.log('handleTrack event:', event);
//         remoteStream = event.streams[0];
//         console.log('remoteStream:', remoteStream);
//         remoteVideo.srcObject = remoteStream;
//     }
    
//     document.addEventListener('DOMContentLoaded', function () {
//         // initSocket();
//     });
    

//   function initSocket() {
//     socket = new WebSocket('ws://localhost:3000');

//     socket.addEventListener('open', () => {
//         console.log('WebSocket connection opened');
//     });

//     socket.addEventListener('message', (event) => {
//         console.log(event);
//         if (event.data instanceof Blob) {
//             // Handle Blob data, assuming it's binary data (e.g., ArrayBuffer)
//             const reader = new FileReader();
//             reader.onload = () => {
//                 handleBinaryData(reader.result);
//             };
//             reader.readAsArrayBuffer(event.data);
//         } else {
//             // Parse JSON data
//             const parsedMessage = JSON.parse(event.data);
//             console.log("d");

//             if (parsedMessage.type === 'offer' || parsedMessage.type === 'answer') {
//                 // Set remote description and create answer
//                 peerConnection.setRemoteDescription(new RTCSessionDescription(parsedMessage.offer))
//                     .then(() => peerConnection.createAnswer())
//                     .then((answer) => peerConnection.setLocalDescription(answer))
//                     .then(() => {
//                         // Send answer to the server
//                         socket.send(JSON.stringify({ type: 'answer', answer: peerConnection.localDescription }));
//                     })
//                     .catch((error) => {
//                         console.error('Error creating answer:', error);
//                     });
//             } 
            
//             else if (parsedMessage.type === 'candidate') {
//                 console.log("ff");
//                 // Add ICE candidate received from the server
//                 peerConnection.addIceCandidate(new RTCIceCandidate(parsedMessage.candidate))
//                     .catch((error) => {
//                         console.error('Error adding ICE candidate:', error);
//                     });
//             }

//             else if(parsedMessage.type === 'info')
//                 {
//                     showMessage(parsedMessage.data);
//                 }


//         }
//     });

//     socket.addEventListener('close', () => {
//         console.log('WebSocket connection closed');
//     });
//   }

//     function handleBinaryData(data) {
//     // Handle binary data, if needed
//     console.log('Received binary data:', data);

//     const text = new TextDecoder().decode(data);
//     console.log('Converted binarys data to text:', text);

//     try {
//         const parsedMessage = JSON.parse(text);

//         if (parsedMessage.type === 'offer') {
//             console.log("ppp");
//             // Handle the offer
//             const offer = parsedMessage.offer;
            
//             // Set remote description and create answer
//             peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
//                 .then(() => peerConnection.createAnswer())
//                 .then((answer) => peerConnection.setLocalDescription(answer))
//                 .then(() => {
//                     peerConnection.ontrack = handleTrack;
//                     // Send answer to the server
//                     socket.send(JSON.stringify({ type: 'answer', answer: peerConnection.localDescription }));
//                 })
//                 .catch((error) => {
//                     console.error('Error creating answer:', error);
//                 });
//         }
//         else if (parsedMessage.type === 'candidate') {
//             console.log("hi");
//             // Add ICE candidate received from the server
//             peerConnection.addIceCandidate(new RTCIceCandidate(parsedMessage.candidate))
//                 .catch((error) => {
//                     console.error('Error adding ICE candidate:', error);
//                 });
//         } 
//         else if (parsedMessage.type === 'answer') {


//             // Handle the answer
//             const answer = parsedMessage.answer;
            
//             // Set remote description
//             peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
//                 .catch((error) => {
//                     console.error('Error setting remote description:', error);
//                 });
//             }

//     } catch (error) {
//         console.error('Error parsing JSON:', error);
//     }
//     }


//     function handleIceCandidate(event) {
//         console.log(event.candidate);
//         if (event.candidate) {
//             // Send the ICE candidate to the server
//             socket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
//         } else {
//             console.log('ICE Candidate gathering complete.');
//         }
//     }


//     function handleIceConnectionStateChange() {
//         if (peerConnection.iceConnectionState === 'disconnected') {
//             endCall();
//         }
//     }


//     function endCall() {
//         if (peerConnection) {
//             peerConnection.close();
//         }
//         // localVideo.srcObject = null;
//         remoteVideo.srcObject = null;
//         socket.close();
//         startCall();
//     }

//     function showMessage(message) {
//         const messagesDiv = document.getElementById('messages');
//         messagesDiv.innerHTML += `<p>${message}</p>`;
//         console.log("hii", message);
//     }

//     function sendMessageToReceiver(message) {
//         // You need to replace 'receiverId' with the actual identifier of the receiver
//         // This can be obtained from your application logic.

    
//         if (socket && socket.readyState === WebSocket.OPEN) {
//             // socket.send(JSON.stringify({  message }));
//             socket.send(JSON.stringify({ type: 'video', message }));
//         }
//     }
