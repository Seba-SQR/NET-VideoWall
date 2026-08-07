const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
        
let ws;
let localStream = null;
let peerConnections = new Map(); // id_pantalla -> RTCPeerConnection
        
const iceConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

startBtn.onclick = async () => {
    try {
        // Capturar pantalla pidiendo la resolución más alta disponible
        localStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 60 } },
            audio: false
        });
                
        statusDiv.innerText = "Pantalla capturada. Conectando al servidor...";
        startBtn.disabled = true;

        // Conexión dinámica por WebSocket (funciona local o por IP de red)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}?role=broadcaster`);

        ws.onopen = () => {
            statusDiv.innerText = "Transmitiendo. Esperando pantallas (displays)...";
        };

        ws.onmessage = async (msg) => {
            const data = JSON.parse(msg.data);
            const id = data.displayId;

            if (data.type === "offer") {
                console.log(`Configurando conexión limpia para Pantalla ID: ${id}`);

                // Si ya existía una conexión previa colgada de ese ID, la cerramos
                if (peerConnections.has(id)) {
                    peerConnections.get(id).close();
                }

                const pc = new RTCPeerConnection(iceConfig);
                peerConnections.set(id, pc);

                // Inyectar el video capturado a esta nueva conexión
                localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

                // Enviar candidatos ICE generados hacia esa pantalla específica
                pc.onicecandidate = (e) => {
                    if (e.candidate && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "candidate", to: "display", displayId: id, candidate: e.candidate }));
                    }
                };

                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                ws.send(JSON.stringify({ type: "answer", displayId: id, answer}));
            }

            if (data.type === "answer") {
                const pc = peerConnections.get(id);
                if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                    console.log(`Conexión WebRTC establecida con Pantalla ID: ${id}`);
                }
            }

            if (data.type === "candidate") {
                const pc = peerConnections.get(id);
                if (pc) {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => console.error(e));
                }
            }
        };

        ws.onclose = () => { statusDiv.innerText = "Servidor desconectado."; };

    } catch (err) {
        console.error("Error al iniciar:", err);
        statusDiv.innerText = "Error: Permiso denegado o falla al capturar pantalla.";
    }
};
