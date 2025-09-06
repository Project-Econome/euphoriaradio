const wrapper = document.querySelector(".wrapper"),
  musicImg = wrapper.querySelector(".img-area img"),
  musicName = wrapper.querySelector(".song-details .name"),
  musicArtist = wrapper.querySelector(".song-details .artist"),
  playPauseBtn = wrapper.querySelector(".play-pause"),
  mainAudio = wrapper.querySelector("#main-audio"),
  progressArea = wrapper.querySelector(".progress-area"),
  progressBar = progressArea.querySelector(".progress-bar"),
  musicList = wrapper.querySelector(".music-list"),
  moreMusicBtn = wrapper.querySelector("#more-music"),
  closeMoreMusic = musicList.querySelector("#close"),
  ulTag = wrapper.querySelector("ul"),
  currentTimeEl = wrapper.querySelector(".current-time"),
  volumeWrapper = wrapper.querySelector(".volume-wrapper"),
  volumeSlider = wrapper.querySelector(".volume-panel input");

let isPlaying = false;
let fakeTime = 0;
let fakeTimerInterval = null;
let lastSongId = null;

const streamUrl = "https://weareharmony.net/listen/harmony_radio/radio.mp3";
const apiUrl = "https://weareharmony.net/api/nowplaying/harmony_radio";

// Load initial stream
mainAudio.src = streamUrl;
currentTimeEl.innerText = "LIVE";
mainAudio.volume = 0.5; // default volume
volumeSlider.value = 0.5;

// --- Play / Pause ---
function playMusic() {
  isPlaying = true;
  wrapper.classList.add("paused");
  playPauseBtn.querySelector("i").innerText = "pause";
  mainAudio.play();

  if (fakeTimerInterval) clearInterval(fakeTimerInterval);
  fakeTimerInterval = setInterval(() => {
    fakeTime++;
    updateFakeProgress();
  }, 1000);
}

function pauseMusic() {
  isPlaying = false;
  wrapper.classList.remove("paused");
  playPauseBtn.querySelector("i").innerText = "play_arrow";
  mainAudio.pause();

  if (fakeTimerInterval) clearInterval(fakeTimerInterval);
}

playPauseBtn.addEventListener("click", () => {
  isPlaying ? pauseMusic() : playMusic();
});

// --- Volume Toggle Panel ---
volumeWrapper.addEventListener("click", () => {
  volumeWrapper.classList.toggle("show");
});

// --- Volume Slider ---
volumeSlider.addEventListener("input", (e) => {
  mainAudio.volume = e.target.value;
});

// --- Fetch Now Playing Info ---
async function fetchNowPlaying() {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const song = data.now_playing.song;

    // Song Info
    musicName.innerText = song.title || "Unknown Title";
    musicArtist.innerText = song.artist || "Unknown Artist";

    // Cover Art
    musicImg.src = song.art
      ? song.art
      : "https://via.placeholder.com/300x300/667eea/ffffff?text=Euphoria+Radio";

    // Recently Played
    renderRecentlyPlayed(data.song_history);

    // Reset fake timer if track changed
    if (lastSongId !== song.id) {
      fakeTime = 0;
      updateFakeProgress();
      lastSongId = song.id;
    }
  } catch (error) {
    console.error("Error fetching now playing:", error);
  }
}

// --- Render Recently Played List ---
function renderRecentlyPlayed(history) {
  ulTag.innerHTML = "";
  history.forEach((track) => {
    const liTag = `
      <li>
        <div class="row">
          <span>${track.song.title}</span>
          <p>${track.song.artist}</p>
        </div>
        <span class="audio-duration">${new Date(track.played_at * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
      </li>
    `;
    ulTag.insertAdjacentHTML("beforeend", liTag);
  });
}

// --- Fake Progress Bar ---
function updateFakeProgress() {
  const percent = (fakeTime % 180) / 180 * 100; // simulate ~3min loop
  progressBar.style.width = `${percent}%`;

  const mins = Math.floor(fakeTime / 60);
  const secs = (fakeTime % 60).toString().padStart(2, "0");
  currentTimeEl.innerText = `${mins}:${secs}`;
}

// --- Show/Hide Recently Played ---
moreMusicBtn.addEventListener("click", () => {
  musicList.classList.toggle("show");
});
closeMoreMusic.addEventListener("click", () => {
  musicList.classList.remove("show");
});

// --- Refresh Now Playing Info every 15s ---
setInterval(fetchNowPlaying, 15000);
fetchNowPlaying();
