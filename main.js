function convertToDollars(number) {
  const processed = number * 0.000026;
  if (processed < 0.1) return processed.toFixed(5);
  return processed.toFixed(2);
}

const globalSelectors = {};
globalSelectors.postCounts = `[role="group"][id*="id__"]:only-child`;
globalSelectors.articleDate = `[role="article"][aria-labelledby*="id__"][tabindex="-1"] time`;
globalSelectors.analyticsLink = " :not(.dollarBox)>a[href*='/analytics']";
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
      const dollarSpot = dollarBox.querySelector(innerSelectors.dollarSpot)?.firstChild?.firstChild;
      dollarSpot.textContent = "$";

      // magic alignment value
      dollarSpot.style.marginTop = "-0.6rem";
    }

    // get the number of views and calculate & set the dollar amount
    const dollarBox = view.parentElement.nextSibling.firstChild;
    const viewCount = Number(view?.ariaLabel.replace(/\D/ig, ''));
    if (Number.isNaN(viewCount)) continue;
    const dollarAmountArea = dollarBox.querySelector(innerSelectors.viewAmount);
    if (dollarAmountArea) dollarAmountArea.textContent = convertToDollars(viewCount);
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
