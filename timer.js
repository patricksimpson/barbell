(function() {
  'use strict';

  var STORAGE_KEY = 'timerState';

  // State
  var mode = 'countdown'; // 'countdown' or 'stopwatch'
  var isRunning = false;
  var startTime = 0;
  var elapsedTime = 0;
  var countdownTarget = 0;
  var timerInterval = null;
  var laps = [];
  var lastLapTime = 0;

  // Separate state for each mode (to persist when switching)
  var countdownState = { elapsedTime: 0, countdownTarget: 0, startTime: 0, isRunning: false };
  var stopwatchState = { elapsedTime: 0, laps: [], lastLapTime: 0, startTime: 0, isRunning: false };

  // DOM Elements
  var timerDisplay = document.getElementById('timer-display');
  var minutesInput = document.getElementById('minutes-input');
  var secondsInput = document.getElementById('seconds-input');
  var countdownInputSection = document.getElementById('countdown-input');
  var quickPresetsSection = document.getElementById('quick-presets');
  var startStopBtn = document.getElementById('start-stop-btn');
  var lapResetBtn = document.getElementById('lap-reset-btn');
  var lapsSection = document.getElementById('laps-section');
  var lapsList = document.getElementById('laps-list');
  var modeButtons = document.querySelectorAll('.mode-btn');
  var presetButtons = document.querySelectorAll('.preset-btn');

  // Audio context for completion sound
  var audioContext = null;

  // ============ LocalStorage Persistence ============

  function saveToStorage() {
    // Update current mode's state object before saving
    if (mode === 'countdown') {
      countdownState.elapsedTime = elapsedTime;
      countdownState.countdownTarget = countdownTarget;
      countdownState.startTime = startTime;
      countdownState.isRunning = isRunning;
    } else {
      stopwatchState.elapsedTime = elapsedTime;
      stopwatchState.laps = laps;
      stopwatchState.lastLapTime = lastLapTime;
      stopwatchState.startTime = startTime;
      stopwatchState.isRunning = isRunning;
    }

    var state = {
      mode: mode,
      countdown: countdownState,
      stopwatch: stopwatchState
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Storage full or unavailable
    }
  }

  function loadFromStorage() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;

      var state = JSON.parse(saved);

      // Restore mode states
      countdownState = state.countdown || { elapsedTime: 0, countdownTarget: 0, startTime: 0, isRunning: false };
      stopwatchState = state.stopwatch || { elapsedTime: 0, laps: [], lastLapTime: 0, startTime: 0, isRunning: false };

      // Set current mode
      mode = state.mode || 'countdown';

      // Restore current mode's variables
      if (mode === 'countdown') {
        elapsedTime = countdownState.elapsedTime;
        countdownTarget = countdownState.countdownTarget;
        startTime = countdownState.startTime;
        isRunning = countdownState.isRunning;
        laps = [];
        lastLapTime = 0;
      } else {
        elapsedTime = stopwatchState.elapsedTime;
        laps = stopwatchState.laps || [];
        lastLapTime = stopwatchState.lastLapTime;
        startTime = stopwatchState.startTime;
        isRunning = stopwatchState.isRunning;
        countdownTarget = 0;
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  function clearStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // Ignore
    }
  }

  // ============ Audio ============

  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playCompletionSound() {
    initAudio();
    if (!audioContext) return;

    // Play a pleasant chime sequence
    var frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    var duration = 0.15;

    frequencies.forEach(function(freq, i) {
      var oscillator = audioContext.createOscillator();
      var gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      var startAt = audioContext.currentTime + (i * 0.15);
      gainNode.gain.setValueAtTime(0.3, startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startAt + duration);

      oscillator.start(startAt);
      oscillator.stop(startAt + duration);
    });
  }

  // ============ Display ============

  function formatTime(ms, includeMs) {
    if (includeMs === undefined) includeMs = true;

    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    var centiseconds = Math.floor((ms % 1000) / 10);

    var formatted = String(minutes).padStart(2, '0') + ':' +
                    String(seconds).padStart(2, '0');

    if (includeMs) {
      formatted += '.' + String(centiseconds).padStart(2, '0');
    }

    return formatted;
  }

  function updateDisplay() {
    var displayTime;

    if (mode === 'countdown') {
      if (isRunning) {
        var elapsed = Date.now() - startTime;
        var remaining = Math.max(0, countdownTarget - elapsed);
        displayTime = remaining;

        if (remaining === 0) {
          stopTimer();
          timerComplete();
        }
      } else if (elapsedTime > 0) {
        // Paused countdown
        displayTime = elapsedTime;
      } else {
        // Not started - show input time
        var mins = parseInt(minutesInput.value) || 0;
        var secs = parseInt(secondsInput.value) || 0;
        displayTime = (mins * 60 + secs) * 1000;
      }
    } else {
      // Stopwatch mode
      if (isRunning) {
        displayTime = Date.now() - startTime + elapsedTime;
      } else {
        displayTime = elapsedTime;
      }
    }

    timerDisplay.textContent = formatTime(displayTime);
  }

  function timerComplete() {
    timerDisplay.classList.add('finished');
    playCompletionSound();

    setTimeout(function() {
      timerDisplay.classList.remove('finished');
    }, 1500);
  }

  // ============ Timer Controls ============

  function startTimer() {
    initAudio(); // Initialize audio on user interaction

    if (mode === 'countdown') {
      if (elapsedTime > 0) {
        // Resuming paused countdown
        countdownTarget = elapsedTime;
      } else {
        // Starting fresh countdown
        var mins = parseInt(minutesInput.value) || 0;
        var secs = parseInt(secondsInput.value) || 0;
        countdownTarget = (mins * 60 + secs) * 1000;

        if (countdownTarget === 0) return; // Don't start with 0
      }
      elapsedTime = 0;
    }

    isRunning = true;
    startTime = Date.now();
    timerDisplay.classList.add('running');
    startStopBtn.textContent = 'Stop';
    startStopBtn.classList.add('stop');
    lapResetBtn.textContent = mode === 'stopwatch' ? 'Lap' : 'Reset';

    // Disable manual inputs while running (keep presets enabled for quick restart)
    minutesInput.disabled = true;
    secondsInput.disabled = true;

    saveToStorage();
    timerInterval = setInterval(updateDisplay, 10);
  }

  function stopTimer() {
    isRunning = false;

    if (mode === 'countdown') {
      var elapsed = Date.now() - startTime;
      elapsedTime = Math.max(0, countdownTarget - elapsed);
    } else {
      elapsedTime += Date.now() - startTime;
    }

    clearInterval(timerInterval);
    timerDisplay.classList.remove('running');
    startStopBtn.textContent = 'Start';
    startStopBtn.classList.remove('stop');
    lapResetBtn.textContent = 'Reset';

    // Re-enable manual inputs
    minutesInput.disabled = false;
    secondsInput.disabled = false;

    saveToStorage();
  }

  function resetTimer() {
    isRunning = false;
    elapsedTime = 0;
    countdownTarget = 0;
    lastLapTime = 0;
    laps = [];
    startTime = 0;

    clearInterval(timerInterval);
    timerDisplay.classList.remove('running', 'finished');
    startStopBtn.textContent = 'Start';
    startStopBtn.classList.remove('stop');
    lapResetBtn.textContent = 'Reset';

    // Re-enable manual inputs
    minutesInput.disabled = false;
    secondsInput.disabled = false;

    // Also reset the stored state for current mode
    if (mode === 'countdown') {
      countdownState = { elapsedTime: 0, countdownTarget: 0, startTime: 0, isRunning: false };
    } else {
      stopwatchState = { elapsedTime: 0, laps: [], lastLapTime: 0, startTime: 0, isRunning: false };
    }

    saveToStorage();
    updateDisplay();
    updateLapsDisplay();

    if (mode === 'stopwatch') {
      lapsSection.style.display = 'none';
    }
  }

  function recordLap() {
    if (!isRunning || mode !== 'stopwatch') return;

    var currentTime = Date.now() - startTime + elapsedTime;
    var lapTime = currentTime - lastLapTime;
    lastLapTime = currentTime;

    laps.unshift({
      number: laps.length + 1,
      time: currentTime,
      lapTime: lapTime
    });

    saveToStorage();
    updateLapsDisplay();
  }

  // ============ Laps Display ============

  function updateLapsDisplay() {
    if (laps.length === 0) {
      lapsSection.style.display = 'none';
      return;
    }

    lapsSection.style.display = 'block';

    // Find best and worst laps (if more than 2 laps)
    var bestLap = null;
    var worstLap = null;

    if (laps.length > 2) {
      var lapTimes = laps.map(function(l) { return l.lapTime; });
      var minTime = Math.min.apply(null, lapTimes);
      var maxTime = Math.max.apply(null, lapTimes);

      laps.forEach(function(lap) {
        if (lap.lapTime === minTime && !bestLap) bestLap = lap.number;
        if (lap.lapTime === maxTime && !worstLap) worstLap = lap.number;
      });
    }

    var html = laps.map(function(lap) {
      var classes = 'lap-item';
      if (lap.number === bestLap) classes += ' best';
      if (lap.number === worstLap) classes += ' worst';

      return '<div class="' + classes + '">' +
        '<span class="lap-number">Lap ' + lap.number + '</span>' +
        '<span class="lap-diff">+' + formatTime(lap.lapTime) + '</span>' +
        '<span class="lap-time">' + formatTime(lap.time) + '</span>' +
        '</div>';
    }).join('');

    lapsList.innerHTML = html;
  }

  // ============ Mode Switching ============

  function saveCurrentModeState() {
    // Save raw values - don't recalculate! This allows timers to "continue" in background
    if (mode === 'countdown') {
      countdownState.elapsedTime = elapsedTime;
      countdownState.countdownTarget = countdownTarget;
      countdownState.startTime = startTime;
      countdownState.isRunning = isRunning;
    } else {
      stopwatchState.elapsedTime = elapsedTime;
      stopwatchState.laps = laps.slice();
      stopwatchState.lastLapTime = lastLapTime;
      stopwatchState.startTime = startTime;
      stopwatchState.isRunning = isRunning;
    }
  }

  function restoreModeState(targetMode) {
    if (targetMode === 'countdown') {
      elapsedTime = countdownState.elapsedTime;
      countdownTarget = countdownState.countdownTarget;
      startTime = countdownState.startTime;
      isRunning = countdownState.isRunning;
      laps = [];
      lastLapTime = 0;

      // Check if countdown finished while we were in stopwatch mode
      if (isRunning && startTime > 0) {
        var elapsed = Date.now() - startTime;
        var remaining = countdownTarget - elapsed;
        if (remaining <= 0) {
          isRunning = false;
          elapsedTime = 0;
          countdownState.isRunning = false;
          countdownState.elapsedTime = 0;
          // Play completion sound after a brief delay
          setTimeout(timerComplete, 100);
        }
      }
    } else {
      elapsedTime = stopwatchState.elapsedTime;
      laps = stopwatchState.laps ? stopwatchState.laps.slice() : [];
      lastLapTime = stopwatchState.lastLapTime;
      startTime = stopwatchState.startTime;
      isRunning = stopwatchState.isRunning;
      countdownTarget = 0;
    }
  }

  function setMode(newMode) {
    if (newMode === mode) return;

    // Save current mode's state (pause the interval but keep time tracking)
    saveCurrentModeState();
    clearInterval(timerInterval);

    // Switch mode
    mode = newMode;

    // Restore the target mode's state
    restoreModeState(newMode);

    // Update mode buttons
    modeButtons.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Show/hide countdown-specific elements
    if (mode === 'countdown') {
      countdownInputSection.style.display = 'flex';
      quickPresetsSection.style.display = 'flex';
      lapsSection.style.display = 'none';
    } else {
      countdownInputSection.style.display = 'none';
      quickPresetsSection.style.display = 'none';
      updateLapsDisplay();
    }

    // Update UI based on running state
    if (isRunning) {
      timerDisplay.classList.add('running');
      startStopBtn.textContent = 'Stop';
      startStopBtn.classList.add('stop');
      lapResetBtn.textContent = mode === 'stopwatch' ? 'Lap' : 'Reset';
      minutesInput.disabled = true;
      secondsInput.disabled = true;
      timerInterval = setInterval(updateDisplay, 10);
    } else {
      timerDisplay.classList.remove('running', 'finished');
      startStopBtn.textContent = 'Start';
      startStopBtn.classList.remove('stop');
      lapResetBtn.textContent = 'Reset';
      minutesInput.disabled = false;
      secondsInput.disabled = false;
    }

    saveToStorage();
    updateDisplay();
  }

  function setPreset(seconds) {
    // Stop any running timer first
    if (isRunning) {
      clearInterval(timerInterval);
      isRunning = false;
    }

    // Reset state
    elapsedTime = 0;
    countdownTarget = seconds * 1000;

    // Update input fields
    var mins = Math.floor(seconds / 60);
    var secs = seconds % 60;
    minutesInput.value = mins;
    secondsInput.value = secs;

    // Start the countdown immediately
    isRunning = true;
    startTime = Date.now();
    timerDisplay.classList.add('running');
    startStopBtn.textContent = 'Stop';
    startStopBtn.classList.add('stop');
    lapResetBtn.textContent = 'Reset';

    // Disable manual inputs while running (but keep presets enabled for quick restart)
    minutesInput.disabled = true;
    secondsInput.disabled = true;

    initAudio();
    saveToStorage();
    timerInterval = setInterval(updateDisplay, 10);
  }

  // ============ Initialization ============

  function initializeUI() {
    // Update mode buttons
    modeButtons.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Show/hide countdown-specific elements
    if (mode === 'countdown') {
      countdownInputSection.style.display = 'flex';
      quickPresetsSection.style.display = 'flex';
      lapsSection.style.display = 'none';
    } else {
      countdownInputSection.style.display = 'none';
      quickPresetsSection.style.display = 'none';
      updateLapsDisplay();
    }

    // Check if countdown finished while away
    if (mode === 'countdown' && isRunning) {
      var elapsed = Date.now() - startTime;
      var remaining = countdownTarget - elapsed;
      if (remaining <= 0) {
        // Timer completed while away
        isRunning = false;
        elapsedTime = 0;
        timerComplete();
        saveToStorage();
      }
    }

    // Update UI based on running state
    if (isRunning) {
      timerDisplay.classList.add('running');
      startStopBtn.textContent = 'Stop';
      startStopBtn.classList.add('stop');
      lapResetBtn.textContent = mode === 'stopwatch' ? 'Lap' : 'Reset';
      minutesInput.disabled = true;
      secondsInput.disabled = true;
      timerInterval = setInterval(updateDisplay, 10);
    }
  }

  // ============ Event Listeners ============

  startStopBtn.addEventListener('click', function() {
    if (isRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  lapResetBtn.addEventListener('click', function() {
    if (isRunning && mode === 'stopwatch') {
      recordLap();
    } else {
      resetTimer();
    }
  });

  modeButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      setMode(btn.dataset.mode);
    });
  });

  presetButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      setPreset(parseInt(btn.dataset.seconds));
    });
  });

  // Input validation
  minutesInput.addEventListener('input', function() {
    var val = parseInt(this.value);
    if (val > 99) this.value = 99;
    if (val < 0) this.value = 0;
    updateDisplay();
  });

  secondsInput.addEventListener('input', function() {
    var val = parseInt(this.value);
    if (val > 59) this.value = 59;
    if (val < 0) this.value = 0;
    updateDisplay();
  });

  // Select input on focus
  minutesInput.addEventListener('focus', function() { this.select(); });
  secondsInput.addEventListener('focus', function() { this.select(); });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT') return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (isRunning) {
        stopTimer();
      } else {
        startTimer();
      }
    } else if (e.code === 'KeyR') {
      resetTimer();
    } else if (e.code === 'KeyL' && mode === 'stopwatch' && isRunning) {
      recordLap();
    }
  });

  // Save state before leaving page
  window.addEventListener('beforeunload', function() {
    if (isRunning || elapsedTime > 0 || laps.length > 0) {
      saveToStorage();
    }
  });

  // Also save periodically while running (in case of crash)
  setInterval(function() {
    if (isRunning) {
      saveToStorage();
    }
  }, 5000);

  // ============ Countdown Monitoring (while in Stopwatch mode) ============

  var countdownNotificationShown = false;

  function showCountdownNotification() {
    if (countdownNotificationShown) return;
    countdownNotificationShown = true;

    var banner = document.createElement('div');
    banner.className = 'timer-notification';
    banner.innerHTML = '<span>Countdown Complete!</span><button class="go-btn">Go to Countdown</button><button class="dismiss-btn">&times;</button>';
    document.body.appendChild(banner);

    setTimeout(function() {
      banner.classList.add('show');
    }, 10);

    banner.querySelector('.go-btn').addEventListener('click', function() {
      banner.classList.remove('show');
      setTimeout(function() {
        banner.remove();
        countdownNotificationShown = false;
      }, 300);
      setMode('countdown');
    });

    banner.querySelector('.dismiss-btn').addEventListener('click', function() {
      banner.classList.remove('show');
      setTimeout(function() {
        banner.remove();
        countdownNotificationShown = false;
      }, 300);
    });

    // Auto-dismiss after 10 seconds
    setTimeout(function() {
      if (banner.parentNode) {
        banner.classList.remove('show');
        setTimeout(function() {
          if (banner.parentNode) banner.remove();
          countdownNotificationShown = false;
        }, 300);
      }
    }, 10000);
  }

  function checkCountdownWhileInStopwatch() {
    // Only check if we're in stopwatch mode
    if (mode !== 'stopwatch') return;

    // Check if countdown was running in background
    if (countdownState.isRunning && countdownState.startTime > 0) {
      var elapsed = Date.now() - countdownState.startTime;
      var remaining = countdownState.countdownTarget - elapsed;

      if (remaining <= 0) {
        // Countdown completed while we were in stopwatch mode
        countdownState.isRunning = false;
        countdownState.elapsedTime = 0;
        saveToStorage();

        playCompletionSound();
        showCountdownNotification();
      }
    }
  }

  // Check countdown status every second while in stopwatch mode
  setInterval(checkCountdownWhileInStopwatch, 1000);

  // ============ Initialize ============

  loadFromStorage();
  initializeUI();
  updateDisplay();
})();
