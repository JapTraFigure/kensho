const puppeteer = require('puppeteer');
const fs = require('fs');

const numOfLimit = 50;

function Wait_MS (ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

// XPATHから正規表現REGを見つける 見つかればtrue、見つからなければfalse
async function checkText(localPage, XPATH, REG) {
    try {
	const PAT  = new RegExp(REG, 'ms');
	const MESS = await (await (await localPage.$(XPATH)).getProperty('outerHTML')).jsonValue();
	//console.log(MESS);
	if ( MESS.match( PAT ) )
	    return true;
	else
	    return false;
    }
    catch(e) {
	return false;
    }
}

async function CLICK(ARGV) {
    const TAB = ARGV['tab'];
    const SEL  = ARGV['sel'];
    console.log('\tclick at '+SEL);
    try {
	await TAB.evaluate((SEL) => {
	    const CL = document.querySelector(SEL);
	    CL.click();
	}, SEL);
	await Wait_MS(1500);
    }
    catch(e) {
	console.log(e);
	await DEBUG(TAB);
	process.exit(1);
    }
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

//
// givenPROXY['ip']とgivenPROXY['port']を使ってブラウザを起動する
// givenPROXYの指定なしの場合は、保存済みのプロキシPROXY_FILEを使ってブラウザを起動する
// 戻り値は、起動したブラウザと開いたタブ
//   BR: ブラウザ
//   PG: タブ
//
async function launchBrowser(givenPROXY) {
    var PROXYs = "";
    var aPROXY = "";

    if ( (givenPROXY == null) || (givenPROXY == undefined) ) {
	PROXYs = JSON.parse(fs.readFileSync('../Proxy_Checker/proxylist.json', 'utf-8'));
	aPROXY = PROXYs[Math.floor(Math.random()*PROXYs.length)];
    } else {
	aPROXY = givenPROXY;
    }
    //console.log('Browser open ... IP address: '+aPROXY['ip']+'  Port: '+aPROXY['port']);
    const browser_ = await puppeteer.launch({
	headless: true,
	//slowMo: 10,
	//executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	//args: ['--lang=ja,en-US,en', '--disable-gpu', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--no-first-run', '--no-sandbox', '--no-zygote', '--single-process', '--proxy-server='+aPROXY['ip']+':'+aPROXY['port']],
	args: ['--lang=ja,en-US,en', '--disable-gpu', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--no-first-run', '--no-sandbox', '--no-zygote', '--single-process',],
    });
    // メイン処理用のタブ
    const page_ = (await browser_.pages())[0];
    await page_.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1'); // Safari for iPhone
    await page_.setViewport({width: 1024, height: 2048});
    await page_.setRequestInterception(true);
    await page_.setCacheEnabled(true);
	    
    // 画像読み込みをスキップ
    page_.on('request', interceptedRequest => {
	if (interceptedRequest.url().endsWith('.png') || interceptedRequest.url().endsWith('.jpg') || interceptedRequest.url().endsWith('.mov') || interceptedRequest.url().endsWith('.mp4'))
	    interceptedRequest.abort();
	else
	    interceptedRequest.continue();
    });

    // 表示されたダイアログを消す
    page_.on('dialog', async dialog => {
	dialog.dismiss();
    });

    return ({BR: browser_, PG: page_});
}

// デバッグ用に、引数pageで渡されたタブのHTMLソースを出力する
async function DEBUG(page) {
    const html = await page.evaluate(() => document.body.innerHTML);
    await page.screenshot({ path: '/home/yamashita/Scripts/present_oubo/debugAll.jpg', fullPage: true });
    console.log(html);
}

//
// argUrlで指定されたURLをWAITmsでタイムアウトせずに問題なく開けるまで、別プロキシでブラウザを再起動を繰り返す
// 戻り値は、ちゃんとページが開けたときのブラウザ、タブ、HTTP statusコード
//   BR: ブラウザ
//   PG: タブ
//   ST: HTTP status
//
async function openBRuntilSuccess(argUrl, WAITms) {
    var errFlag = false;
    var HTTPstatus = "";
    var localBrowser = "";
    var localPage = "";

    do {
	await Wait_MS(3000 + Math.floor(Math.random()*3000));

	const TEMP = await launchBrowser();
	localBrowser = TEMP.BR; localPage = TEMP.PG;
	try {
	    errFlag = false;
	    HTTPstatus = await localPage.goto( argUrl, {timeout: WAITms, waitUntil: ["load", "domcontentloaded", "networkidle0"]} );
	    //console.log('http status: ' + HTTPstatus._status);
	}
	catch (e) {
	    errFlag = true;
	    //console.log(e);
	    await localPage.close();
	    await localBrowser.close();
	    console.log(argUrl + ': cannot open.');
	    continue;
	}

    	//const ALLHTML = await localPage.evaluate(() => document.body.innerHTML);
	const ALLHTML = await( await( await localPage.$('body')).getProperty('outerHTML')).jsonValue();

	if ( ALLHTML.match(/Forbidden/msg) ) {
	    errFlag = true;
	    await localPage.close();
	    await localBrowser.close();
	    console.log(argUrl + ': Forbidden access.');
	    continue;
	}
	//if ( ALLHTML.match(/captcha/msg) ) {
	//    errFlag = true;
	//    await localPage.close();
	//    await localBrowser.close();
	//    console.log(argUrl + ': reCAPTCHA detected.');
	//    continue;
	//}
	//if ( ALLHTML.match(/エラー/msg) ) {
	//    errFlag = true;
	//    await localPage.close();
	//    await localBrowser.close();
	//    console.log(argUrl + ': エラーが返されました Retry...');
	//    continue;
	//}

    } while (errFlag);
    return ({
	BR: localBrowser,
	PG: localPage,
	ST: HTTPstatus._status,
    });
}

(async () => {

    try{
	var ACCOUNTs = JSON.parse(fs.readFileSync('./ACCOUNTs.json', 'utf-8'));

	//const lastIndex = ACCOUNTs.indexOf('i.mnot.a.a.sh.i.k.odamarockbo.n@googlemail.com');
	//ACCOUNTs.splice(0,lastIndex+1);
	
	ACCOUNTs = [ 'r.ktnb.o.o@googlemail.com' ] // Only for debugging

	// プロキシの一覧を読み込む
	for ( let aMAIL of ACCOUNTs ) {
	    var errFlag1 = false;
	    var errTEXT  = '';

	    {
		const TEMP = await openBRuntilSuccess('https://www.nihonkohden.co.jp/office/honsha.html', 10000);
		localBrowser = TEMP.BR; localPage = TEMP.PG;

	    }

	    var BRA = await (await(await localPage.$('h1.title-p')).getProperty('outerHTML')).jsonValue();

	    const TBL = await localPage.$$('tr');
	    for (let i = 0; i < TBL.length; i++) {
		var ENTRY = await (await TBL[i].getProperty('outerHTML')).jsonValue();
		var ADR = await (await TBL[i].getProperty('outerHTML')).jsonValue();
		ADR = ADR.replace(/\&nbdp\;/gsm,'').replace(/<img.*/gsm,'').replace(/^.+?<br>/sm,'').replace(/.*[0-9]{3}\-[0-9]{4}<br>/sm,'').replace(/<.+?>/gsm,'');
		var NAME = await (await (await TBL[i].$('th')).getProperty('textContent')).jsonValue();
		var POST = await (await (await TBL[i].$('td')).getProperty('textContent')).jsonValue();
		POST = POST.replace(/.+?([0-9]{3}\-[0-9]{4}).*/sm,'$1');
		var TEL = await (await TBL[i].getProperty('outerHTML')).jsonValue();
		TEL = TEL.replace(/.+?<img .+?alt="TEL".+?>([0-9\(\)]+)/sm,'$1').replace(/([0-9]{1,5}\([0-9]{1,5}\)[0-9]{1,5}).*/sm,'$1');
		var FAX = await (await TBL[i].getProperty('outerHTML')).jsonValue();
		FAX = FAX.replace(/.+?<img .+?alt="FAX".+?>([0-9\(\)]+)/sm,'$1').replace(/([0-9]{1,5}\([0-9]{1,5}\)[0-9]{1,5}).*/sm,'$1');
		console.log('NAME '+NAME.replace(/[ \t]/g,'').replace(/\n/g, ''));
		console.log('ADR '+ADR.replace(/[ \t]/g,'').replace(/\n/g, ''));
		console.log('POST '+POST.replace(/[ \t]/g,'').replace(/\n/g, ''));
		console.log('TEL '+TEL.replace(/[ \t]/g,'').replace(/\n/g, ''));
		console.log('FAX '+FAX.replace(/[ \t]/g,'').replace(/\n/g, ''));
	    }

	    await DEBUG(localPage); process.exit(0);

	    //await DEBUG(localPage); process.exit(0);

	    var checkFLAG = await checkText(localPage,
				       'div#submit',
				       '送　信');

	    if ( !checkFLAG ) {
		console.log('\t'+ aMAIL + ' 応募できませんでした'); //await Wait_MS(5000); await DEBUG(localPage); process.exit(0);
		await localPage.close(); // タブを閉じる
		await localBrowser.close(); // ブラウザを閉じる
		continue; // ループの先頭からやりなおし
	    }

	    await CLICK({tab:localPage, sel:'input[value="　送　信　"]'}); await Wait_MS(3000);

	    checkFLAG = await checkText(localPage,
				       'div#msg',
				       '完了');

	    //await DEBUG(localPage); process.exit(0);

	    if ( !checkFLAG ) {
		console.log('\t'+ aMAIL + ' 応募できませんでした'); //await Wait_MS(5000); await DEBUG(localPage); process.exit(0);
		await localPage.close(); // タブを閉じる
		await localBrowser.close(); // ブラウザを閉じる
		continue; // ループの先頭からやりなおし
	    }

	    console.log('\t'+ aMAIL + ' 応募できました');

	    // タブを閉じて新しいタブを開く
	    await localPage.goto('about:blank');
	    await localPage.close();
	    await localBrowser.close();
	    await Wait_MS(13 * 60 * 1000); // 13分間ウェイト
	}
    }
    catch(e) {
	console.log(e);
    }
    finally {
	process.exit(0);
    }

})();
