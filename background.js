'use strict';
let
	rate = (localStorage.rate != undefined && JSON.parse(localStorage.rate)) || {},
	updInterval = 30 * 60 * 1000; // min, sec, ms;

chrome.browserAction.setBadgeBackgroundColor({color: [52, 73, 94, 255]});
if (Object.keys(rate).length)
	chrome.browserAction.setBadgeText({text: rate.sale.toFixed(2).toString() });

function updRate(forceUpdate) {
	let emptyRate = !Object.keys(rate).length;

	if (forceUpdate || emptyRate || +new Date() - rate.time > updInterval) {
		return new Promise((resolve, reject) => {
			let xhr = new XMLHttpRequest;
			xhr.open('GET', 'https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=11', true);
			xhr.responseType = 'json';

			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					if (xhr.status == 200) {
						// console.log(xhr.response[0]);
						let old = Object.assign({}, rate);
						let usd = xhr.response.find((item) => {
							return item.ccy == 'USD';
						});

						rate = {};
						rate.sale = Number(usd.sale);
						rate.buy  = Number(usd.buy);
						rate.time = +new Date();

						localStorage.rate = JSON.stringify(rate);

						if (!emptyRate && old.sale != rate.sale) {
							let color;

							if (rate.sale > old.sale) {
								color = [204, 51, 51, 255];
							} else {
								color = [52, 152, 219, 255];
							}
							chrome.browserAction.setBadgeBackgroundColor({color: color});
						}

						chrome.browserAction.setBadgeText({text: rate.sale.toFixed(2).toString() });
						resolve();
					} else {
						reject();
					}
				}
			};

			xhr.send(null);
		});
	}
}

updRate();
setInterval(updRate, 1000);

function getText() {
	return new Promise((resolve, reject) => {
		chrome.tabs.query({
				active: true,
				windowType: 'normal',
				url: '*://*/*'
			},
			tab => {
				let tabId = (tab[0] ? tab[0].id : 0);
				if (tabId > 0) {
					resolve(tabId);
				} else {
					reject();
				}
			}
		);
	}).then(
		tabId => {
			return new Promise((_resolve) => {
				chrome.tabs.executeScript(tabId, {
						code: 'window.getSelection().toString()'
					},
					str => _resolve(str)
				);
			});
		}
	).then(
		str => str[0].trim(),
		() => ''
	);
}

chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
	switch (msg) {
		case 'getInfoPopup':
			getText().then(
				str => sendResponse({rate, str, updInterval})
			);
			// console.log({str, rate, updInterval});
			break;
		case 'getRate':
			sendResponse({rate});
			break;
		case 'reloadRate':
			updRate(true).then(() => sendResponse({rate}) );
			break;
	}
    return true;
});