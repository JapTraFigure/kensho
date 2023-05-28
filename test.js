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

	const lastIndex = ACCOUNTs.indexOf('i.mnot.a.a.sh.i.k.odamarockbo.n@googlemail.com');
	ACCOUNTs.splice(0,lastIndex+1);
	
	//ACCOUNTs = [ 'r.ktnb.o.o@googlemail.com' ] // Only for debugging

	// プロキシの一覧を読み込む
	for ( let aMAIL of ACCOUNTs ) {
	    const aPASS = "2804asd2804asd";
	    const RAND1 = Math.floor( Math.random() * 10 );
	    const RAND2 = Math.floor( Math.random() * 6 );
	    const aKANJI_1ST = ['Ш','山','Щ'][Math.floor(Math.random()*3)]+['下','ト','Ｔ','Τ'][Math.floor(Math.random()*4)];
	    const aKANA_1ST  = ['ヤマシ', 'ヤマシモ', 'ヤマシタ','ヤアシ', 'ヤアシモ', 'ヤアシタ','ヤマノシタ','ヤマノツタ','ヤヌノシタ','ヤヌノツタ'][RAND1];
	    const aKANAH_1ST  = ['やまし', 'やましも', 'やました','やめし','やめしも','やめした','やものした','やまのした','やめのした','やみのした'][RAND1];
	    const aKANJI_2ND = ['康','泰','芳','保','靖','恭','安','寧','健'][Math.floor(Math.random()*9)]+['朋','暁','彰','昭','晃','章','朗','祥','秋'][Math.floor(Math.random()*9)];
	    const aKANA_2ND  = ['ヤスアキ','マスアキ','ヤヌアキ','マヌアキ','ヤスマキ','ヤヌマキ'][RAND2];
	    const aKANAH_2ND  = ['やすあき','やすめき','やすあち','やすぬち','やすめち','やすあさ'][RAND2];
	    const aYEAR  = 1965 + Math.floor( Math.random() * 20 );
	    const aMONTH = 1 + Math.floor( Math.random() * 12 );
	    const aDAY   = 10 + Math.floor( Math.random() * 18 );
	    const aADR1  = '横浜市神奈川区';
	    const aADR2  = ['片','方','形'][Math.floor(Math.random()*3)] + ['倉','臓','蔵'][Math.floor(Math.random()*3)] + ['４','四'][Math.floor(Math.random()*2)] + ['丁目','Ｔ目','Τ目'][Math.floor(Math.random()*3)] + ['14','1４','１4','１４','Ι４','十四','＋四'][Math.floor(Math.random()*6)] + ['番地','番池'][Math.floor(Math.random()*2)] + ['14','1４','１4','１４','Ι４','十四','＋四'][Math.floor(Math.random()*6)] + ['','号','合','號'][Math.floor(Math.random()*4)];
	    const aKATAKURA  = ['片','方','形'][Math.floor(Math.random()*3)] + ['倉','臓','蔵'][Math.floor(Math.random()*3)];
	    const aBANCHI = ['４','四'][Math.floor(Math.random()*2)] + ['丁目 ','Ｔ目 ','Τ目 '][Math.floor(Math.random()*3)] + ['14','1４','１4','１４','Ι４','十四','＋四'][Math.floor(Math.random()*6)] + ['番地 ','番池 '][Math.floor(Math.random()*2)] + ['14','1４','１4','１４','Ι４','十四','＋四'][Math.floor(Math.random()*6)] + ['','号','合','號'][Math.floor(Math.random()*4)];
	    const aADR3  = ['ア','マ'][Math.floor(Math.random()*2)] + [ 'ソン', 'ンン', 'ソソ', 'ンソ', 'シソ', 'シン', 'ンシ', 'ソシ'][Math.floor(Math.random()*8)] + ['レイ','しイ'][Math.floor(Math.random()*2)] + ['コ','ユ','工','エ'][Math.floor(Math.random()*4)] + ['片','方','形'][Math.floor(Math.random()*3)] + ['倉','臓','蔵'][Math.floor(Math.random()*3)] + ['304','3０４','３04','３０4','３０４','３○４','三０四','三○四'][Math.floor(Math.random()*8)];
	    const aCELL1  = [ '070', '080', '090' ][Math.floor( Math.random() * 3 )];
	    const aCELL2  = (1000 * (Math.floor( Math.random() * 9 ) + 1) + Math.floor( Math.random() * 999 )).toString();
	    const aCELL3  = (1000 * (Math.floor( Math.random() * 9 ) + 1) + Math.floor( Math.random() * 999 )).toString();

	    var errFlag1 = false;
	    var errTEXT  = '';

	    do {
		const TEMP = await openBRuntilSuccess('https://tojb.f.msgs.jp/webapp/form/24043_tojb_2/index.do', 10000);
		localBrowser = TEMP.BR; localPage = TEMP.PG;

		//await DEBUG(localPage); process.exit(0);

		errFlag1 = await checkText(localPage, 'div#title', 'Samsung');
    		
		if ( !errFlag1 ) {
		    await localPage.close(); // タブを閉じる
		    await localBrowser.close(); // ブラウザを閉じる
		    console.log('\t応募ページに移動できませんでした');
		    continue; // doループの先頭からやり直し
		} 
	    } while ( !errFlag1 );

	    await localPage.type('input[name="singleAnswer(ANSWER19-1)"]', aKANJI_1ST, {delay: 100});
	    await localPage.type('input[name="singleAnswer(ANSWER19-2)"]', aKANJI_2ND, {delay: 100});

	    await localPage.select('select[name="singleAnswer(ANSWER20-1)"]', (Math.floor(Math.random()*20)+1970).toString());
	    await localPage.select('select[name="singleAnswer(ANSWER20-2)"]', (Math.floor(Math.random()*8) +1).toString());
	    await localPage.select('select[name="singleAnswer(ANSWER20-3)"]', (Math.floor(Math.random()*10)+17).toString());

	    await localPage.type('input[name="singleAnswer(ANSWER21-1)"]', '221',  {delay: 100});
	    await localPage.type('input[name="singleAnswer(ANSWER21-2)"]', '0865', {delay: 100});

	    await CLICK({tab:localPage, sel:'input[value="住所検索"]'}); await Wait_MS(3000);

	    await localPage.type('input[name="singleAnswer(ANSWER23)"]', aBANCHI,  {delay: 100});
	    await localPage.type('input[name="singleAnswer(ANSWER24)"]', aADR3,  {delay: 100});
	    await localPage.type('input[name="singleAnswer(ANSWER25)"]', aCELL1+aCELL2+aCELL3,  {delay: 100});

	    if (Math.floor(Math.random()*2) > 0) {
		await CLICK({tab:localPage, sel:'input[name="singleAnswer(ANSWER26)"][value="1"]'}); await Wait_MS(3000);
	    } else {
		await CLICK({tab:localPage, sel:'input[name="singleAnswer(ANSWER26)"][value="2"]'}); await Wait_MS(3000);
	    }

	    if (Math.floor(Math.random()*2) > 0) {
		await CLICK({tab:localPage, sel:'input[name="singleAnswer(ANSWER27)"][value="1"]'}); await Wait_MS(3000);
	    } else {
		await CLICK({tab:localPage, sel:'input[name="singleAnswer(ANSWER27)"][value="2"]'}); await Wait_MS(3000);
	    }

	    if (Math.floor(Math.random()*2) > 0) await CLICK({tab:localPage, sel:'input[name="multiAnswer(ANSWER28)"][value="1"]'});
	    if (Math.floor(Math.random()*2) > 0) await CLICK({tab:localPage, sel:'input[name="multiAnswer(ANSWER28)"][value="2"]'});
	    if (Math.floor(Math.random()*2) > 0) await CLICK({tab:localPage, sel:'input[name="multiAnswer(ANSWER28)"][value="3"]'});
	    if (Math.floor(Math.random()*2) > 0) await CLICK({tab:localPage, sel:'input[name="multiAnswer(ANSWER28)"][value="6"]'});
	    if (Math.floor(Math.random()*2) > 0) await CLICK({tab:localPage, sel:'input[name="multiAnswer(ANSWER28)"][value="7"]'});
	    if (Math.floor(Math.random()*2) > 0) await CLICK({tab:localPage, sel:'input[name="multiAnswer(ANSWER28)"][value="8"]'});
	    await CLICK({tab:localPage, sel:'input[name="multiAnswer(ANSWER28)"][value="9"]'});

	    await localPage.select('select[name="singleAnswer(ANSWER29)"]', (Math.floor(Math.random()*6)+1).toString());
	    await localPage.select('select[name="singleAnswer(ANSWER30)"]', (Math.floor(Math.random()*4)+1).toString());
	    await CLICK({tab:localPage, sel:'input[name="singleAnswer(ANSWER31)"][value="'+['1','2'][Math.floor(Math.random()*2)]+'"]'});
	    await CLICK({tab:localPage, sel:'input[name="singleAnswer(ANSWER32)"][value="'+['1','2','3'][Math.floor(Math.random()*3)]+'"]'});
	    await CLICK({tab:localPage, sel:'input[name="singleAnswer(ANSWER33)"][value="'+['1','2'][Math.floor(Math.random()*2)]+'"]'});
	    await localPage.select('select[name="singleAnswer(ANSWER34)"]', (Math.floor(Math.random()*5)+1).toString());
	    await CLICK({tab:localPage, sel:'input[name="singleAnswer(ANSWER35)"][value="'+['1','2','3','4'][Math.floor(Math.random()*4)]+'"]'});

	    await CLICK({tab:localPage, sel:'input[name="multiAnswer(ANSWER37)"][value="1"]'}); await Wait_MS(3000);
	    await CLICK({tab:localPage, sel:'input[name="multiAnswer(ANSWER36)"][value="1"]'}); await Wait_MS(3000);

	    await CLICK({tab:localPage, sel:'input[value="　確認画面へ進む　"]'}); await Wait_MS(3000);

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
