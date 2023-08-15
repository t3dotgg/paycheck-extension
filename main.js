// Selected currency's USD value
// Defaults to USD if not specified
let currency = {
  exchangeRateToUSD: 1,
  code: "USD",
};

/**
 *
 * @param {string} currencyCode
 * @returns currency exchange rate from USD to currency.
 */
async function getExchangeRateFromUSDToCurrency(currencyCode) {
  const response = await fetch(
    `https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/usd/${currencyCode}.json`
  );
  const data = await response.json();
  return data[currencyCode];
}

/**
 * Fetches and updates the currency object with latest values.
 * @param {string} currencyCode
 */
async function updateCurrency(currencyCode) {
  const conversionRateUSD = await getExchangeRateFromUSDToCurrency(
    currencyCode
  );
  currency.code = currencyCode;
  currency.exchangeRateToUSD = conversionRateUSD;
}

chrome.storage.local.get(["currencyCode"]).then(async (result) => {
  await updateCurrency(result.currencyCode);
  // Update DOM with new changes
  doWork();
});

chrome.storage.onChanged.addListener(async (changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    switch (key) {
      case "currencyCode":
        await updateCurrency(newValue);
        // Update DOM with new changes
        doWork();
        break;
    }
  }
});

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

function getCurrencySymbolAndValue(number, currency) {
  let parts;
  let isUnrecognizedCurrency = false;
  try {
    parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.code,
    }).formatToParts(number);
  } catch (e) {
    isUnrecognizedCurrency = true;

    // If the currency is unrecognized, default to USD formatting
    parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).formatToParts(number);
  }
  let currencySymbol = "";
  let value = "";
  for (const part of parts) {
    if (part.type === "currency") {
      currencySymbol = part.value;
    } else {
      value += part.value;
    }
  }
  //remove spaces
  value.replace(/\s/g, "");

  // If currency is unrecognized, use the first letter of the currency name as the currency symbol
  if (isUnrecognizedCurrency) {
    currencySymbol = currency.code[0] + " ";
  }
  return { currencySymbol, value };
}

/**
 * Formats a number to a currency string, according to the provided currency code and options.
 * @param {number} number
 * @param {{code: string, exchangeRateToUSD: number}} currency
 * @param {{withSymbol: boolean}} options
 */
function formatCurrency(number, currency, options = { withSymbol: true }) {
  const { currencySymbol, value } = getCurrencySymbolAndValue(number, currency);
  if (options.withSymbol) {
    return `${currencySymbol}${value}`;
  } else {
    return value;
  }
}

/**
 * Gets the currency symbol for a given currency.
 * @param {string} currency
 * @returns currency symbol i.e( $, €, £, etc)
 */
function getCurrencySymbol(currency) {
  return getCurrencySymbolAndValue(0, currency).currencySymbol;
}

function convertToDollars(number) {
  const rawCount = convertToRawCount(number);

  const processed = rawCount * 0.000026;
  if (processed < 0.1) return processed.toFixed(5);
  return processed.toFixed(2);
}

function calculateValueInCurrency(USDValue, exchangeRateToUSD) {
  return USDValue * exchangeRateToUSD;
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
      clonedDateView.classList.add("__post_revenue");

      // insert clonedDateViews and clonedDateViewsTwo after the 3rd child we just cloned
      rootDateViewsSection?.insertBefore(
        clonedDateViewSeparator,
        rootDateViewsSection?.children[2].nextSibling
      );
      rootDateViewsSection?.insertBefore(
        clonedDateView,
        rootDateViewsSection?.children[3].nextSibling
      );
      // remove 'views' label
      clonedDateView.querySelector(`span`).children[1].remove();
    }

    const postRevenue = rootDateViewsSection.querySelector(".__post_revenue");
    if (postRevenue) {
      // get view count value from 'clonedDateViewsTwo'
      const viewCountValue = rootDateViewsSection?.children[2].textContent;
      const dollarAmount = convertToDollars(viewCountValue);
      const currencyValue = calculateValueInCurrency(
        dollarAmount,
        currency.exchangeRateToUSD
      );

      // replace textContent in cloned clonedDateViews (now 4th child) with converted view count value
      postRevenue.querySelector(innerSelectors.articleViewAmount).textContent =
        formatCurrency(currencyValue, currency);
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

      // remove view count icon
      const oldIcon = dollarBox.querySelector(innerSelectors.viewSVG);
      oldIcon?.remove();

      // swap the svg for a dollar sign
      const dollarSpot = dollarBox.querySelector(innerSelectors.dollarSpot)
        ?.firstChild?.firstChild;

      dollarSpot.classList.add("__post_revenue");

      const currencySymbol = getCurrencySymbol(currency);

      // limit currency symbol to 1 character to prevent overflowing
      dollarSpot.textContent = currencySymbol[0];

      // magic alignment value
      dollarSpot.style.marginTop = "-0.6rem";
    } else {
      // Update the currency symbol
      const dollarSpot =
        view.parentElement.parentElement.querySelector(".__post_revenue");
      if (dollarSpot) {
        // limit currency symbol to 1 character to prevent overflowing
        dollarSpot.textContent = getCurrencySymbol(currency)[0];
      }
    }

    // get the number of views and calculate & set the dollar amount
    const dollarBox = view.parentElement.nextSibling.firstChild;
    const viewCount = view.querySelector(
      innerSelectors.viewAmount
    )?.textContent;
    if (viewCount == undefined) continue;
    const dollarAmountArea = dollarBox.querySelector(innerSelectors.viewAmount);

    const dollarAmount = convertToDollars(viewCount);
    const currencyValue = calculateValueInCurrency(
      dollarAmount,
      currency.exchangeRateToUSD
    );

    dollarAmountArea.textContent = formatCurrency(currencyValue, currency, {
      withSymbol: false,
    });
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
