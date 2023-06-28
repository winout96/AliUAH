console.time('uahAli');

function onlyUrl(reg, part) {
  return reg.test(window.location[part || 'href']);
}

function numberFormat(num) {
  return num
    .toString()
    .replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ')
    .replace('.', ',');
}

function deDigit(str) {
  return Number(str.replace(/,/g, ''));
}

function USD2UAH(num) {
  return numberFormat((deDigit(num) * rate).toFixed(2));
}

function getTextNode(elem) {
  let nodes = [];
  const newPriceNodes = /^US \$\d+(?:\.\d+)?(?:\s\([\d\.\,]+\sгрн\))?$/i;

  if (elem.nodeType == 3) {
    nodes.push(elem);

    const elemText = elem.textContent.trim();
    if (/^\d$/.test(elemText)) {
      const parentNode = elem?.parentElement?.parentElement;
      const parentText = parentNode?.textContent;
      if (parentText && newPriceNodes.test(parentText)) {
        processNewPriceNode(parentNode);
      }
    }
    return nodes;
  }

  let inspectText = function (node) {
    let els = node.childNodes;
    if (els) {
      for (let i = 0, n = els.length; i < n; ++i) {
        const elem = els[i];
        const textContent = elem.textContent.trim();

        if (elem.nodeType == 3) {
          if (textContent !== '') {
            nodes.push(elem);
          }
        } else if (elem.nodeType == 1) {
          if (!textContent) continue;

          let tag = elem.tagName.toLowerCase();
          if (
            !(
              tag == 'textarea' ||
              tag == 'style' ||
              tag == 'script' ||
              tag == 'noscript' ||
              tag == 'code' ||
              tag == 'head'
            )
          ) {
            if (elem.childNodes.length > 2 && newPriceNodes.test(textContent)) {
              processNewPriceNode(elem);
            } else {
              inspectText(elem);
            }
          }
        }
      }
    }
  };

  inspectText(elem);

  return nodes;
}

function processPrice(str) {
  return str.replace(moneyRegex, function (str, p1, p2, offset, s) {
    //console.log(arguments);
    return (
      USD2UAH(p1) +
      (p2 != undefined ? ' - ' + USD2UAH(p2) : '') +
      ' грн ($' +
      p1 +
      (p2 != undefined ? ' - ' + p2 : '') +
      ')'
    );
  });
}

function processNewPriceNode(node) {
  const str = Array.from(node.childNodes).reduce(
    (acc, curr) => (curr.className === uahClassName ? acc : acc + curr.innerText),
    '',
  );
  const newText = ` (${str.replace(moneyRegex, function (str, p1, p2, offset, s) {
    return `${USD2UAH(p1)}${p2 != undefined ? ' - ' + USD2UAH(p2) : ''} грн`;
  })})`;

  if (node.lastElementChild.className == uahClassName) {
    textNode = node.lastElementChild.firstChild;
    textNode.textContent = newText;
  } else {
    const span = document.createElement('span');
    span.className = uahClassName;

    const textNode = document.createTextNode(newText);
    span.appendChild(textNode);

    node.appendChild(span);
  }
}

function getMoney(node) {
  let textNodes = getTextNode(node);
  for (let i = 0, l = textNodes.length; i < l; i++) {
    // console.log(textNodes[i].textContent);
    if (!textNodes[i].textContent.includes('грн')) {
      const newText = processPrice(textNodes[i].textContent);

      if (textNodes[i].textContent != newText) {
        textNodes[i].textContent = newText;
      }
    }
  }
}

//Получаем курс
let rate = 1;

const moneyRegex = /(?:US\s+)?\$\s*([\d\.,]+)(?:\s+-\s+([\d\.,]+))?\b/gi;

const uahClassName = 'uahAli__uah';

let mo = new MutationObserver(function (allMutations) {
  allMutations.forEach(function (mr) {
    getMoney(mr.target);
  });
});

function getCookieByName(name) {
  const values = document.cookie.split('; ');
  for (const item of values) {
    const pos = item.indexOf('=');
    const key = item.slice(0, pos);
    if (key === name) {
      return decodeURIComponent(item.slice(pos + 1));
    }
  }
}

function checkAndFixCurrency(recheck = false) {
  const requiredCurrencyUnit = 'USD';
  const cookiesKey = 'aep_usuc_f';

  const cookieValue = getCookieByName(cookiesKey);
  if (!cookieValue) return;

  const currencyUnit = /c_tp=(\w{3})/i.exec(document.cookie)?.[1];

  if (currencyUnit !== requiredCurrencyUnit) {
    const newValue = currencyUnit
      ? cookieValue.replace(/(c_tp)=(\w{3})/i, `$1=${requiredCurrencyUnit}`)
      : `${cookieValue}&c_tp=${requiredCurrencyUnit}`;

    const expireDate = new Date();
    expireDate.setTime(expireDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    const updatedCookie = `${cookiesKey}=${newValue}; expires=${expireDate.toGMTString()}; path=/; domain=.aliexpress.com; Secure`;
    document.cookie = updatedCookie;
    console.log(`Changed currency to ${requiredCurrencyUnit} from ${currencyUnit}`, { updatedCookie });

    setTimeout(() => checkAndFixCurrency(true), 1000);
  } else if (recheck) {
    console.log('Currency is correct', { currencyUnit });

    document.write('Currency changed, reloading...');
    setTimeout(() => location.reload(), 1500);
  }
}

function init() {
  if (/\.?aliexpress.com$/i.test(location.hostname)) {
    checkAndFixCurrency();
  }

  getMoney(document.body);

  mo.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: true,
  });

  // if (onlyUrl(/^\/item|store\/product/g, 'pathname')) {
  //   /*  document.querySelector("#j-sku-discount-price").addEventListener("DOMSubtreeModified", function (e) {
  //           getMoney(e.target);
  //       }, false);*/
  //   /* document.querySelector("#j-sku-price").addEventListener("DOMSubtreeModified", function (e) {
  //           console.dir(e);
  //       }, false);*/
  // }

  console.timeEnd('uahAli');
}

chrome.runtime.sendMessage({ type: 'getRate' }, function (res) {
  rate = res.rate.sale;
  init();
});
