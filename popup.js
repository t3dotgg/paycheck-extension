const currencyDropdown = document.querySelector("#currency-dropdown");

const defaultCurrencyValue = "usd";

/**
 *
 * @returns list of currencies
 */
async function getCurrencies() {
  const response = await fetch(
    "https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies.json"
  );
  const data = await response.json();
  return data;
}

/**
 * Fetches currency codes and populates the currency dropdown.
 */
async function populateCurrencyDropdown() {
  const currencies = await getCurrencies();

  //sort the currencies alphabetically
  const sortedCurrencies = Object.entries(currencies)
    .filter((currency) => currency[1] !== "")
    .sort((a, b) => a[1].localeCompare(b[1]));

  for (const [key, value] of sortedCurrencies) {
    const option = document.createElement("option");
    option.value = key;
    option.innerText = value;
    currencyDropdown.appendChild(option);
  }
  currencyDropdown.removeAttribute("disabled");
}

/**
 * Updates the currency code in the extension's local storage
 * @param {string} currencyCode
 */
async function updateCurrency(currencyCode) {
  await chrome.storage.local.set({
    currencyCode: currencyCode,
  });
}

currencyDropdown.addEventListener("change", async (e) => {
  const selectedCurrency = e.target.value;

  await updateCurrency(selectedCurrency);
});

async function initialize() {
  await populateCurrencyDropdown();
  const selectedCurrency = await chrome.storage.local.get(["currencyCode"]);

  //Check if currency code is set in local storage.
  if (selectedCurrency?.currencyCode) {
    currencyDropdown.value = selectedCurrency.currencyCode;
  } else {
    currencyDropdown.value = defaultCurrencyValue;
  }

  await updateCurrency(currencyDropdown.value);
}
initialize();
