
document.addEventListener('DOMContentLoaded', () => initSocket());

function initSocket() {
    // socket = new WebSocket('ws://localhost:3000');
    socket = new WebSocket('ws://localhost:3000/textmessage.html');

    socket.addEventListener('open', () => console.log('WebSocket connection opened'));

    socket.addEventListener('message', (event) => {

        if (event.data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => handleBinaryData(reader.result);
            reader.readAsArrayBuffer(event.data);
        } else {
            parseSocketMessage(event.data);
            // console.log(event.data);
        }
    });

    socket.addEventListener('close', () => console.log('WebSocket connection closed'));
}

function parseSocketMessage(data) {
    try {
        const parsedMessage = JSON.parse(data);

        if (parsedMessage.type === 'info') {
            showMessage(parsedMessage.data);
        }
        else if(parsedMessage.type === 'messagetosend'){
            // console.log("s2" );
            showrecivedmessage(parsedMessage.data);
        }
        else if(parsedMessage.type==='clearmsgcontainer'){

            popupMessages2 = document.getElementById('popupMessages2');
            popupMessages2.innerHTML='Your chat partner has disconnected. Searching for another partner....'
            McContent = document.querySelector('.mc-content');
            McContent.innerHTML='';
        }
        else if(parsedMessage.type==='enablebutton'){
            //enable message box and button to send text
            enablebutton();
        }
        else if(parsedMessage.type==='disablebutton'){

            //disable message box and button to send text
            disablebutton();
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

        if(parsedMessage.type === 'messagetosend'){
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

//show server message , connected, error
function showMessage(message) {
    const messagesDiv = document.getElementById('popupMessages');
    messagesDiv.innerHTML = '';
    messagesDiv.innerHTML += `<p>${message}</p>`;
    // console.log('Message:', message);

    // setTimeout(function () {
    //     messagesDiv.innerHTML = '';
    // }, 8000);
}

//send message to same device in message section
function sendtextmessage(){
    const sendmessage = document.getElementById('sendmessage');
    message_store = sendmessage.value;
    const issafe = filterInput(message_store);

    if(issafe){
        sendMessageToReceiver(message_store);
        display_msg = document.querySelector('.mc-content');
        display_msg.innerHTML += `<div class="mb-loc d-flex gap-2 mb-3 justify-content-end">
                        <div class="msg-blo msgborder-loc">
                            <p class="text-break">${message_store} </p>
                        </div>
                        <div class="loc-logo">
                            I
                        </div>
                    </div>`;
        sendmessage.value = '';
    }
    else{
        // mesg  = "Message not send please remove special characters";
        // display_msg = document.querySelector('.mc-content');
        // display_msg.innerHTML += `<div class="mb-loc d-flex gap-2 mb-3 justify-content-end">
        //                 <div class="msg-blo msgborder-loc">
        //                     <p class="text-break danger">${message_store} </p>
        //                 </div>
        //                 <div class="loc-logo">
        //                     I
        //                 </div>
        //             </div>`;
        sendmessage.value = '';

    }


}

function filterInput(inputText) {
    // Define the pattern you want to filter or disallow
    const disallowedPattern = /[<>&%]/;

    if (disallowedPattern.test(inputText)) {
        
        alert('Input contains disallowed characters. Please avoid using <, >, &.');
        return false; 
    }
    return true;
}


//send message to reciver or conected client
function sendMessageToReceiver(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({type:'messagetosend' , message}));
        // console.log('s1' + message);
    }
}

//show recived message from sender or connected client
function showrecivedmessage(recivedmsg){
    // console.log("ss" + recivedmsg);
    display_msg = document.querySelector('.mc-content');
    display_msg.innerHTML+=`<div class="mb-rem d-flex gap-2  mb-2">
                    <div class="loc-logo">
                        S
                    </div>
                    <div class="msg-blo msgborder-rem">
                        <p>${recivedmsg}</p>
                    </div>
                </div>`;
}


document.getElementById('sendmessage').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendtextmessage();
    }
});


document.getElementById('startButton').addEventListener('click', function(){
    McContent = document.querySelector('.mc-content');
    socket.send(JSON.stringify({type:'searchnext', message:'search for next'}));
    McContent.innerHTML='';
    initSocket();
})


function enablebutton(){
    
    inputbox = document.getElementById('sendmessage');
    inputbox.disabled = false;
    inputbox.style.background = 'white';

}
function disablebutton(){

    inputbox = document.getElementById('sendmessage');
    inputbox.disabled = true;
    inputbox.style.background = ' #cfcfcf';

}

function updateactiveclient(numberofactiveclient){
    activeclient = document.getElementById('activeclient');
    totalnum = 1 + numberofactiveclient;
    activeclient.innerHTML = totalnum;
}