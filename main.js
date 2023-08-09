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
globalSelectors.articleDate = `[role="article"][aria-labelledby*="id__"][tabindex="-1"] time`;
globalSelectors.analyticsLink = " a[href*='/analytics']";
globalSelectors.viewCount = globalSelectors.postCounts + globalSelectors.analyticsLink;

const innerSelectors = {};
innerSelectors.dollarSpot = "div div:first-child";
innerSelectors.viewSVG = "div div:first-child svg";
innerSelectors.viewAmount = "div div:last-child span span span";
innerSelectors.articleViewAmount = "span div:first-child span span span";

function doWork() {
  const viewCounts = Array.from(
    document.querySelectorAll(globalSelectors.viewCount)
  );

  const articleViewDateSection = document.querySelector(globalSelectors.articleDate);

  if(articleViewDateSection) {
    let rootDateViewsSection = articleViewDateSection.parentElement.parentElement.parentElement;

    if(rootDateViewsSection?.children.length === 1) {
      // we're dealing with the <time> element on a quote retweet
      // do globalSelector query again but with 2nd result
      rootDateViewsSection = document.querySelectorAll(globalSelectors.articleDate)[1].parentElement.parentElement.parentElement;
    }

    // if there are more than 4, we already added the paycheck value
    if(rootDateViewsSection?.children.length < 4) {

      // clone 2nd and 3rd child of rootDateViewsSection
      const clonedDateViewSeparator = rootDateViewsSection?.children[1].cloneNode(true);
      const clonedDateView = rootDateViewsSection?.children[2].cloneNode(true);

      // insert clonedDateViews and clonedDateViewsTwo after the 3rd child we just cloned
      rootDateViewsSection?.insertBefore(clonedDateViewSeparator, rootDateViewsSection?.children[2].nextSibling);
      rootDateViewsSection?.insertBefore(clonedDateView, rootDateViewsSection?.children[3].nextSibling);

      // get view count value from 'clonedDateViewsTwo'
      const viewCountValue = clonedDateView?.querySelector(innerSelectors.articleViewAmount)?.textContent;
      const dollarAmount = convertToDollars(viewCountValue);

      // replace textContent in cloned clonedDateViews (now 4th child) with converted view count value
      clonedDateView.querySelector(innerSelectors.articleViewAmount).textContent = "$" + dollarAmount;

      // remove 'views' label
      clonedDateView.querySelector(`span`).children[1].remove()
    }
  }

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

// If a console error is thrown an alert is made to allow the user to report it.
// Override the default console.error method to capture errors
const originalConsoleError = console.error;
console.error = function(...args) {
  // Call the original console.error method
  originalConsoleError.apply(console, args);
  // Display an alert to the user
  alert('An error occurred. Please try again or contact support.');
};


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
