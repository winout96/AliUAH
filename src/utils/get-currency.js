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

const providers = {
  privatBank: getPrivatBankCurrencies,
  monoBank: getMonoBankCurrencies,
};

/**
 * @param {string} provider
 * @returns {Promise<{sale: number, buy: number}>}
 */
export const getCurrencyUSD = async (provider) => {
  if (!providers[provider]) {
    throw new Error(`Provider "${provider}" is not supported`);
  }

  const currency = await providers[provider]();

  return currency;
};
