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
  if (elem.nodeType == 3) {
    nodes.push(elem);
    return nodes;
  }

  let inspectText = function (node) {
    let els = node.childNodes;
    if (els) {
      for (let i = 0, n = els.length; i < n; ++i) {
        if (els[i].nodeType == 3) {
          if (els[i].textContent.trim() != '') {
            nodes.push(els[i]);
          }
        } else if (els[i].nodeType == 1) {
          let tag = els[i].tagName.toLowerCase();
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
            inspectText(els[i]);
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

function getMoney(node) {
  let textNodes = getTextNode(node);
  for (let i = 0, l = textNodes.length; i < l; i++) {
    console.log(textNodes[i].textContent);
    if (!textNodes[i].textContent.includes('грн')) {
      var newtext = processPrice(textNodes[i].textContent);
      if (textNodes[i].textContent != newtext) {
        textNodes[i].textContent = newtext;
      }
    }
  }
}

//Получаем курс
let rate = 1;

const moneyRegex = /(?:US\s+)?\$\s*([\d\.,]+)(?:\s+-\s+([\d\.,]+))?\b/gi;

let mo = new MutationObserver(function (allMutations) {
  allMutations.forEach(function (mr) {
    getMoney(mr.target);
  });
});

function init() {
  if (/c_tp=(\w{3})/gi.exec(document.cookie)[1] != 'USD') {
    alert('Змініть показ ціни із ' + /c_tp=(\w{3});/gi.exec(document.cookie)[1] + ' на USD!!!');
    scrollTo(0, 0);
    document.querySelector('#switcher-info').click();
    document
      .querySelector(
        '#nav-global > div.ng-item.ng-switcher.active > div > div > div.switcher-currency.item.util-clearfix > div > span > a',
      )
      .click();

    //document.querySelector("#nav-global > div.ng-item.ng-switcher.active > div > div > div.switcher-currency.item.util-clearfix > div > ul > li:nth-child(1) > a").click();

    //document.querySelector("#nav-global > div.ng-item.ng-switcher.active > div > div > div.switcher-btn.item.util-clearfix > button").click();
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

chrome.runtime.sendMessage('getRate', function (res) {
  rate = res.rate.sale;
  init();
});
