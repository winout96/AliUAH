const updateInterval = 30 * 60 * 1000; // 30 min
const rateConfig = {
  rate: { sale: 0, buy: 0 },
  lastUpdateRate: 0,
};
let rateProvider = 'privatBank';

const getPrivatBankCurrencies = async (ccy = 'USD') => {
  const response = await fetch('https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=11');
  const data = await response.json();

  const usd = data.find((item) => item.ccy == ccy);

  const rate = {
    sale: Number(usd.sale),
    buy: Number(usd.buy),
  };

  return rate;
};

const getMonoBankCurrencies = async () => {
  const response = await fetch('https://api.monobank.ua/bank/currency');
  const data = await response.json();

  // 980 - UAH
  // 840 - USD

  const usd = data.find((item) => item.currencyCodeA === 840 && item.currencyCodeB === 980);

  const rate = {
    sale: Number(usd.rateSell),
    buy: Number(usd.rateBuy),
  };

  return rate;
};

/**
 * @param {string} provider
 * @returns {Promise<{sale: number, buy: number}>}
 */
const getCurrencyUSD = async (provider) => {
  const providers = {
    privatBank: getPrivatBankCurrencies,
    monoBank: getMonoBankCurrencies,
  };

  if (!providers[provider]) {
    throw new Error(`Provider "${provider}" is not supported`);
  }

  const currency = await providers[provider]();

  return currency;
};

async function initConfig() {
  const config = await chrome.storage.local.get(null);
  if (!Object.keys(config).length) {
    const defaultConfig = {
      rateProvider: rateProvider,
      rate: { sale: 0, buy: 0 },
      lastUpdateRate: 0,
    };
    await chrome.storage.local.set(defaultConfig);

    return defaultConfig;
  }

  rateConfig.rate = config.rate;
  rateConfig.lastUpdateRate = config.lastUpdateRate;
  rateProvider = config.rateProvider;

  return config;
}

/**
 * @param {string|number} value
 * @param {number} precision
 * @returns {string}
 */
function toFixed(value, precision) {
  if (precision < 1) {
    throw new Error('Precision must be grather than 1');
  }

  let [integer, fractional = '0'] = value.toString().split('.');

  fractional = fractional.slice(0, precision).padEnd(precision, '0');

  return `${integer}.${fractional}`;
}

async function updateRate() {
  const { rateProvider, rate: oldRate } = await initConfig();
  const rate = await getCurrencyUSD(rateProvider);

  await chrome.storage.local.set({ rate, lastUpdateRate: Date.now() });

  rateConfig.rate = rate;
  rateConfig.lastUpdateRate = Date.now();

  console.log('rate', rate);
  console.log('oldRate', oldRate);

  await updateBadge(rate, oldRate);

  return rate;
}

async function updateBadge(newRate, oldRate) {
  const { sale: newSale } = newRate;
  const { sale: oldSale } = oldRate;

  if (newSale === oldSale) {
    return;
  }

  chrome.action.setBadgeBackgroundColor({
    color: newSale > oldSale ? [204, 51, 51, 255] : [52, 152, 219, 255],
  });
  chrome.action.setBadgeText({ text: toFixed(newSale, 2) });
}

async function getCurrentTab() {
  const queryOptions = { active: true, currentWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

function getSelectedTextContentScript() {
  return window.getSelection().toString();
}

async function getSelectedText() {
  const tab = await getCurrentTab();
  if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
    return '';
  }

  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: getSelectedTextContentScript,
  });

  const text = result?.[0]?.result.trim() ?? '';

  return text;
}

async function init() {
  const { rate, lastUpdateRate } = await initConfig();

  chrome.action.setBadgeBackgroundColor({ color: [52, 73, 94, 255] });
  if (Object.keys(rate).length) chrome.action.setBadgeText({ text: toFixed(rate.sale, 2) });

  if (!rate?.sale || !lastUpdateRate || Date.now() - lastUpdateRate > updateInterval) {
    await updateRate();
  }

  setInterval(updateRate, updateInterval);
}

init();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (typeof msg === 'string') {
    switch (msg) {
      case 'getInfoPopup': {
        const { rate, lastUpdateRate } = rateConfig;
        getSelectedText().then((str) => {
          sendResponse({ rate, str, lastUpdateRate, rateProvider });
        });
        break;
      }
      case 'getRate': {
        const { rate } = rateConfig;
        sendResponse({ rate });
        break;
      }
      case 'reloadRate': {
        updateRate().then((rate) => {
          sendResponse({ rate });
        });
        break;
      }
    }
  } else {
    switch (msg.type) {
      case 'setProvider': {
        const { data: rateProvider } = msg;
        chrome.storage.local.set({ rateProvider });
        updateRate().then((rate) => {
          sendResponse({ rate });
        });

        break;
      }
    }
  }
  return true;
});
