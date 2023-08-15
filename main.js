function convertToRawCount(internationalInputString) {
  const numberPattern = /([\d,.]+)([kmb]*)/i;
  const matches = internationalInputString.match(numberPattern);

  if (!matches) {
    return NaN; // Return NaN if the input doesn't match the expected pattern
  }

  const numericPart = matches[1];
  const multiplier = matches[2].toLowerCase();

  let numericValue;

  const lastChars = [
    numericPart.slice(-1),
    numericPart.slice(-2, -1),
    numericPart.slice(-3, -2),
  ];

  // Check if second or third to last character are , or . to handle international numbers
  if (lastChars.includes(".") || lastChars.includes(",")) {
    const parts = numericPart.replace(",", ".").split(".");
    const integerPart = parts[0].replace(/[,]/g, "");
    const decimalPart = parts[1] ? parts[1] : "0";
    numericValue = parseFloat(integerPart + "." + decimalPart);
  } else {
    numericValue = parseFloat(numericPart.replaceAll(",", ""));
  }

  let factor = 1;

  switch (multiplier) {
    case "k":
      factor = 1000;
      break;
    case "m":
      factor = 1000000;
      break;
    case "b":
      factor = 1000000000;
      break;
  }

  return Math.round(numericValue * factor);
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
globalSelectors.analyticsLink = " :not(.dollarBox)>a[href*='/analytics']";
globalSelectors.viewCount =
  globalSelectors.postCounts + globalSelectors.analyticsLink;

const innerSelectors = {};
innerSelectors.dollarSpot = "div div:first-child";
innerSelectors.viewSVG = "div div:first-child svg";
innerSelectors.viewAmount = "div div:last-child span span span";
innerSelectors.articleViewAmount = "span div:first-child span span span";

const colorPaycheck = "255, 122, 0";

function doWork() {
  const viewCounts = Array.from(
    document.querySelectorAll(globalSelectors.viewCount)
  );

  const articleViewDateSection = document.querySelector(
    globalSelectors.articleDate
  );

  if (articleViewDateSection) {
    let rootDateViewsSection =
      articleViewDateSection.parentElement.parentElement.parentElement;

    if (rootDateViewsSection?.children.length === 1) {
      // we're dealing with the <time> element on a quote retweet
      // do globalSelector query again but with 2nd result
      rootDateViewsSection = document.querySelectorAll(
        globalSelectors.articleDate
      )[1].parentElement.parentElement.parentElement;
    }

    // if there are more than 4, we already added the paycheck value
    if (rootDateViewsSection?.children.length < 4) {
      // clone 2nd and 3rd child of rootDateViewsSection
      const clonedDateViewSeparator =
        rootDateViewsSection?.children[1].cloneNode(true);
      const clonedDateView = rootDateViewsSection?.children[2].cloneNode(true);

      // insert clonedDateViews and clonedDateViewsTwo after the 3rd child we just cloned
      rootDateViewsSection?.insertBefore(
        clonedDateViewSeparator,
        rootDateViewsSection?.children[2].nextSibling
      );
      rootDateViewsSection?.insertBefore(
        clonedDateView,
        rootDateViewsSection?.children[3].nextSibling
      );

      // get view count value from 'clonedDateViewsTwo'
      const viewCountValue = clonedDateView?.querySelector(
        innerSelectors.articleViewAmount
      )?.textContent;
      const dollarAmount = convertToDollars(viewCountValue);

      // replace textContent in cloned clonedDateViews (now 4th child) with converted view count value
      clonedDateView.querySelector(
        innerSelectors.articleViewAmount
      ).textContent = "$" + dollarAmount;

      // remove 'views' label
      clonedDateView.querySelector(`span`).children[1].remove();
    }
  }

  for (const view of viewCounts) {
    // only add the dollar box once
    if (!view.classList.contains("replaced")) {
      // make sure we don't touch this one again
      view.classList.add("replaced");

      // get parent and clone to make dollarBox
      const parent = view.parentElement;
      const dollarBox = parent.cloneNode(true);
      dollarBox.classList.add("dollarBox");

      // insert dollarBox after view count
      parent.parentElement.insertBefore(dollarBox, parent.nextSibling);

      const oldIcon = dollarBox.querySelector(innerSelectors.viewSVG);

      oldIcon.style.transition = "color 0.2s";

      // magic alignment value
      oldIcon.style.marginBottom = "-0.25rem";
      // replace svg content with dollar sign
      oldIcon.innerHTML = `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="1.5rem">$</text>`;

      const dollarSpot = dollarBox.querySelector(innerSelectors.dollarSpot)
        ?.firstChild?.firstChild;
      dollarSpot.style.transition = "color 0.2s, background-color 0.2s";

      // mimick the platform hover colors transition
      dollarBox.onmouseover = () => {
        oldIcon.style.color = `rgb(${colorPaycheck})`;
        dollarSpot.style.backgroundColor = `rgb(${colorPaycheck}, 0.1)`;

        dollarAmountArea.style.color = `rgb(${colorPaycheck})`;
      };

      dollarBox.onmouseout = () => {
        oldIcon.style.color = "";
        dollarSpot.style.backgroundColor = "";

        dollarAmountArea.style.color = "";
      };
    }

    // get the number of views and calculate & set the dollar amount
    const dollarBox = view.parentElement.nextSibling.firstChild;
    const viewCount = view.querySelector(
      innerSelectors.viewAmount
    )?.textContent;
    if (viewCount == undefined) continue;
    const dollarAmountArea = dollarBox.querySelector(innerSelectors.viewAmount);
    dollarAmountArea.textContent = convertToDollars(viewCount);

    dollarAmountArea.style.transition =
      "color 0.2s ease, background-color 0.2s ease";
  }
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
  const runDocumentMutations = throttle(() => {
    requestAnimationFrame(doWork);
  }, 1000);

  const observer = new MutationObserver((mutationsList) => {
    if (!mutationsList.length) return;
    runDocumentMutations();
  });

  observer.observe(document, {
    childList: true,
    subtree: true,
  });
};

observe();
