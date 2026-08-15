const response = await fetch("./config.json");
const config = await response.json();

const wrapper = document.getElementById("videowall-wrapper");
wrapper.style.width = `${config.cols * 100}vw`;
wrapper.style.height = `${config.rows * 100}vh`;
wrapper.style.transform = `translate(${-config.col * 100}vw, ${-config.row * 100}vh)`;

const video = document.getElementById("video");

const reader = new MediaMTXWebRTCReader({
  url: new URL(`http://${window.location.hostname}:8889/${config.vid}/whep`),
  onError: (err) => console.error("[MediaMTX Error]:", err),
  onTrack: (evt) => {
    video.srcObject = evt.streams[0];
  },
});

window.addEventListener('beforeunload', () => {
  if (reader) reader.close();
});