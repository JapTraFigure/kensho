const puppeteer = require('puppeteer');
const fs = require('fs');

// りえま ID:rie5181 PASS:rieko8105
// おつる ID:chizu1126 PASS:elvis1126

var HEADER = "";
if ( process.argv[2] == 'rie5181' ) HEADER = "【りえまリハ予約】"; else HEADER = "【おつるリハ予約】";

var events = require('events');
var eventEmitter = new events.EventEmitter();
eventEmitter.setMaxListeners(0);

var KEYWORDs = [];

const URLs = [ 'https://shinyoko.reserve.ne.jp/sp/index.php?history=reserve.php%3Fcates_id%3D1%26no_cache%3D1683784003%26json_flg%3D1%26cdgt%3Da8a1c7a1c03ac3c141332af0e22562ec&'];

const R_NUM = (Math.floor(Math.random()*9)+1).toString();
const UA = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.3'+R_NUM+' (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.3'+R_NUM,
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.3'+R_NUM+' (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.3'+R_NUM,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.3'+R_NUM+' (KHTML, like Gecko) Chrome/69.0.3497.100',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:6'+R_NUM+'.0) Gecko/20100101 Firefox/62.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:6'+R_NUM+'.0) Gecko/20100101 Firefox/6'+R_NUM+'.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:62.'+R_NUM+') Gecko/20100101 Firefox/62.'+R_NUM,
    'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.'+R_NUM+'; rv:11.0) like Gecko',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.1'+R_NUM+' (KHTML, like Gecko) Version/12.0 Safari/605.1.1'+R_NUM,
][Math.floor(Math.random()*8)];

