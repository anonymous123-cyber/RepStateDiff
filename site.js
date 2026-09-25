(function () {
  "use strict";

  var toast = document.getElementById("toast");
  var toastTimer;
  var emptyGif = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
  var animatedImages = Array.prototype.slice.call(document.querySelectorAll("[data-sync-image]"));
  var replayButton = document.querySelector("[data-replay-all]");
  var sourceCache = Object.create(null);
  var syncGroups = [];
  var replayBusy = false;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 3200);
  }

  function frame(callback) {
    if (window.requestAnimationFrame) window.requestAnimationFrame(callback);
    else window.setTimeout(callback, 16);
  }

  function groupFor(image) {
    return image.closest(".dataset-block") || image.closest(".visual-band") || document.body;
  }

  animatedImages.forEach(function (image) {
    var source = image.getAttribute("data-src") || image.getAttribute("src");
    if (!source || source.indexOf("data:") === 0) return;
    image.setAttribute("data-sync-source", source);
    image.setAttribute("src", emptyGif);
    image.removeAttribute("loading");
    image.classList.add("sync-pending");
    var group = groupFor(image);
    if (syncGroups.indexOf(group) === -1) {
      group._syncImages = [];
      syncGroups.push(group);
    }
    group._syncImages.push(image);
  });

  function loadSource(source) {
    if (sourceCache[source]) return sourceCache[source];
    var controller = window.AbortController ? new AbortController() : null;
    var timeout = window.setTimeout(function () {
      if (controller) controller.abort();
    }, 18000);
    sourceCache[source] = fetch(source, { cache: "force-cache", signal: controller ? controller.signal : undefined }).then(function (response) {
      if (!response.ok) throw new Error("Unable to load " + source);
      return response.blob();
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      return new Promise(function (resolve, reject) {
        var probe = new Image();
        probe.onload = function () { resolve(url); };
        probe.onerror = function () {
          URL.revokeObjectURL(url);
          reject(new Error("Unable to decode " + source));
        };
        probe.src = url;
      });
    }).catch(function (error) {
      delete sourceCache[source];
      throw error;
    }).then(function (value) {
      window.clearTimeout(timeout);
      return value;
    }, function (error) {
      window.clearTimeout(timeout);
      throw error;
    });
    return sourceCache[source];
  }

  function prepareImage(image) {
    if (image.dataset.syncUrl) return Promise.resolve(image);
    var source = image.getAttribute("data-sync-source");
    return loadSource(source).then(function (url) {
      image.dataset.syncUrl = url;
      image.classList.remove("sync-failed");
      return image;
    }).catch(function () {
      image.dataset.syncFailed = "true";
      image.classList.add("sync-failed");
      image.src = source;
      return image;
    });
  }

  function commit(images) {
    var ready = images.filter(function (image) { return image.dataset.syncUrl; });
    if (!ready.length) return Promise.resolve();
    ready.forEach(function (image) { image.classList.add("sync-pending"); });
    return new Promise(function (resolve) {
      frame(function () {
        ready.forEach(function (image) {
          image.src = image.dataset.syncUrl;
          image.classList.remove("sync-pending");
          image.dataset.syncReady = "true";
        });
        resolve();
      });
    });
  }

  function prepareGroup(group) {
    if (group._syncPromise) return group._syncPromise;
    group.classList.add("sync-loading");
    group._syncPromise = Promise.all(group._syncImages.map(prepareImage)).then(function (images) {
      return commit(images).then(function () {
        group.classList.remove("sync-loading");
        group.classList.add("sync-ready");
        return images;
      });
    });
    return group._syncPromise;
  }

  function activateGroup(group) {
    prepareGroup(group).catch(function () {
      group.classList.remove("sync-loading");
      showToast("Some views could not be synchronized; showing the original animation.");
    });
  }

  if ("IntersectionObserver" in window) {
    var groupObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          activateGroup(entry.target);
          groupObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "420px 0px" });
    syncGroups.forEach(function (group) { groupObserver.observe(group); });
  } else {
    syncGroups.forEach(activateGroup);
  }
  if (syncGroups[0]) window.setTimeout(function () { activateGroup(syncGroups[0]); }, 80);

  function replayAll() {
    if (replayBusy || !animatedImages.length) return;
    replayBusy = true;
    if (replayButton) {
      replayButton.disabled = true;
      replayButton.setAttribute("aria-busy", "true");
    }
    showToast("Preparing one synchronized replay...");
    Promise.all(syncGroups.map(prepareGroup)).then(function () {
      var ready = animatedImages.filter(function (image) { return image.dataset.syncUrl; });
      ready.forEach(function (image) {
        image.src = emptyGif;
        image.classList.add("sync-pending");
      });
      frame(function () {
        frame(function () {
          ready.forEach(function (image) {
            image.src = image.dataset.syncUrl;
            image.classList.remove("sync-pending");
          });
          showToast("All reconstruction views restarted together.");
        });
      });
    }).catch(function () {
      showToast("Replay is ready for the views that finished loading.");
    }).then(function () {
      replayBusy = false;
      if (replayButton) {
        replayButton.disabled = false;
        replayButton.removeAttribute("aria-busy");
      }
    });
  }

  if (replayButton) replayButton.addEventListener("click", replayAll);

  var sectionLinks = Array.prototype.slice.call(document.querySelectorAll(".site-nav a[href^='#']"));
  var sections = sectionLinks.map(function (link) {
    return document.querySelector(link.getAttribute("href"));
  }).filter(Boolean);
  if ("IntersectionObserver" in window && sectionLinks.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sectionLinks.forEach(function (link) {
          var active = link.getAttribute("href") === "#" + entry.target.id;
          link.classList.toggle("is-active", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-18% 0px -66% 0px" });
    sections.forEach(function (section) { sectionObserver.observe(section); });
  }

  var revealItems = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    revealItems.forEach(function (item) {
      item.classList.add("will-reveal");
      revealObserver.observe(item);
    });
  }

  document.querySelectorAll("[data-visualization-switch]").forEach(function (switcher) {
    var section = switcher.closest(".visualization-section");
    if (!section) return;
    var buttons = Array.prototype.slice.call(switcher.querySelectorAll("[data-visualization]"));
    var panels = Array.prototype.slice.call(section.querySelectorAll("[data-visualization-panel]"));
    function select(key) {
      buttons.forEach(function (button) {
        var active = button.getAttribute("data-visualization") === key;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-visualization-panel") !== key;
      });
    }
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        select(button.getAttribute("data-visualization"));
      });
    });
    if (buttons[0]) select(buttons[0].getAttribute("data-visualization"));
  });
})();
