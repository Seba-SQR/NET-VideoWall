const response = await fetch("./display.json");
const config = await response.json();

console.log(config);

const wrapper = document.getElementById("videowall-wrapper");
wrapper.style.width = `${config.videowallCols * 100}vw`;
wrapper.style.height = `${config.videowallRows * 100}vh`;
wrapper.style.transform = `translate(${-config.displayCol * 100}vw, ${-config.displayRow * 100}vh)`;

const video = document.getElementById("video");

const reader = new MediaMTXWebRTCReader({
  url: new URL(`http://${config.mediaMtxServer}:${config.mediaMtxPort}/${config.mediaMtxPath}/whep`),
  onError: (err) => console.error("[MediaMTX Error]:", err),
  onTrack: (evt) => {
    video.srcObject = evt.streams[0];
  },
});

window.addEventListener('beforeunload', () => {
  if (reader) reader.close();
});