class RadioPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.playButton = document.getElementById('playButton');
        this.playIcon = document.getElementById('playIcon');
        this.songTitle = document.getElementById('songTitle');
        this.artistName = document.getElementById('artistName');
        this.coverImage = document.getElementById('coverImage');
        this.radioPlayer = document.querySelector('.radio-player');
        this.coverArt = document.querySelector('.cover-art');
        this.trackInfo = document.querySelector('.track-info');
        this.volumeControl = document.getElementById('volumeControl');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeIcon = document.querySelector('.volume-icon');
        this.recentlyPlayedContainer = document.querySelector('.recently-played-container');
        this.recentlyPlayedList = document.getElementById('recentlyPlayedList');
        this.recentlyPlayedToggle = document.getElementById('recentlyPlayedToggle');
        this.container = document.querySelector('.container');
        this.mainContent = document.querySelector('.main-content');
        this.themeToggle = document.getElementById('themeToggle');
        this.recentlyPlayed = document.querySelector('.recently-played');
        this.body = document.body;
        
        this.isPlaying = false;
        this.isLoading = false;
        this.isInitialLoad = true;
        this.currentVolume = 0.4; // Start with moderate volume (40% actual, ~65% slider)
        this.recentTracks = []; // Store recently played tracks
        this.currentTrackId = null; // Track current song to avoid duplicates
        this.isRecentlyPlayedVisible = false; // Track visibility state
        this.lastTrackData = null; // Store last track data to prevent unnecessary updates
        this.isDarkMode = false; // Track theme state
        
        // AzuraCast configuration
        this.azuracastBaseUrl = 'https://weareharmony.net'; // Replace with your AzuraCast base URL
        this.stationId = 'harmony_radio'; // Replace with your station ID/short name
        this.updateInterval = 10000; // Update every 10 seconds
        this.updateTimer = null;
        
        this.init();
    }
    
    init() {
        // Set initial loading state - container starts invisible
        this.setInitialLoading(true);
        
        this.playButton.addEventListener('click', () => this.togglePlay());
        
        // Volume control event listeners
        this.volumeSlider.addEventListener('input', (e) => this.handleVolumeChange(e));
        this.volumeSlider.addEventListener('change', (e) => this.handleVolumeChange(e));
        
        // Recently played toggle event listener
        this.recentlyPlayedToggle.addEventListener('click', () => this.toggleRecentlyPlayed());
        
        // Theme toggle event listener
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Audio event listeners
        this.audio.addEventListener('loadstart', () => this.handleLoadStart());
        this.audio.addEventListener('canplay', () => this.handleCanPlay());
        this.audio.addEventListener('play', () => this.handlePlay());
        this.audio.addEventListener('pause', () => this.handlePause());
        this.audio.addEventListener('error', (e) => this.handleError(e));
        this.audio.addEventListener('waiting', () => this.handleWaiting());
        this.audio.addEventListener('playing', () => this.handlePlaying());
        
        // Set initial volume to a moderate level (around middle of slider)
        this.currentVolume = 0.4; // This corresponds to about 65% on the slider
        this.audio.volume = this.currentVolume;
        this.updateVolumeSlider();
        
        // Load saved theme preference
        this.loadThemePreference();
        
        // Set initial state
        this.updateUI();
        
        // Start fetching track info immediately
        this.fetchCurrentTrack();
        
        // Set up periodic updates
        this.startPeriodicUpdates();
    }
    
    async togglePlay() {
        if (this.isLoading) return;
        
        try {
            if (this.isPlaying) {
                await this.pause();
            } else {
                await this.play();
            }
        } catch (error) {
            console.error('Error toggling playback:', error);
            this.handleError();
        }
    }
    
    async play() {
        this.setLoading(true);
        
        try {
            // Load the audio if not already loaded
            if (this.audio.readyState === 0) {
                this.audio.load();
            }
            
            await this.audio.play();
        } catch (error) {
            console.error('Error playing audio:', error);
            this.handleError();
            this.setLoading(false);
        }
    }
    
    async pause() {
        this.audio.pause();
    }
    
    handleLoadStart() {
        this.setLoading(true);
    }
    
    handleCanPlay() {
        this.setLoading(false);
    }
    
    handlePlay() {
        this.isPlaying = true;
        this.setLoading(false);
        this.updateUI();
        this.showVolumeControl();
        
        // Start more frequent updates when playing
        this.startPeriodicUpdates();
    }
    
    handlePause() {
        this.isPlaying = false;
        this.updateUI();
        this.hideVolumeControl();
        
        // Stop periodic updates when paused (but keep occasional updates)
        this.stopPeriodicUpdates();
        this.startPeriodicUpdates(30000); // Update every 30 seconds when paused
    }
    
    handleWaiting() {
        this.setLoading(true);
    }
    
    handlePlaying() {
        this.setLoading(false);
    }
    
    handleError(error) {
        console.error('Audio error:', error);
        this.isPlaying = false;
        this.setLoading(false);
        this.updateUI();
        this.hideVolumeControl();
        
        // Show error message
        this.songTitle.textContent = 'Connection Error';
        this.artistName.textContent = 'Please try again later';
        
        // Stop periodic updates on error
        this.stopPeriodicUpdates();
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.playButton.classList.toggle('loading', loading);
        this.playButton.disabled = loading;
        this.radioPlayer.classList.toggle('loading', loading);
    }
    
    setInitialLoading(loading) {
        if (loading) {
            this.radioPlayer.classList.add('initial-loading');
            this.radioPlayer.classList.remove('loaded');
        } else {
            this.radioPlayer.classList.remove('initial-loading');
            this.radioPlayer.classList.add('loaded');
        }
    }
    
    setCoverLoading(loading) {
        this.coverArt.classList.toggle('loading', loading);
        this.coverImage.classList.toggle('loading', loading);
    }
    
    setTrackInfoUpdating(updating) {
        this.trackInfo.classList.toggle('updating', updating);
    }
    
    showVolumeControl() {
        this.volumeControl.classList.add('visible');
    }
    
    hideVolumeControl() {
        this.volumeControl.classList.remove('visible');
    }
    
    handleVolumeChange(event) {
        const sliderValue = event.target.value; // 0-100
        
        // Custom volume curve: left quiet, middle quieter, right not as loud
        let volume;
        if (sliderValue <= 50) {
            // Left half: 0-50% slider = 0-30% volume (quiet to moderate)
            volume = (sliderValue / 50) * 0.3;
        } else {
            // Right half: 50-100% slider = 30-70% volume (moderate to not too loud)
            volume = 0.3 + ((sliderValue - 50) / 50) * 0.4;
        }
        
        this.currentVolume = volume;
        this.audio.volume = volume;
        this.updateVolumeIcon(volume);
        this.updateVolumeSliderBackground(sliderValue);
    }
    
    updateVolumeSlider() {
        // Convert actual volume back to slider position for display
        let sliderValue;
        if (this.currentVolume <= 0.3) {
            // 0-30% volume = 0-50% slider position
            sliderValue = (this.currentVolume / 0.3) * 50;
        } else {
            // 30-70% volume = 50-100% slider position
            sliderValue = 50 + ((this.currentVolume - 0.3) / 0.4) * 50;
        }
        
        this.volumeSlider.value = Math.round(sliderValue);
        this.updateVolumeIcon(this.currentVolume);
        this.updateVolumeSliderBackground(Math.round(sliderValue));
    }
    
    updateVolumeIcon(volume) {
        if (volume === 0) {
            this.volumeIcon.className = 'fas fa-volume-mute volume-icon';
        } else if (volume < 0.5) {
            this.volumeIcon.className = 'fas fa-volume-down volume-icon';
        } else {
            this.volumeIcon.className = 'fas fa-volume-up volume-icon';
        }
    }
    
    updateVolumeSliderBackground(value) {
        const percentage = value;
        this.volumeSlider.style.background = `linear-gradient(to right, #667eea 0%, #667eea ${percentage}%, #ddd ${percentage}%, #ddd 100%)`;
    }
    
    toggleRecentlyPlayed() {
        this.isRecentlyPlayedVisible = !this.isRecentlyPlayedVisible;
        
        if (this.isRecentlyPlayedVisible) {
            // Opening: expand container and slide panel simultaneously
            this.container.classList.add('expanded');
            this.recentlyPlayedContainer.classList.add('visible');
            this.recentlyPlayedToggle.classList.add('active');
        } else {
            // Closing: slide panel back and shrink container simultaneously
            this.recentlyPlayedContainer.classList.remove('visible');
            this.recentlyPlayedToggle.classList.remove('active');
            this.container.classList.remove('expanded');
        }
    }
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        this.saveThemePreference();
    }
    
    applyTheme() {
        if (this.isDarkMode) {
            this.body.classList.add('dark-mode');
            this.radioPlayer.classList.add('dark-mode');
            this.recentlyPlayed.classList.add('dark-mode');
            this.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            this.body.classList.remove('dark-mode');
            this.radioPlayer.classList.remove('dark-mode');
            this.recentlyPlayed.classList.remove('dark-mode');
            this.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        
        // Update volume slider background for current theme
        const volumePercent = Math.round(this.currentVolume * 100);
        if (this.isDarkMode) {
            // Convert actual volume back to slider position for display
            let sliderValue;
            if (this.currentVolume <= 0.3) {
                sliderValue = (this.currentVolume / 0.3) * 50;
            } else {
                sliderValue = 50 + ((this.currentVolume - 0.3) / 0.4) * 50;
            }
            const percentage = Math.round(sliderValue);
            this.volumeSlider.style.background = `linear-gradient(to right, #8a9eff 0%, #8a9eff ${percentage}%, #555 ${percentage}%, #555 100%)`;
        } else {
            this.updateVolumeSlider();
        }
    }
    
    saveThemePreference() {
        localStorage.setItem('euphoriaRadioTheme', this.isDarkMode ? 'dark' : 'light');
    }
    
    loadThemePreference() {
        const savedTheme = localStorage.getItem('euphoriaRadioTheme');
        if (savedTheme === 'dark') {
            this.isDarkMode = true;
            this.applyTheme();
        }
    }
    
    showRecentlyPlayedContainer() {
        // This method is no longer needed since we use the toggle button
        // But keeping it for backward compatibility
    }
    
    updateRecentlyPlayed(azuraData) {
        if (!azuraData || !azuraData.song_history) return;
        
        const songHistory = azuraData.song_history;
        if (!songHistory || songHistory.length === 0) return;
        
        // Clear loading placeholders if this is the first real data
        if (this.recentTracks.length === 0) {
            this.clearLoadingPlaceholders();
        }
        
        let hasNewTracks = false;
        
        // Process song history in reverse order to maintain proper chronological order
        const reversedHistory = [...songHistory].reverse();
        
        reversedHistory.forEach(historyItem => {
            if (historyItem.song) {
                const track = {
                    id: historyItem.song.id || `${historyItem.song.title}-${historyItem.song.artist}`,
                    title: historyItem.song.title || 'Unknown Track',
                    artist: historyItem.song.artist || 'Unknown Artist',
                    cover: historyItem.song.art || null,
                    playedAt: historyItem.played_at || Date.now()
                };
                
                // Check if this is a new track before adding
                const wasAdded = this.addToRecentTracks(track);
                if (wasAdded) hasNewTracks = true;
            }
        });
        
        // Only re-render if there are actually new tracks
        if (hasNewTracks) {
            this.renderRecentTracks();
        }
    }
    
    addToRecentTracks(track) {
        // Don't add if it's the same as the current track or already in recent tracks
        if (track.id === this.currentTrackId) return false;
        
        // Check if track already exists
        const existingIndex = this.recentTracks.findIndex(t => t.id === track.id);
        if (existingIndex !== -1) return false;
        
        // Add to beginning (most recent first)
        this.recentTracks.unshift(track);
        
        // Keep only 5 tracks
        this.recentTracks = this.recentTracks.slice(0, 5);
        
        return true; // Return true if track was actually added
    }
    
    clearLoadingPlaceholders() {
        this.recentlyPlayedList.innerHTML = '';
    }
    
    renderRecentTracks() {
        // Clear current content
        this.recentlyPlayedList.innerHTML = '';
        
        if (this.recentTracks.length === 0) {
            this.recentlyPlayedList.innerHTML = '<div class="no-recent-tracks">No recent tracks available</div>';
            return;
        }
        
        this.recentTracks.forEach((track, index) => {
            const recentItem = this.createRecentTrackElement(track, index);
            this.recentlyPlayedList.appendChild(recentItem);
        });
    }
    
    createRecentTrackElement(track, index) {
        const recentItem = document.createElement('div');
        recentItem.className = 'recent-item entering';
        recentItem.style.animationDelay = `${index * 0.1}s`;
        
        const coverElement = document.createElement('div');
        coverElement.className = 'recent-cover';
        
        if (track.cover) {
            const img = document.createElement('img');
            img.src = track.cover;
            img.alt = `${track.title} cover`;
            img.onerror = () => {
                img.src = 'https://via.placeholder.com/45x45/667eea/ffffff?text=♪';
            };
            coverElement.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = `
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 18px;
                border-radius: 6px;
            `;
            placeholder.textContent = '♪';
            coverElement.appendChild(placeholder);
        }
        
        const infoElement = document.createElement('div');
        infoElement.className = 'recent-info';
        
        const titleElement = document.createElement('h4');
        titleElement.textContent = track.title;
        titleElement.title = track.title; // Tooltip for full title
        
        const artistElement = document.createElement('p');
        artistElement.textContent = track.artist;
        artistElement.title = track.artist; // Tooltip for full artist
        
        infoElement.appendChild(titleElement);
        infoElement.appendChild(artistElement);
        
        recentItem.appendChild(coverElement);
        recentItem.appendChild(infoElement);
        
        // Remove entering animation class after animation completes
        setTimeout(() => {
            recentItem.classList.remove('entering');
        }, 500);
        
        return recentItem;
    }
    
    updateUI() {
        if (this.isPlaying) {
            this.playIcon.className = 'fas fa-pause';
            this.playButton.classList.add('playing');
        } else {
            this.playIcon.className = 'fas fa-play';
            this.playButton.classList.remove('playing');
        }
    }
    
    startPeriodicUpdates(interval = null) {
        this.stopPeriodicUpdates();
        
        const updateInterval = interval || this.updateInterval;
        this.updateTimer = setInterval(() => {
            this.fetchCurrentTrack();
        }, updateInterval);
    }
    
    stopPeriodicUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
    
    async fetchCurrentTrack() {
        try {
            // Show loading state for track info updates only if track is actually changing
            const shouldShowLoading = !this.isInitialLoad && this.lastTrackData;
            
            // AzuraCast API endpoint for current song info
            const apiUrl = `${this.azuracastBaseUrl}/api/nowplaying/${this.stationId}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Check if track has actually changed before updating UI
            if (this.hasTrackChanged(data)) {
                if (shouldShowLoading) {
                    this.setTrackInfoUpdating(true);
                    // Small delay only if track actually changed
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                this.updateTrackInfo(data);
                this.lastTrackData = data;
            }
            
            // Always update recently played (but only render if changed)
            this.updateRecentlyPlayed(data);
            
            // Remove initial loading state after first successful fetch
            if (this.isInitialLoad) {
                setTimeout(() => {
                    this.setInitialLoading(false);
                    this.isInitialLoad = false;
                }, 300);
            }
            
        } catch (error) {
            console.error('Error fetching current track from AzuraCast:', error);
            
            // Fallback to default info
            this.updateTrackInfo(null);
            
            // Remove initial loading state even on error
            if (this.isInitialLoad) {
                setTimeout(() => {
                    this.setInitialLoading(false);
                    this.isInitialLoad = false;
                }, 300);
            }
        } finally {
            // Always remove updating state
            this.setTrackInfoUpdating(false);
        }
    }
    
    hasTrackChanged(newData) {
        if (!this.lastTrackData && newData) return true;
        if (!newData) return false;
        
        const oldSong = this.lastTrackData?.now_playing?.song;
        const newSong = newData?.now_playing?.song;
        
        if (!oldSong && !newSong) return false;
        if (!oldSong || !newSong) return true;
        
        return (
            oldSong.title !== newSong.title ||
            oldSong.artist !== newSong.artist ||
            oldSong.art !== newSong.art
        );
    }
    
    updateTrackInfo(azuraData = null) {
        if (azuraData && azuraData.now_playing && azuraData.now_playing.song) {
            const song = azuraData.now_playing.song;
            
            // Update song title and artist
            const title = song.title || 'Unknown Track';
            const artist = song.artist || 'Unknown Artist';
            
            // Update current track ID for recent tracks comparison
            this.currentTrackId = song.id || `${title}-${artist}`;
            
            this.songTitle.textContent = title;
            this.artistName.textContent = artist;
            
            // Update cover art if available
            if (song.art && song.art !== this.coverImage.src) {
                this.setCoverLoading(true);
                
                // Create a new image to preload
                const newImage = new Image();
                newImage.onload = () => {
                    this.coverImage.src = song.art;
                    this.coverImage.alt = `${title} by ${artist}`;
                    this.setCoverLoading(false);
                };
                newImage.onerror = () => {
                    this.coverImage.src = 'https://via.placeholder.com/200x200/1a1a1a/ffffff?text=Euphoria+Radio';
                    this.coverImage.alt = 'Cover Art';
                    this.setCoverLoading(false);
                };
                newImage.src = song.art;
            } else if (!song.art) {
                // Use default cover art if none available
                this.coverImage.src = 'https://via.placeholder.com/200x200/1a1a1a/ffffff?text=Euphoria+Radio';
                this.coverImage.alt = 'Cover Art';
            }
            
            // Update page title with current song
            document.title = `${title} - ${artist} | Euphoria Radio`;
            
        } else {
            // Fallback for when no data is available
            this.currentTrackId = null;
            
            if (this.isPlaying) {
                this.songTitle.textContent = 'Live Stream';
                this.artistName.textContent = 'Euphoria Radio';
            } else {
                this.songTitle.textContent = 'Now Playing';
                this.artistName.textContent = 'Euphoria Radio';
            }
            
            // Reset to default cover art
            this.coverImage.src = 'https://via.placeholder.com/200x200/1a1a1a/ffffff?text=Euphoria+Radio';
            this.coverImage.alt = 'Cover Art';
            
            // Reset page title
            document.title = 'Euphoria Radio';
        }
    }
    
    // Method to manually update track info (keeping for backward compatibility)
    updateCurrentTrack(title, artist, coverUrl) {
        this.songTitle.textContent = title || 'Live Stream';
        this.artistName.textContent = artist || 'Euphoria Radio';
        
        if (coverUrl) {
            this.coverImage.src = coverUrl;
            this.coverImage.alt = `${title} by ${artist}`;
        }
    }
    
    // Cleanup method
    destroy() {
        this.stopPeriodicUpdates();
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
        }
    }
}

// Initialize the radio player when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const player = new RadioPlayer();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        player.destroy();
    });
});


