(function () {
  "use strict";

  var toast = document.getElementById("toast");
  var toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2600);
  }

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

  var animatedImages = Array.prototype.slice.call(document.querySelectorAll("[data-sync-image]"));
  var replayButton = document.querySelector("[data-replay-all]");

  function replayAll() {
    var stamp = Date.now();
    animatedImages.forEach(function (image, index) {
      var source = image.getAttribute("data-src");
      image.src = source + "?sync=" + stamp + "-" + index;
    });
    showToast("All reconstruction views restarted together.");
  }

  if (replayButton) {
    replayButton.addEventListener("click", replayAll);
  }
})();
