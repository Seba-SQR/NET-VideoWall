const response = await fetch("./config.json");
const config = await response.json();

const videowallId = config.vid;
const displayId = config.did;
const totalRows = config.rows;
const totalCols = config.cols;
const myRow = config.row;
const myCol = config.col;

// 2. Aplicar magia CSS de recorte y escalado
const video = document.getElementById("video");
video.style.width = (totalCols * 100) + "vw";
video.style.height = (totalRows * 100) + "vh";
video.style.transform = `translate(${-myCol * 100}vw, ${-myRow * 100}vh)`;

// 3. Conexión de señalización dinámica
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${protocol}//${window.location.host}?role=display&vid=${videowallId}&did=${displayId}`);

const iceConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const pc = new RTCPeerConnection(iceConfig);
pc.addTransceiver("video", {direction: "recvonly"});

pc.ontrack = (event) => {
    console.log("Señal de video recibida para esta porción del muro.");
    if (video.srcObject !== event.streams[0]) {
        video.srcObject = event.streams[0];
    }
};

pc.onicecandidate = (e) => {
    if (e.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: "candidate",
            to: "broadcaster",
            displayId: displayId,
            candidate: e.candidate
        }));
    }
};

ws.onopen = async () => {
    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({type: "offer", displayId: displayId, offer}));
};

ws.onmessage = async (msg) => {
    const data = JSON.parse(msg.data);

    if (data.type === "answer") {
        await pc.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );
    }
    else if (data.type === "candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => console.error(e));
    }
};

ws.onclose = () => { console.log("Desconectado del servidor de señalización."); };
