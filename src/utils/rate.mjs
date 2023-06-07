export class Rate {
  static #providers = {
    privatBank: Rate.#getPrivatBankCurrencies,
    monoBank: Rate.#getMonoBankCurrencies,
  };
  static #cache = {
    privatBank: null,
    monoBank: null,
  };

  static async getCurrencyUSD(provider) {
    if (!Rate.#providers[provider]) {
      throw new Error(`Provider "${provider}" is not supported`);
    }

    if (!Rate.#cache[provider] || Date.now() - Rate.#cache[provider].time > 1000 * 60 * 3) {
      const rate = await Rate.#providers[provider]();
      rate.time = Date.now();

      Rate.#cache[provider] = rate;
    }

    return Rate.#cache[provider];
  }

  static async #getPrivatBankCurrencies(ccy = 'USD') {
    const response = await fetch('https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=11');
    const data = await response.json();

    const usd = data.find((item) => item.ccy == ccy);

    const rate = {
      sale: Number(usd.sale),
      buy: Number(usd.buy),
    };

    return rate;
  }

  static async #getMonoBankCurrencies() {
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
  }
}