function Wait_MS (ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

function WaitHuman () {
  return new Promise(resolve => setTimeout(() => resolve(), 5000+Math.floor(Math.random()*4000)));
}

// デバッグ用に、引数pageで渡されたタブのHTMLソースを出力する
async function DEBUG(page) {
    const html = await page.evaluate(() => document.body.innerHTML);
    await page.screenshot({ path: '/home/yamashita/Scripts/Seikei/debugAll.jpg', fullPage: true });
    console.log(html);
}

async function testWaitSel(ARGV) {
    var ERR_FLAG = false;
    try {
	await ARGV['tab'].waitForSelector(ARGV['sel'], {timeout: 5000, visible: true});
    }
    catch(e) {
	//console.log(e);
	ERR_FLAG = true;
	console.log('\tError! waitFor:'+ARGV['sel']);
    }
    return ERR_FLAG;
}

function Wait_MS (ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

var browser = "";
var page = "";
var ITEMs = [];

(async () => {

    try{
	const aURL = URLs[0];

	//const PROXYs = JSON.parse(fs.readFileSync('../Proxy_Checker/availablePROXY.json', 'utf-8'));
	//const aPROXY = PROXYs[Math.floor(Math.random()*PROXYs.length)];
	//browser = await puppeteer.launch({
	//    headless: true,
	//    args: ['--lang=ja,en-US,en', '--disable-gpu', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--no-first-run', '--no-sandbox', '--no-zygote', '--single-process', '--proxy-server '+aPROXY['addr']+':'+aPROXY['port']],
	//});
	browser = await puppeteer.launch({
	    headless: true,
	    args: ['--lang=ja,en-US,en', '--disable-gpu', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--no-first-run', '--no-sandbox', '--no-zygote', '--single-process']
	});
	// メイン処理用のタブ
	page = (await browser.pages())[0];
	    
	//await page.setUserAgent('Mozilla/5.0 ..');
	await page.setUserAgent(UA);
	await page.setViewport({width: 1024, height: 4096});
	await page.setRequestInterception(true);
	await page.setCacheEnabled(true);

	// 画像読み込みをスキップ
	page.on('request', interceptedRequest => {
	    if (interceptedRequest.url().endsWith('.png') || interceptedRequest.url().endsWith('.jpg') || interceptedRequest.url().endsWith('.mov') || interceptedRequest.url().endsWith('.mp4'))
	    	interceptedRequest.abort();
	    else
	    	interceptedRequest.continue();
	});

	page.on('dialog', async dialog => {
	    dialog.dismiss();
	});

	// 予約サイトをオープン
	await page.goto( aURL, {timeout: 6000, waitUntil: ["load", "domcontentloaded", "networkidle0"]} );

	// ログイン
	await page.type('input[id="multi_loginid[0]"][name="multi_loginid[0]"]', process.argv[2]);
	await page.type('input[id="multi_password[0]"][name="multi_password[0]"]', process.argv[3]);
        await (await page.$('input[id="next_button_login"][value=" 次へ "]')).click();
	//await Wait_MS(5000);

	var SEL = 'input[id="next_button_menu"][value=" 次へ "]';
	var ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
	if ( !ERR_FLAG2 ) {
	    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
	    await (await page.$(SEL)).click();
	}
	SEL = 'input.input_nextbutton[id="next_button_change"][value=" 次へ "]';
	ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
	if ( !ERR_FLAG2 ) { // 予約がすでにとってある場合
	    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
	    await (await page.$(SEL)).click();
	}
	await Wait_MS(3000);
	
	// 長谷川先生を選択
	SEL = 'label[upper_mm_id="nomi_7"]';
	ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
	if ( !ERR_FLAG2 ) {
	    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
	    await (await page.$(SEL)).click();
	}
	await Wait_MS(3000)
	SEL = 'input[id="next_button_menu"][value=" 次へ "]';
	ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
	if ( !ERR_FLAG2 ) {
	    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
	    await (await page.$(SEL)).click();
	}
	await Wait_MS(3000)


	// 同意する
	SEL = 'input[id="next_button_option"][value=" 次へ "]';
	ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
	if ( !ERR_FLAG2 ) {
	    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
	    await (await page.$(SEL)).click();
	}
	await Wait_MS(3000)
	
	// 次の週
	SEL = 'span.calendar-next-week';
	ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
	if ( !ERR_FLAG2 ) {
	    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
	    await (await page.$(SEL)).click();
	}
	await Wait_MS(3000)

	// もう一回、次の週
	SEL = 'span.calendar-next-week';
	ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
	if ( !ERR_FLAG2 ) {
	    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
	    await (await page.$(SEL)).click();
	}
	await Wait_MS(3000)

	//await Wait_MS(3000); await DEBUG(page); process.exit(0);

	// 予約可能な時間を集める
	SEL = 'td.td-calendar-empty';
	ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
	if ( !ERR_FLAG2 ) {
	    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
	} else {
	    console.log('予約可能な時間がありませんでした');
	    process.exit(0);
	}

	SEL = 'td.td-calendar-empty';
	var RLISTs = await page.$$(SEL);
	var RFLAG = true; // 予約できなかったフラグ
	var MESS = ""; // 予約できた時間を表示するためのテキストを格納
	for (let i = 0; i < RLISTs.length; i++) {
	    //var TIME = await (await RLISTs[i].getProperty('rtime')).jsonValue();
	    var TIME = await (await RLISTs[i].getProperty('outerHTML')).jsonValue();
	    TIME = TIME.replace(/.*rtime=\"/, '').replace(/([0-9]+\:[0-9]+\:[0-9]+).*/, '$1');
	    console.log('rtime: ' + TIME);
	    if (TIME.match(/15:00:00/)) {
		await (await RLISTs[i].$('span')).click();
		await Wait_MS(3000);
		// 予約してよろしいですか
		SEL = 'span[id="confirm_inbox_yes"]';
		ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		if ( !ERR_FLAG2 ) {
		    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
		    await (await page.$(SEL)).click();
		    await Wait_MS(3000);

		    // 予約をお取りしました
		    SEL = 'span[id="alert_inbox_close"]';
		    ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		    if ( !ERR_FLAG2 ) {
			await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
			await (await page.$(SEL)).click();
			MESS = MESS + TIME + 'を予約しました\n';
		    } 
		} else {
		    // 一日に複数の予約はご遠慮ください
		    SEL = 'span[id="alert_inbox_close"]';
		    ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		    if ( !ERR_FLAG2 ) {
			await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
			await (await page.$(SEL)).click();
		    } 
		}
		await Wait_MS(3000);
		RFLAG = false; break; }
	    else if (TIME.match(/14:40:00/)) {
		await (await RLISTs[i].$('span')).click();
		await Wait_MS(3000);
		// 予約してよろしいですか
		SEL = 'span[id="confirm_inbox_yes"]';
		ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		if ( !ERR_FLAG2 ) {
		    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
		    await (await page.$(SEL)).click();
		    await Wait_MS(3000);

		    // 予約をお取りしました
		    SEL = 'span[id="alert_inbox_close"]';
		    ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		    if ( !ERR_FLAG2 ) {
			await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
			await (await page.$(SEL)).click();
			MESS = MESS + TIME + 'を予約しました\n';
		    } 
		} else {
		    // 一日に複数の予約はご遠慮ください
		    SEL = 'span[id="alert_inbox_close"]';
		    ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		    if ( !ERR_FLAG2 ) {
			await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
			await (await page.$(SEL)).click();
		    } 
		}
		await Wait_MS(3000);
		RFLAG = false; break; }
	    else if (TIME.match(/15:20:00/)) {
		await (await RLISTs[i].$('span')).click();
		await Wait_MS(3000);
		// 予約してよろしいですか
		SEL = 'span[id="confirm_inbox_yes"]';
		ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		if ( !ERR_FLAG2 ) {
		    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
		    await (await page.$(SEL)).click();
		    await Wait_MS(3000);

		    // 予約をお取りしました
		    SEL = 'span[id="alert_inbox_close"]';
		    ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		    if ( !ERR_FLAG2 ) {
			await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
			await (await page.$(SEL)).click();
			MESS = MESS + TIME + 'を予約しました\n';
		    } 
		} else {
		    // 一日に複数の予約はご遠慮ください
		    SEL = 'span[id="alert_inbox_close"]';
		    ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		    if ( !ERR_FLAG2 ) {
			await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
			await (await page.$(SEL)).click();
		    } 
		}
		await Wait_MS(3000);
		RFLAG = false; break; }
	    else if (TIME.match(/14:20:00/)) {
		await (await RLISTs[i].$('span')).click();
		await Wait_MS(3000);
		// 予約してよろしいですか
		SEL = 'span[id="confirm_inbox_yes"]';
		ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		if ( !ERR_FLAG2 ) {
		    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
		    await (await page.$(SEL)).click();
		    await Wait_MS(3000);

		    // 予約をお取りしました
		    SEL = 'span[id="alert_inbox_close"]';
		    ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		    if ( !ERR_FLAG2 ) {
			await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
			await (await page.$(SEL)).click();
			MESS = MESS + TIME + 'を予約しました\n';
		    } 
		} else {
		    // 一日に複数の予約はご遠慮ください
		    SEL = 'span[id="alert_inbox_close"]';
		    ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		    if ( !ERR_FLAG2 ) {
			await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
			await (await page.$(SEL)).click();
		    } 
		}
		await Wait_MS(3000);
		RFLAG = false; break; }
	    else if (TIME.match(/15:40:00/)) {
		await (await RLISTs[i].$('span')).click();
		await Wait_MS(3000);
		// 予約してよろしいですか
		SEL = 'span[id="confirm_inbox_yes"]';
		ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		if ( !ERR_FLAG2 ) {
		    await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
		    await (await page.$(SEL)).click();
		    await Wait_MS(3000);

		    // 予約をお取りしました
		    SEL = 'span[id="alert_inbox_close"]';
		    ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		    if ( !ERR_FLAG2 ) {
			await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
			await (await page.$(SEL)).click();
			MESS = MESS + TIME + 'を予約しました\n';
		    } 
		} else {
		    // 一日に複数の予約はご遠慮ください
		    SEL = 'span[id="alert_inbox_close"]';
		    ERR_FLAG2 = await testWaitSel({tab:page, sel:SEL});
		    if ( !ERR_FLAG2 ) {
			await page.waitForSelector(SEL, {timeout: 5000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );
			await (await page.$(SEL)).click();
		    } 
		}
		await Wait_MS(3000);
		RFLAG = false; break; }
	}
	//if ( RFLAG ) { console.log('予約しようとした時間に空きがありませんでした'); process.exit(0); }
	
	if ( MESS.match(/.+?/) ) {
	    console.log(MESS);
	} else {
	    console.log('予約できませんでした');
	}

	await Wait_MS(3000); await DEBUG(page); process.exit(0);
	
	// LINE Notifyで自分に投稿
	const EXECSYNC = require('child_process').execSync;
	const COMM_Y = 'curl -X POST -H "Authorization: Bearer QL0uzKrFknF3Bd1l2dhi1D0s4ySkng7FAEPOkaIlvT5" -F "message='+MESSAGE+'" https://notify-api.line.me/api/notify'; // やましにLINE Notify
	const COMM_R = 'curl -X POST -H "Authorization: Bearer 4Up7AS7DXSXjy0HkDyrQvksg8f9tMhzvp5NKHWXIH2C" -F "message='+MESSAGE+'" https://notify-api.line.me/api/notify'; // りえまにLINE Notify
	EXECSYNC(COMM_Y);
	EXECSYNC(COMM_R);

    }
    catch(e) {
	console.log(e);

	console.log('User Agent: '+UA);
    	html = await page.evaluate(() => document.body.innerHTML);
	console.log('---- page\n' + html);
	await page.screenshot({ path: '/home/yamashita/Scripts/Seikei/debugAll.jpg', fullPage: true });
    }
    finally {
	await browser.close();
    }

})();
