// Minimal jQuery and Lodash stubs for relevant functions

// jQuery-like $
function $(selector) {
  // If selector is a DOM element, wrap it
  if (selector instanceof HTMLElement) return jQueryStub(selector);

  // For class selectors that may match multiple elements, use querySelectorAll
  var nodes = document.querySelectorAll(selector);
  if (nodes.length > 1) {
    return jQueryCollection(nodes);
  }
  return jQueryStub(document.querySelector(selector));
}

// jQuery-like stub for collections (multiple elements)
function jQueryCollection(nodes) {
  return {
    on: function (event, handler) {
      for (var i = 0; i < nodes.length; i++) {
        (function(node) {
          node.addEventListener(event, function (e) {
            handler.call(node, e);
          });
        })(nodes[i]);
      }
      return this;
    }
  };
}

// jQuery-like stub for chaining and prop()
function jQueryStub(node) {
  return {
    node: node,
    0: node, // Allow array-style access
    prop: function (propName, value) {
      if (!node) return this;
      if (value === undefined) {
        // Get prop
        if (propName === "checked") return node.checked;
        return node[propName];
      } else {
        // Set prop
        if (propName === "checked") node.checked = !!value;
        else node[propName] = value;
        return this;
      }
    },
    val: function (value) {
      if (!node) return undefined;
      if (value === undefined) return node.value;
      node.value = value;
      return this;
    },
    show: function () {
      if (node) {
        // Use inline-flex for plate chips, block for others
        if (node.classList.contains("plate-chip")) {
          node.style.display = "inline-flex";
        } else {
          node.style.display = "block";
        }
      }
      return this;
    },
    hide: function () {
      if (node) node.style.display = "none";
      return this;
    },
    find: function (sel) {
      if (!node) return jQueryStub(null);
      return jQueryStub(node.querySelector(sel));
    },
    html: function (val) {
      if (!node) return this;
      if (val === undefined) return node.innerHTML;
      node.innerHTML = val;
      return this;
    },
    text: function (val) {
      if (!node) return this;
      if (val === undefined) return node.textContent;
      node.textContent = val;
      return this;
    },
    append: function (html) {
      if (!node) return this;
      node.insertAdjacentHTML("beforeend", html);
      return this;
    },
    on: function (event, handler) {
      if (!node) return this;
      node.addEventListener(event, function (e) {
        handler.call(node, e);
      });
      return this;
    },
    toggle: function () {
      if (node) node.style.display = node.style.display === "none" ? "" : "none";
      return this;
    },
    toggleClass: function (classes) {
      if (!node) return this;
      var classList = classes.split(" ");
      for (var i = 0; i < classList.length; i++) {
        node.classList.toggle(classList[i]);
      }
      return this;
    },
    is: function (selector) {
      if (!node) return false;
      if (selector === ":checked") return node.checked;
      return node.matches && node.matches(selector);
    },
    data: function (key) {
      if (!node) return undefined;
      return node.dataset[key];
    }
  };
}

// Lodash-like _ stub
var _ = {
  each: function (arr, fn) {
    if (!arr) return;
    // handle object or array
    if (Array.isArray(arr)) {
      for (var i = 0; i < arr.length; i++) fn(arr[i], i);
    } else if (typeof arr === "object") {
      for (var key in arr) {
        if (arr.hasOwnProperty(key)) fn(arr[key], key);
      }
    }
  },
  parseInt: function (str) {
    return parseInt(str, 10);
  }
  // ... add more stub methods as needed
};


