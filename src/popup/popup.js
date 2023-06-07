const inp = {
  usd: document.querySelector('#usd'),
  uah: document.querySelector('#uah'),
};
const providerOption = document.querySelector('#provider');

let rate = {
  sale: 0,
  buy: 0,
  time: 0,
};

document.querySelector('#refresh').onclick = (e) => {
  e.target.hidden = true;
  document.body.style.backgroundColor = '#CFD8DC';
  chrome.runtime.sendMessage('reloadRate', (r) => {
    location.reload();
  });
};

providerOption.onchange = (e) => {
  chrome.runtime.sendMessage(
    {
      type: 'setProvider',
      data: e.target.value,
    },
    (r) => {
      location.reload();
    },
  );
};

/**
 * Parse number from user selected text
 * @param {string} num
 * @returns {number}
 */
function toNum(num) {
  num = num
    .toString()
    .trim()
    .replace(/,/gm, '.')
    .replace(/[^\d.]|(\.)(?=\d+\.)/gm, '') // remove not . numbers and not last .
    .replace(/^\./, '0.') // .5 to 0.5
    .match(/\d+(\.\d+)?/gm)[0];

  num = parseFloat(num);
  if (isNaN(num)) {
    num = 0;
  }

  return num.toFixed(2);
}

function updInp(el) {
  let num = toNum(el.target.value);

  if (el.target.id == 'usd') {
    inp.uah.value = (num * rate.sale).toFixed(2);
  } else {
    inp.usd.value = (num / rate.buy).toFixed(2);
  }
}

/**
 * @param {string|Date|number} date
 * @returns {string}
 */
function formatDate(date) {
  let d = new Date(date);

  date.day = d.getDate();
  date.month = d.getMonth() + 1;
  date.year = d.getFullYear();

  date.hours = d.getHours();
  date.minutes = d.getMinutes();
  date.seconds = d.getSeconds();

  for (let i in date) {
    if (parseInt(date[i]) < 10) date[i] = '0' + date[i].toString();
  }

  return `${date.day}/${date.month}/${date.year} ${date.hours}:${date.minutes}:${date.seconds}`;
}

function initProvider(selectedProvider) {
  const options = providerOption.querySelectorAll('option');
  for (const option of options) {
    if (option.value == selectedProvider) {
      option.selected = true;
    }
  }
}

function init(str) {
  const dateStr = formatDate(new Date(rate.time));
  document.querySelector('#course_time').textContent = dateStr;

  //--------------------------------------------------------

  document.querySelector('#course_sale').textContent = rate.sale;
  document.querySelector('#course_buy').textContent = rate.buy;

  inp.usd.onkeyup = updInp;
  inp.uah.onkeyup = updInp;

  inp.usd.onchange = updInp;
  inp.uah.onchange = updInp;

  //--------------------------------------------------------

  // if user select price on page
  if (str != '') {
    // it's a kostyl time...
    let num = toNum(str);
    inp.usd.value = num;
    updInp({
      target: {
        value: num,
        id: 'usd',
      },
    });
  }

  inp.usd.focus();
}

chrome.runtime.sendMessage('getInfoPopup', (msg) => {
  console.log(msg);

  rate = msg.rate;

  initProvider(msg.rateProvider);

  if (Date.now() - rate.ts > msg.updateInterval) {
    document.querySelector('#course_time').style.color = 'red';
  }

  init(msg.str);
});
