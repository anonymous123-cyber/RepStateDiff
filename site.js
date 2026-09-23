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

  var codeLink = document.getElementById("code-link");
  if (codeLink) {
    codeLink.addEventListener("click", function (event) {
      if (codeLink.href.indexOf("ANONYMOUS") !== -1) {
        event.preventDefault();
        showToast("Replace the placeholder repository URL before publishing.");
      }
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
    showToast("All qualitative views restarted together.");
  }

  if (replayButton) {
    replayButton.addEventListener("click", replayAll);
  }
})();
