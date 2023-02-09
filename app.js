
let APP_ID = "79016108df224440868fc21e0568f883";

let token = null;
let uid = String(Math.floor(Math.random() * 10000));


let client;
let channel;

// Room IDs
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let roomId = urlParams.get('room');

if(!roomId){
    window.location = 'lobby.html';
}


let localStream;
let remoteStream;
let peerConnection;


const servers =  {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

// Video Quality dimensions
let constraints = {
    video:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1080}
    },
    audio:true
}


// INIT function
let init = async () => {

    client = await AgoraRTM.createInstance(APP_ID);
    await client.login({uid, token});

    // creating room
    channel = client.createChannel(roomId);
    await channel.join();

    channel.on('MemberJoined', handleUserJoined);
    channel.on('MemberLeft', handleUserLeft)

    client.on('MessageFromPeer', handleMessageFromePeer);

    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById('user-1').srcObject = localStream;

}

// User Leaving the Call

let handleUserLeft = async(MemberId) => {
    document.getElementById('user-2').style.display = 'none';
    document.getElementById('user-1').classList.remove('smallFrame');

}

// Processing Message from Peer
let handleMessageFromePeer = async(message, MemberId) => {
    message = JSON.parse(message.text);
    
    if(message.type === 'offer'){
        createAnswer(MemberId, message.offer)
    }

    if(message.type === 'answer'){
        addAnswer(message.answer)
    }

    if(message.type === 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}

// Member joining channel trigger function
let handleUserJoined = async (MemberId) => {
    console.log('A new user has joined the channel:', MemberId);
    crateOffer(MemberId);
}

// Setting Peer Connection Used both in creating Offer and Answer
let createPeerConnection = async (MemberId) => {
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    document.getElementById('user-2').srcObject = remoteStream;
    document.getElementById('user-2').style.display = 'block';
    document.getElementById('user-1').classList.add('smallFrame');


    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false});
    document.getElementById('user-1').srcObject = localStream;
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    });

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        })
    }

    peerConnection.onicecandidate = async (event) => {
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate' , 'candidate':event.candidate})}, MemberId)
        }
    }
} ;


// Creating Offer
let crateOffer = async (MemberId) => {
    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer();
    await  peerConnection.setLocalDescription(offer);

    // Sending message to peer
    client.sendMessageToPeer({text:JSON.stringify({'type':'offer' , 'offer':offer})}, MemberId);
}


// Creating Answer
let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer);

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'answer' , 'answer':answer})}, MemberId);
}

let addAnswer = async (answer) => {
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
}

let leaveChannel = async () => {
    await channel.leave();
    await client.logout(); 
}


// Toggling Camera
let toggleCamera = async () => {
    let videoTrack = localStream.getTracks().find(track => track.kind === 'video');

    if(videoTrack.enabled){
        videoTrack.enabled = false;
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)';
    }
    else{
        videoTrack.enabled = true;
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102, 249, 0.9)';
    }
}

document.getElementById('camera-btn').addEventListener('click', toggleCamera);


// Toggling Mic
let toggleMic = async () => {
    let audioTrack = localStream.getTracks().find(track => track.kind === 'audio');

    if(audioTrack.enabled){
        audioTrack.enabled = false;
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)';
    }
    else{
        audioTrack.enabled = true;
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, 0.9)';
    }
}

document.getElementById('mic-btn').addEventListener('click', toggleMic);



window.addEventListener('beforeunload' , leaveChannel)

init()