(function () {
  var barWeight = 45,
    plates = [45, 35, 25, 10, 5, 2.5],
    fractionalPlates = [1, 0.75, 0.5, 0.25], // Fractional weights
    useFractionalWeights = false, // Toggle for fractional weights
    // Default inventory, should be overridden by local storage.
    plateObject = {
      45: 8,
      35: 0,
      25: 2,
      10: 4,
      5: 2,
      "2-5": 2,
    },
    // Default fractional plate inventory
    fractionalPlateObject = {
      1: 2,
      "0-75": 2,
      "0-5": 2,
      "0-25": 2,
    },
    total = 0,
    sidePlates = [],
    currentAmount = 0; // Track current amount for recalculation

  (function () {
    // Load plate inventory from local storage
    if (localStorage) {
      var LSPlates = localStorage.getItem("plateWeight");
      if (LSPlates) {
        plateObject = JSON.parse(LSPlates);
      }

      var LSFractionalPlates = localStorage.getItem("fractionalPlateWeight");
      if (LSFractionalPlates) {
        fractionalPlateObject = JSON.parse(LSFractionalPlates);
      }

      var LSUseFractional = localStorage.getItem("useFractionalWeights");
      if (LSUseFractional) {
        useFractionalWeights = JSON.parse(LSUseFractional);
        $("#use-fractional").prop("checked", useFractionalWeights);
      }

      // Load saved amount from local storage
      var savedAmount = localStorage.getItem("workoutAmount");
      if (savedAmount) {
        currentAmount = parseFloat(savedAmount);
        $("#total").val(currentAmount);
      }
    }

    calculatePlateWeight();
    toggleFractionalPlates(); // Initialize fractional plate visibility

    // If we have a saved amount, recalculate the plate distribution
    if (currentAmount > 0) {
      recalculateAmount();
    }

    $(".calc-plates").on("click", calculatePlateWeight);
    $(".hide-plates").on("click", togglePlateCalc);
    $(".clear-amounts").on("click", clearAmount);
    $("#use-fractional").on("change", toggleFractionalWeights);
  })();

  function togglePlateCalc() {
    var modal = document.querySelector(".plates-form--content");
    modal.classList.toggle("open");
    $(".settings-toggle").toggleClass("hide show");
    return false;
  }

  // Close modal when clicking backdrop
  document.querySelector(".plates-form--content").addEventListener("click", function(e) {
    if (e.target === this) {
      togglePlateCalc();
    }
  });

  // Close modal with Escape key
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      var modal = document.querySelector(".plates-form--content");
      if (modal.classList.contains("open")) {
        togglePlateCalc();
      }
    }
  });

  function toggleFractionalWeights() {
    useFractionalWeights = $("#use-fractional").is(":checked");

    // Save fractional weights preference to local storage
    if (localStorage) {
      localStorage.setItem(
        "useFractionalWeights",
        JSON.stringify(useFractionalWeights),
      );
    }

    toggleFractionalPlates();
    calculatePlateWeight();

    // Recalculate the amount if we have a current amount set
    if (currentAmount > 0) {
      recalculateAmount();
    }
  }

  function toggleFractionalPlates() {
    if (useFractionalWeights) {
      $(".fractional-plates").show();
    } else {
      $(".fractional-plates").hide();
    }
  }

  $(".plate-calc").on("change", function (e) {
    $plate = $(e.target);
    plateObject[$plate.data("plate")] = $plate[0].value;
    calculatePlateWeight();

    // Save updated plate inventory to local storage
    if (localStorage) {
      localStorage.setItem("plateWeight", JSON.stringify(plateObject));
    }

    // Recalculate the amount if we have a current amount set
    if (currentAmount > 0) {
      recalculateAmount();
    }
  });

  $(".fractional-plate-calc").on("change", function (e) {
    $plate = $(e.target);
    fractionalPlateObject[$plate.data("plate")] = $plate[0].value;
    calculatePlateWeight();

    // Save updated fractional plate inventory to local storage
    if (localStorage) {
      localStorage.setItem(
        "fractionalPlateWeight",
        JSON.stringify(fractionalPlateObject),
      );
    }

    // Recalculate the amount if we have a current amount set
    if (currentAmount > 0) {
      recalculateAmount();
    }
  });

  function calculatePlateWeight() {

    console.log($("#bar")[0]);
    bar = $("#bar")[0];
    if (!bar) { console.log("bar not found"); return; }
    var total = null,
      barWeight = bar.value * 1;

    // Calculate standard plates
    _.each(plateObject, function (value, key) {
      var weight = key * 1;
      $("#plate-" + key)[0].value = value;
      if (key === "2-5") {
        weight = 2.5;
      }
      total += weight * value;
    });

    // Calculate fractional plates if enabled
    if (useFractionalWeights) {
      _.each(fractionalPlateObject, function (value, key) {
        var weight = parseFloat(key.replace("-", "."));
        $("#fractional-plate-" + key)[0].value = value;
        total += weight * value;
      });
    }

    $("#total-available-amount-plates").text(total);
    $("#total-available-amount-all").text(total + barWeight);
    window.totalLiftAmount = total + barWeight;
    window.barWeight = barWeight;
  }

  function recalculateAmount() {
    // Trigger the weight calculation with the current amount
    if (currentAmount > 0) {
      var weight = currentAmount;

      // Check if weight exceeds available plates
      if (weight > window.totalLiftAmount) {
        $("#total-error").show();
        return false;
      } else {
        $("#total-error").hide();
      }

      // Check if weight is below minimum (bar weight)
      if (weight < window.barWeight) {
        $("#min-error").show();
        return false;
      } else {
        $("#min-error").hide();
      }

      sidePlates = [];
      getWeights(weight);
      $(".bar .left-side").html("");
      $(".bar .right-side").html("");

      _.each(sidePlates, function (plate) {
        var plateClass = "plate-" + plate.weight.toString().replace(".", "-");
        var $chip = $(".plate-chip." + plateClass),
          $barLeft = $(".bar .left-side"),
          $barRight = $(".bar .right-side");

        if (plate.multiplier > 0) {
          $chip.show();
          $chip.find(".chip-count").text(plate.multiplier);
          for (i = 0; i < plate.multiplier; i++) {
            $barLeft.append('<span class="' + plateClass + '">');
            $barRight.append('<span class="' + plateClass + '">');
          }
        } else {
          $chip.hide();
        }
      });
    }
  }

  $("#total").on("keyup", function (e, v) {
    var weight = $(e.target).val();
    currentAmount = parseFloat(weight) || 0;

    // Save the amount to local storage
    if (localStorage && currentAmount > 0) {
      localStorage.setItem("workoutAmount", currentAmount.toString());
    }

    if (weight > window.totalLiftAmount) {
      $("#total-error").show();
      return false;
    } else {
      $("#total-error").hide();
    }

    if (weight < window.barWeight) {
      $("#min-error").show();
      return false;
    } else {
      $("#min-error").hide();
    }

    sidePlates = [];
    getWeights(weight);
    $(".bar .left-side").html("");
    $(".bar .right-side").html("");

    _.each(sidePlates, function (plate) {
      var plateClass = "plate-" + plate.weight.toString().replace(".", "-");
      var $chip = $(".plate-chip." + plateClass),
        $barLeft = $(".bar .left-side"),
        $barRight = $(".bar .right-side");

      if (plate.multiplier > 0) {
        $chip.show();
        $chip.find(".chip-count").text(plate.multiplier);
        for (i = 0; i < plate.multiplier; i++) {
          $barLeft.append('<span class="' + plateClass + '">');
          $barRight.append('<span class="' + plateClass + '">');
        }
      } else {
        $chip.hide();
      }
    });
  });

  function clearAmount() {
    localStorage.removeItem("workoutAmount");
    currentAmount = 0;
    $("#total")[0].value = "";

    // Clear the bar visualization
    $(".bar .left-side").html("");
    $(".bar .right-side").html("");

    // Clear the displayed amounts
    $("#actual-amount").html("-");
    $("#amount-remain").html("-");
    $("#rounded-amount").html("-");

    // Hide all plate chips
    _.each(plates, function(plate) {
      var plateClass = "plate-" + plate.toString().replace(".", "-");
      $(".plate-chip." + plateClass).hide();
    });
    _.each(fractionalPlates, function(plate) {
      var plateClass = "plate-" + plate.toString().replace(".", "-");
      $(".plate-chip." + plateClass).hide();
    });
  }

  // Clear saved data function (optional utility)
  function clearSavedData() {
    if (localStorage) {
      localStorage.removeItem("plateWeight");
      localStorage.removeItem("fractionalPlateWeight");
      localStorage.removeItem("useFractionalWeights");
      localStorage.removeItem("workoutAmount");
    }
    clearAmount();
  }

  function getRealPlateKey(key) {
    return key.toString().replace(".", "-");
  };

  function getWeights(weight) {
    $(".bar .left-side").html("");
    $(".bar .right-side").html("");
    var plateWeight = weight - barWeight,
      sideWeight = plateWeight / 2,
      remain = sideWeight;

    // Process standard plates first
    _.each(plates, function (plate) {
      var num = 0,
        iterationPlates = null,
        plateWeightAvailable = plateObject[getRealPlateKey(plate)],
        remainder;

      if (plate <= remain && plateWeightAvailable > 0) {
        num = _.parseInt(remain / plate);
        if (num > plateWeightAvailable / 2) {
          num = plateWeightAvailable / 2;
        }
        remain -= num * plate;
      } else {
        num = 0;
      }

      iterationPlates = {
        weight: plate,
        multiplier: num,
      };
      sidePlates.push(iterationPlates);
    });

    // Process fractional plates if enabled
    if (useFractionalWeights) {
      _.each(fractionalPlates, function (plate) {
        var num = 0,
          iterationPlates = null,
          plateWeightAvailable = fractionalPlateObject[getRealPlateKey(plate)];

        if (plate <= remain && plateWeightAvailable > 0) {
          num = _.parseInt(remain / plate);
          if (num > plateWeightAvailable / 2) {
            num = plateWeightAvailable / 2;
          }
          remain -= num * plate;
        } else {
          num = 0;
        }

        iterationPlates = {
          weight: plate,
          multiplier: num,
        };
        sidePlates.push(iterationPlates);
      });
    }

    // Calculate remainder and display results
    var remainder = Math.round(remain * 2 * 100) / 100;
    if (remainder + barWeight > 0) {
      var actual = Math.round((weight - remainder) * 100) / 100;
      var amountRemainElem = $("#amount-remain")[0];
      if (amountRemainElem) {
        amountRemainElem.innerHTML = remainder;
        // Remove all classes
        amountRemainElem.className = "";
        // Add the new class based on rounded remainder
        amountRemainElem.classList.add("remainder-" + Math.floor(remainder));
      }
      $("#actual-amount").html(actual);
      if (remainder > 2) {
        $("#rounded-amount").html(Math.round((actual + 5) * 100) / 100);
      } else {
        $("#rounded-amount").html(actual);
      }
    }
  };

  // ============ Timer Monitoring ============
  // Monitor countdown timer from the Timer page and alert when complete

  var TIMER_STORAGE_KEY = 'timerState';
  var timerAudioContext = null;
  var timerCheckInterval = null;
  var timerNotificationShown = false;

  function initTimerAudio() {
    if (!timerAudioContext) {
      timerAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playTimerCompletionSound() {
    initTimerAudio();
    if (!timerAudioContext) return;

    // Play a pleasant chime sequence (same as timer page)
    var frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    var duration = 0.15;

    frequencies.forEach(function(freq, i) {
      var oscillator = timerAudioContext.createOscillator();
      var gainNode = timerAudioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(timerAudioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      var startAt = timerAudioContext.currentTime + (i * 0.15);
      gainNode.gain.setValueAtTime(0.3, startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startAt + duration);

      oscillator.start(startAt);
      oscillator.stop(startAt + duration);
    });
  }

  function showTimerNotification() {
    // Don't show multiple notifications
    if (timerNotificationShown) return;
    timerNotificationShown = true;

    // Create notification banner
    var banner = document.createElement('div');
    banner.className = 'timer-notification';
    banner.innerHTML = '<span>Timer Complete!</span><a href="./timer.html">Go to Timer</a><button class="dismiss-btn">&times;</button>';
    document.body.appendChild(banner);

    // Trigger animation
    setTimeout(function() {
      banner.classList.add('show');
    }, 10);

    // Dismiss button
    banner.querySelector('.dismiss-btn').addEventListener('click', function() {
      banner.classList.remove('show');
      setTimeout(function() {
        banner.remove();
        timerNotificationShown = false;
      }, 300);
    });

    // Auto-dismiss after 10 seconds
    setTimeout(function() {
      if (banner.parentNode) {
        banner.classList.remove('show');
        setTimeout(function() {
          if (banner.parentNode) banner.remove();
          timerNotificationShown = false;
        }, 300);
      }
    }, 10000);
  }

  function checkTimerCompletion() {
    try {
      var saved = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!saved) return;

      var state = JSON.parse(saved);
      var countdown = state.countdown;

      // Check if countdown was running
      if (countdown && countdown.isRunning && countdown.startTime > 0) {
        var elapsed = Date.now() - countdown.startTime;
        var remaining = countdown.countdownTarget - elapsed;

        if (remaining <= 0) {
          // Timer completed! Update the state and notify
          countdown.isRunning = false;
          countdown.elapsedTime = 0;

          // Save updated state
          localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));

          // Play sound and show notification
          playTimerCompletionSound();
          showTimerNotification();
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // Start monitoring timer
  function startTimerMonitoring() {
    // Check immediately
    checkTimerCompletion();

    // Then check every second
    timerCheckInterval = setInterval(checkTimerCompletion, 1000);
  }

  // Initialize timer monitoring
  startTimerMonitoring();

  return {
    getWeights,
    clearSavedData,
    recalculateAmount,
    clearAmount,
    toggleFractionalWeights,
  };
})();
