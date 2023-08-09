function convertToRawCount(number) {
  const cleaned = number.replace(/,/g, "");
  const base = parseFloat(cleaned);
  if (number.toLowerCase().match(/k/)) {
    return Math.round(base * 1000);
  } else if (number.toLowerCase().match(/m/)) {
    return Math.round(base * 1000000);
  } else if (number.toLowerCase().match(/b/)) {
    return Math.round(base * 1000000000);
  } else {
    return base;
  }
}

function convertToDollars(number) {
  const rawCount = convertToRawCount(number);

  const processed = rawCount * 0.000026;
  if (processed < 0.1) return processed.toFixed(5);
  return processed.toFixed(2);
}

const globalSelectors = {};
globalSelectors.postCounts = `[role="group"][id*="id__"]:only-child`;
globalSelectors.viewCount = globalSelectors.postCounts + " a[href*='/analytics']";

const innerSelectors = {};
innerSelectors.dollarSpot = "div div:first-child";
innerSelectors.viewSVG = "div div:first-child svg";
innerSelectors.viewAmount = "div div:last-child span span span";

function doWork() {
  const viewCounts = Array.from(
    document.querySelectorAll(globalSelectors.viewCount)
  );

  viewCounts.map((view) => {
    // Early escape
    if (view.classList.contains("replaced")) return;

    // Make sure we don't touch this one again
    view.classList.add("replaced");

    // get parent and clone to make dollarBox
    const parent = view.parentElement;
    const dollarBox = parent.cloneNode(true);

    // insert dollarBox after view count
    parent.parentElement.insertBefore(dollarBox, parent.nextSibling);

    // Remove view count icon
    const oldIcon = dollarBox.querySelector(innerSelectors.viewSVG);
    oldIcon?.remove();

    // Get the number
    const viewCount = dollarBox.querySelector(innerSelectors.viewAmount);
    viewCount.textContent = convertToDollars(viewCount.textContent);

    // Swap the svg for a dollar sign
    const dollarSpot = dollarBox.querySelector(innerSelectors.dollarSpot)?.firstChild
      ?.firstChild;
    dollarSpot.textContent = "$";

    // Magic alignment value
    dollarSpot.style.marginTop = "-0.6rem";
  });
}

function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function () {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function () {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

// Function to start MutationObserver
const observe = () => {
  const observer = new MutationObserver((mutationsList) => {
    if (!mutationsList.length) return;

    const runDocumentMutations = throttle(async () => {
      doWork();
    }, 1000);

    runDocumentMutations();
  });

  observer.observe(document, {
    childList: true,
    subtree: true,
  });
};

observe();
