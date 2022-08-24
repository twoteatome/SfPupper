const puppeteer = require('puppeteer-extra')

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const express = require('express');
const path = require('path');

const app = express();
const maxChapter = process.env.MAX_CHAPTER || 3;
const waitTimeout = process.env.WAIT_TIME || 3000;

app.use(express.static(path.join(__dirname, 'static')));

var processLst = new Map();

const getRandomStr = function (length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

app.get('/', (req, res) => {
    res.send('OK ' + Date().toLocaleString() + ': ' + maxChapter + ', ' + processLst.size + ', ' + waitTimeout);
});

app.get('/view', async (req, res) => {
    let argparam = [];
    argparam.push('--no-sandbox');
    if (req.query.proxy && req.query.proxy.length > 5)
    {
        argparam.push('--proxy-server=' + req.query.proxy);
    }
    let maxch = maxChapter;
    let minch = 0;
    if (req.query.max && parseInt(req.query.max) > 0)
    {
        maxch = parseInt(req.query.max);
    }

    if (req.query.min && parseInt(req.query.min) > 0)
    {
        minch = parseInt(req.query.min);
    }

    const sfacgurl = 'https://book.sfacg.com/Novel/' + req.query.id + '/MainIndex/';
    const browser = await puppeteer.launch({
        headless: true,
        args: argparam
    });
    const page = await browser.newPage();
    await page.goto(sfacgurl, {
        waitUntil: 'networkidle2'
    });
    const viewer = await page.$$eval('.story-catalog > .catalog-list > ul > li > a', anchors => [].map.call(anchors, a => a.href + ';*;' + a.innerText));

    let readAll = "<b>Start at: " + Date().toLocaleString() + "</b><br>";
    const maxCount = Math.min(maxch, viewer.length);

    for (let i = minch; i < maxCount; i++) {
        const tmpval = viewer[i].split(";*;");
        const tmpurl = tmpval[0];
        const tmpread = tmpval[1];
        if (tmpurl.includes("/vip/"))
        {
            readAll = readAll + '<b>End because of vip chapter</b><br>';
            break;
        }
        else
        {
            await page.goto(tmpurl, {
                waitUntil: 'load'
            });
            await page.evaluate(() => {
                const element = document.getElementsByClassName("footer")[0];
                const y = element.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({top: y, behavior: 'smooth'});
            });
            readAll = readAll + tmpread + '<br>';
        }
    }

    readAll = readAll + '<b>End at: ' + Date().toLocaleString() + '</b><br>';
    await browser.close();
    res.set('Content-Type', 'text/html');
    res.send(Buffer.from(readAll));
});

app.get('/deleteall', (req, res) => {
    processLst = new Map();
    res.send("OK");
});

app.get('/delete', (req, res) => {
    if (req.query.id) {
        const key = req.query.id;
        if (processLst.has(key))
        {
            processLst.delete(key);
            res.send("Delete completed with key: " + key);
        }
        else
        {
            res.send("Not found " + key);
        }
    } else {
        res.send("No parameter");
    }
});

app.get('/getall', (req, res) => {
    let allKeys = "";
    processLst.forEach(function(value, key){
        allKeys = allKeys + key + ", ";
    });
    res.send(allKeys);
});

app.get('/check', (req, res) => {
    if (req.query.id) {
        const key = req.query.id;
        if (processLst.has(key))
        {
            const curval = processLst.get(key);
            res.set('Content-Type', 'text/html');
            res.send(Buffer.from(curval));
        }
        else
        {
            res.send("Not found " + key);
        }
    } else {
        res.send("No parameter");
    }
});

app.get('/viewasync', (req, res) => {
    let argparam = [];
    argparam.push('--no-sandbox');
    if (req.query.proxy && req.query.proxy.length > 5)
    {
        argparam.push('--proxy-server=' + req.query.proxy);
    }
    let maxch = maxChapter;
    let minch = 0;
    const currentid = getRandomStr(5) + Date.now().toString();
    
    if (req.query.max && parseInt(req.query.max) > 0)
    {
        maxch = parseInt(req.query.max);
    }

    if (req.query.min && parseInt(req.query.min) > 0)
    {
        minch = parseInt(req.query.min);
    }

    const sfacgurl = 'https://book.sfacg.com/Novel/' + req.query.id + '/MainIndex/';

    new Promise(async () => {
        const browser = await puppeteer.launch({
            headless: true,
            args: argparam
        });
        const page = await browser.newPage();
        await page.goto(sfacgurl, {
            waitUntil: 'networkidle2'
        });
        const viewer = await page.$$eval('.story-catalog > .catalog-list > ul > li > a', anchors => [].map.call(anchors, a => a.href + ';*;' + a.innerText));

        let readAll = "<b>Start at: " + Date().toLocaleString() + "</b><br>";
        processLst.set(currentid, readAll);
        const maxCount = Math.min(maxch, viewer.length);

        for (let i = minch; i < maxCount; i++) {
            const tmpval = viewer[i].split(";*;");
            const tmpurl = tmpval[0];
            const tmpread = tmpval[1];
            if (tmpurl.includes("/vip/"))
            {
                readAll = readAll + '<b>End because of vip chapter</b><br>';
                break;
            }
            else
            {
                await page.goto(tmpurl, {
                    waitUntil: 'load'
                });
                await page.evaluate(() => {
                    const element = document.getElementsByClassName("footer")[0];
                    const y = element.getBoundingClientRect().top + window.pageYOffset;
                    window.scrollTo({top: y, behavior: 'smooth'});
                });
                readAll = readAll + tmpread + '<br>';
                processLst.set(currentid, readAll);
            }
        }

        readAll = readAll + '<b>End at: ' + Date().toLocaleString() + '</b><br>';
        processLst.set(currentid, readAll);
        await browser.close();
    });
    
    res.send("Now run in Promise with id: " + currentid);
});

app.get('/checktor', async (req, res) => {
    let argparam = [];
    argparam.push('--no-sandbox');
    if (req.query.proxy && req.query.proxy.length > 5)
    {
        argparam.push('--proxy-server=' + req.query.proxy);
    }
    const browser = await puppeteer.launch({
        headless: true,
        args: argparam
    });
    const page = await browser.newPage();
	await page.goto('https://check.torproject.org/');
    const isUsingTor = await page.$eval('body', el =>
		el.innerHTML.includes('Congratulations. This browser is configured to use Tor')
	);
    await browser.close();
    if (isUsingTor)
    {
        res.send("Currently using tor");
    }
    else
    {
        res.send("Not using tor");
    }
});

app.get('/checkip', async (req, res) => {
    let argparam = [];
    argparam.push('--no-sandbox');
    if (req.query.proxy && req.query.proxy.length > 5)
    {
        argparam.push('--proxy-server=' + req.query.proxy);
    }
    const browser = await puppeteer.launch({
        headless: true,
        args: argparam
    });
    const page = await browser.newPage();
	await page.goto('https://www.whatismyip.com/');
    let viewer = await page.$eval('#ip-info', el => el.innerText);
    await browser.close();
    viewer = viewer.replace(/\n/g, "<br>");
    res.set('Content-Type', 'text/html');
    res.send(Buffer.from(viewer));
});

app.get('/image', async (req, res) => {
    let argparam = [];
    argparam.push('--no-sandbox');
    if (req.query.proxy && req.query.proxy.length > 5)
    {
        argparam.push('--proxy-server=' + req.query.proxy);
    }
    const url = req.query.url;
    const browser = await puppeteer.launch({
        headless: true,
        timeout: 100000,
        args: argparam
    });
    const page = await browser.newPage();
    await page.setViewport({width: 1440, height: 720});
    await page.goto(url, {
        waitUntil: 'load'
    });

    if (req.query.wait && parseInt(req.query.wait) > 0)
    {
        await page.waitForTimeout(parseInt(req.query.wait));
    }
    else
    {
        await page.waitForTimeout(parseInt(waitTimeout));
    }
    
    await page.screenshot({
        path: 'static/screenshot.jpg',
        fullPage: true
    });
    await browser.close();
    res.set('Content-Type', 'text/html');
    res.send(Buffer.from("<img src='screenshot.jpg' style='width: 100%; height: auto;'/>"));
});

app.get('/link', async (req, res) => {
    let argparam = [];
    argparam.push('--no-sandbox');
    let proxytxt = "";
    if (req.query.proxy && req.query.proxy.length > 5)
    {
        proxytxt = req.query.proxy;
        argparam.push('--proxy-server=' + req.query.proxy);
    }

    const url = "https://yurineko.net/manga/" + req.query.id;
    const browser = await puppeteer.launch({
        headless: true,
        timeout: 100000,
        args: argparam
    });
    const page = await browser.newPage();
	await page.goto(url, {
        waitUntil: 'load'
    });

    let waittime = parseInt(waitTimeout);
    if (req.query.wait && parseInt(req.query.wait) > 0)
    {
        waittime = parseInt(req.query.wait);
    }
    
    await page.waitForTimeout(waittime);
    
    const viewer = await page.$$eval('a.link-chapter', anchors => [].map.call(anchors, a => a.href));
    await browser.close();

    if (!viewer || viewer.length < 1)
    {
        res.send("Can not get because of geo restriction");
    }
    else
    {
        let resAll = "<div style='transform: scale(2);'>";
        for (let i = 0; i < viewer.length; i++)
        {
            const tenchap = viewer.length - i;
            let params = "url=" + viewer[i] + "&proxy=" + proxytxt + "&wait=" + waittime;
            resAll = resAll + "<a class='chap-read' href='image?" + params + "' target='_blank'>Chap " + tenchap + "</a><br>";
        }

        resAll = resAll + "<input type='text' value='" + waittime + "' oninput='document.querySelectorAll(\"a.chap-read\").forEach(el => el.href = el.href.replace(/wait=[0-9]+/g,\"wait=\" + this.value));'><br></div>";
        res.set('Content-Type', 'text/html');
        res.send(Buffer.from(resAll));
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`Listening on ${PORT} ...`);
});
