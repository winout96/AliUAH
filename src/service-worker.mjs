import { Rate } from './utils/rate.mjs';

const updateInterval = 30 * 60 * 1000; // 30 min
const config = {
  rateProvider: 'privatBank',
  rate: { sale: 0, buy: 0, time: 0 },
};

async function initConfig() {
  const savedConfig = await chrome.storage.local.get(null);
  if (!Object.keys(savedConfig).length) {
    await chrome.storage.local.set(config);
  } else {
    for (let key in savedConfig) {
      config[key] = savedConfig[key];
    }
  }
}

async function updateConfig(key, value) {
  config[key] = value;
  await chrome.storage.local.set({ [key]: value });
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
  const oldRate = { ...config.rate };

  try {
    const rate = await Rate.getCurrencyUSD(config.rateProvider);

    if (rate.time !== oldRate.time) {
      updateConfig('rate', rate);
      await updateBadge(rate, oldRate);
    }

    console.debug('rate', rate);
    console.debug('oldRate', oldRate);

    return rate;
  } catch (err) {
    console.error(err);

    return oldRate;
  }
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
  await initConfig();

  const { rate } = config;

  chrome.action.setBadgeBackgroundColor({ color: [52, 73, 94, 255] });
  if (Object.keys(rate).length) chrome.action.setBadgeText({ text: toFixed(rate.sale, 2) });

  await updateRate();

  setInterval(updateRate, updateInterval);
}

init();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (typeof msg === 'string') {
    switch (msg) {
      case 'getInfoPopup': {
        getSelectedText().then((str) => {
          const { rate, rateProvider } = config;
          sendResponse({ rate, str, rateProvider, updateInterval });
        });

        break;
      }
      case 'getRate': {
        sendResponse({ rate: config.rate });
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

        updateConfig('rateProvider', rateProvider);

        updateRate().then((rate) => {
          sendResponse({ rate });
        });

        break;
      }
    }
  }
  return true;
});
