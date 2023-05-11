const puppeteer = require('puppeteer');
const fs = require('fs');

// りえま ID:34665 PASS:0801
// おつる ID:98676 PASS:1126

var HEADER = "";
if ( process.argv[2] == '34665' ) HEADER = "【りえまリハ予約】"; else HEADER = "【おつるリハ予約】";

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

var browser = "";
var page = "";
var ITEMs = [];

(async () => {

    try{
	const aURL = URLs[0];

	const PROXYs = JSON.parse(fs.readFileSync('../Proxy_Checker/availablePROXY.json', 'utf-8'));

	const aPROXY = PROXYs[Math.floor(Math.random()*PROXYs.length)];
	browser = await puppeteer.launch({
	    headless: true,
	    args: ['--lang=ja,en-US,en', '--disable-gpu', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--no-first-run', '--no-sandbox', '--no-zygote', '--single-process', '--proxy-server '+aPROXY['addr']+':'+aPROXY['port']],
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
	await page.goto( aURL, {timeout: 600000, waitUntil: ["load", "domcontentloaded", "networkidle0"]} );

	await DEBUG(page); process.exit(0);

	// ログイン
	await page.type('input[name="login_id"][id="loginID"]', process.argv[2]);
	await page.type('input[name="password"][id="loginPassword"]', process.argv[3]);
        await (await page.$('button[name="submit"]')).click();
	await page.waitForSelector('div.layoutMypage_index', {timeout: 600000, visible: true, waitUntil: ["domcontentloaded", "networkidle0"]} );


	// 予約内容を取り出す(2ページ分)
	var PAGENUM = [];
	if ( process.argv[2] == '34665' ) PAGENUM = ['1','2']; else PAGENUM = ['1'];
	for ( let aPAGENUM of PAGENUM ) {
	    await page.goto( 'https://2.onemorehand.jp/shinyokohama_seikeigeka_reha/reserved/index/'+aPAGENUM+'?lang=ja-JP', {timeout: 600000, waitUntil: ["load", "domcontentloaded", "networkidle0"]} );
	    if ( (await page.$$('div.layoutReserveList_main_inner')).length < 1 ) throw new Error('No Reservation found.');
	    const ELEMs = await page.$$('div.layoutReserveList_main_inner');
	    for ( let aELEM of ELEMs ) {
		const TEXT = (await (await aELEM.getProperty('textContent')).jsonValue()).replace(/[ \t\n]+/gsm, '');
		//console.log(TEXT);

		if ( TEXT.match(/セラピスト/) )
		    ITEMs.push({
			flag  : false, // 他の予約と重複していないか、のフラグ
			number: TEXT.replace(/ご予約番号([0-9\-]+).*/, '$1'),
			time  : TEXT.replace(/.+?予約日時([0-9]{4}\/[0-9]{2}\/[0-9]{2})([0-9]{2}\:[0-9]{2}).*/, '$1 $2'),
			course: TEXT.replace(/.+?選択コース(.+?)セラピスト.*/, '$1'),
			doctor: TEXT.replace(/.+?セラピスト(.+?)オプション.*/, '$1'),
			scalar: Number(TEXT.replace(/.+?予約日時([0-9]{4}).*/, '$1'))*100000000+Number(TEXT.replace(/.+?予約日時[0-9]{4}\/([0-9]{2}).*/, '$1'))*1000000+Number(TEXT.replace(/.+?予約日時[0-9]{4}\/[0-9]{2}\/([0-9]{2}).*/, '$1'))*10000+Number(TEXT.replace(/.+?予約日時[0-9]{4}\/[0-9]{2}\/[0-9]{2}([0-9]{2}).*/, '$1'))*100+Number(TEXT.replace(/.+?予約日時[0-9]{4}\/[0-9]{2}\/[0-9]{2}[0-9]{2}\:([0-9]{2}).*/, '$1')),
		    });
		else
		    ITEMs.push({
			flag  : false, // 他の予約と重複していないか、のフラグ
			number: TEXT.replace(/ご予約番号([0-9\-]+).*/, '$1'),
			time  : TEXT.replace(/.+?予約日時([0-9]{4}\/[0-9]{2}\/[0-9]{2})([0-9]{2}\:[0-9]{2}).*/, '$1 $2'),
			course: TEXT.replace(/.+?選択コース(.+?)オプション.*/, '$1'),
			doctor: '指定なし',
			scalar: Number(TEXT.replace(/.+?予約日時([0-9]{4}).*/, '$1'))*100000000+Number(TEXT.replace(/.+?予約日時[0-9]{4}\/([0-9]{2}).*/, '$1'))*1000000+Number(TEXT.replace(/.+?予約日時[0-9]{4}\/[0-9]{2}\/([0-9]{2}).*/, '$1'))*10000+Number(TEXT.replace(/.+?予約日時[0-9]{4}\/[0-9]{2}\/[0-9]{2}([0-9]{2}).*/, '$1'))*100+Number(TEXT.replace(/.+?予約日時[0-9]{4}\/[0-9]{2}\/[0-9]{2}[0-9]{2}\:([0-9]{2}).*/, '$1')),
		    });
	    }
	}

	ITEMs.sort(function(a,b){
	    const sca_a = a.scalar;
	    const sca_b = b.scalar;
	    if ( sca_a > sca_b ) return -1;
	    if ( sca_a < sca_b ) return 1;
	    return 0;
	});

	// 同じ日付の予約は行頭にシルシを付ける
	for ( let ITEM_a of ITEMs )
	    for ( let ITEM_b of ITEMs )
		if ( ITEM_a['number'] == ITEM_b['number'] ) continue; else
		    if ( Math.floor(ITEM_a['scalar'] / 10000) == Math.floor(ITEM_b['scalar'] / 10000) ) {
			ITEM_a['flag'] = true;
			ITEM_b['flag'] = true;
		    }

	//console.log(JSON.stringify(ITEMs, null, '\t'));

	// 今日よりも以前の予約は表示しない
	var curDATE = new Date();
	curDATE = curDATE.toLocaleString('ja',{ "year": "numeric","month": "2-digit","day": "2-digit","hour": "2-digit","minute": "2-digit","second": "2-digit" });
	curDATE = curDATE.replace(/[-:\/]/g, '');
	curDATE = curDATE.replace(/ .*/, '');
	curDATE = Number(curDATE) * 10000;
	//console.log(curDATE);
	var MESSAGE = "\n\n" + HEADER + '\n\n';
	for ( let aITEM of ITEMs )
	    if ( aITEM['scalar'] > curDATE )
		if ( aITEM['flag'] ) { // 日時が重複している場合
		    MESSAGE += '×日時:'+aITEM['time']+'\nコース:'+aITEM['course']+'\nセラピスト:'+aITEM['doctor']+'\n\n';
		} else {
		    MESSAGE += '日時:'+aITEM['time']+'\nコース:'+aITEM['course']+'\nセラピスト:'+aITEM['doctor']+'\n\n';
		}

	console.log(MESSAGE); // DEBUG用

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
