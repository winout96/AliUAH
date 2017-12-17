const
	ts   = +new Date(),
	inp  = {
		usd: document.querySelector('#usd'),
		uah: document.querySelector('#uah')
	};

let rate = {};
document.querySelector('#refresh').onclick = (e) => {
	e.target.hidden = true;
	document.body.style.backgroundColor="#CFD8DC";
	chrome.runtime.sendMessage('reloadRate', (r) => {
		location.reload();
	});
}


/* TODO
при изменении курса - оповещение popup и обновление
chrome.runtime.onMessage.addListener(function(msg, _, sendResponse) {
	log('Got message from background page: ' + msg);
});*/

function toNum(num) {
	num = num.toString()
		.trim()
		.replace(',', '.')
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

function init (str) {
	let d = new Date(rate.time), date = {}, tm;

	date.day = d.getDate();
	date.month = d.getMonth() + 1;
	date.year = d.getFullYear();

	date.hours = d.getHours();
	date.minutes = d.getMinutes();
	date.seconds = d.getSeconds();

	for (let i in date){
		if (parseInt(date[i]) < 10)
			date[i] = '0' + date[i].toString();
	}

	tm = date.day +'/'+ date.month +'/'+ date.year +' '+ date.hours +':'+ date.minutes +':'+ date.seconds;
	document.querySelector('#course_time').textContent = tm;

	//--------------------------------------------------------

	document.querySelector('#course_sale').textContent = rate.sale;
	document.querySelector('#course_buy').textContent = rate.buy;

	inp.usd.onkeyup = updInp;
	inp.uah.onkeyup = updInp;

	inp.usd.onchange = updInp;
	inp.uah.onchange = updInp;

	//--------------------------------------------------------

	if (str != '') {// it's a kostyl time...
		let num = toNum(str);
		inp.usd.value = num;
		updInp({
			target: {
				value: num,
				id: 'usd'
			}
		});
	}

}

chrome.runtime.sendMessage('getInfoPopup', msg => {
	rate = msg.rate;

	if (!rate) {
		let txt = 'Нет информации по курсу валют';
		alert(txt);
		throw new Error(txt);
	}

	if (ts - rate.ts > msg.updInterval) {
		document.querySelector('#course_time').style.color = 'red';
	}
	init(msg.str);
});