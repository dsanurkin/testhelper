// const { webkit, chromium, firefox, devices } = require('playwright');
// const babel = require("@babel/core").transform("code", options);
const playwright = require('playwright');
const fs = require('fs')
const notifier = require('node-notifier');
const $ = require('jQuery');
const { imgDiff } = require('img-diff-js');
const path = require('path')
const clipboardy = require('clipboardy');
const { AsyncNedb } = require('nedb-async');
const data = new AsyncNedb({
    filename: 'data/data.db',
    autoload: true,
  });
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

const TOKEN_PATH = 'token.json';

function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function checkRegress(image1, image2, diff){
    imgDiff({
        actualFilename: image1,
        expectedFilename: image2,
        diffFilename: diff,
    }).then(result => console.log(result.imagesAreSame));
}

async function makeDeviceScreenshot(urls, dev) {
    let device;
    switch(dev) {
        case 'iPad':
            device = devices['iPad Pro 11'];
            break;
        case 'iPhone':
            device = devices['iPhone 6'];
            break;
        case 'iPhone 11 Pro Max':
            device = devices['iPhone 11 Pro Max'];
            break;
    }
    for (let i = 0; i < urls.length; i++){
        const browser = await webkit.launch();
        const context = await browser.newContext({
            viewport: device.viewport,
            userAgent: device.userAgent
        });
        console.log('1')
        const page = await context.newPage(urls[i], { waitUntil: 'load' });
        console.log('2')
        await page.setDefaultNavigationTimeout(0);
        console.log('3') 
        const screenshot_name = urls[i].replace('https://', "").replace('http://', "").replace('www.', "").replace('/', '')
        await page.screenshot({path: 'screenshots/' + dev + '/' + screenshot_name + '.png', fullPage: true});
        await browser.close();
    }
}

async function mkScreenshots(url, br) {
    let mainFolderId;
    let childFolderId;
    let folder_name;
    let links = new Array();
    let images_object = {
        names: new Array(),
        local_paths: new Array(),
        gdrive_links: new Array(),
        sitename: ''
    }

    async function check(name) {
        folder_name = name.replace('https://', "").replace('http://', "").replace('www.', "").replace('/', '')            
        let findLinks = await data.asyncFind({ name: folder_name });
        if (findLinks.length > 0) {
            links = findLinks[0].links;
            images_object.sitename = name;
            console.log('Список ссылок найден!')
        }
        urlsFound = (findLinks.length > 0) ? true : false
        if (urlsFound === false) {
            console.log('Список ссылок не найден!')
        }
    };

    async function fId(parentFolderId, gfolderName, firstCreate) {
        return new Promise((resolve, reject) => {
            fs.readFile('credentials.json', (err, content) => {
                if (err) return console.log('Error loading client secret file:', err);
                // Authorize a client with credentials, then call the Google Drive API.
                authorize(JSON.parse(content), gFolderId);
            });
            function gFolderId(auth) {
                // console.log("auth", JSON.stringify(auth));
                const drive = google.drive({version: 'v3', auth});
                let folderId = parentFolderId;
                var fileMetadata = {
                    'name': gfolderName,
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [folderId]
                };
                drive.files.create({
                    resource: fileMetadata,
                    fields: 'id',
                })
                .then(function(response) {
                    if (firstCreate === true) {
                        mainFolderId = response.data.id;
                        console.log('MAINFOLDER CREATED')
                        resolve()
                    } else {
                        childFolderId = response.data.id;
                        console.log('CHILDFOLDER CREATED')
                        resolve()
                    }
                },
                function(err) { 
                    console.error("Execute error", err); 
                });
            }
        });
    }

    async function insFile(parentFolderId, imgName, imgBody) {
        return new Promise((resolve, reject) => {
            fs.readFile('credentials.json', (err, content) => {
                if (err) return console.log('Error loading client secret file:', err);
                authorize(JSON.parse(content), insertFile);
            });
            function insertFile(auth) {
                // console.log("auth", JSON.stringify(auth));
                const drive = google.drive({version: 'v3', auth});
                let folderId = parentFolderId;
                var fileMetadata = {
                    'name': imgName,
                    parents: [folderId]
                };
                var media = {
                    mimeType: 'image/jpeg',
                    body: fs.createReadStream(imgBody)
                };
                drive.files.create({
                    resource: fileMetadata,
                    media: media,
                    fields: 'id'
                })
                .then(function(response) {
                    console.log('Изображение загружено!')
                    images_object.gdrive_links.push('https://drive.google.com/uc?id=' + response.data.id)
                    resolve()
                },
                function(err) { 
                    console.error("Execute error", err); 
                });
            }
        });
    }

    async function getLinkFromTask() {
        const browserType = 'chromium'
        const browser = await playwright[browserType].launch({headless: true}); // or 'webkit', 'firefox'
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto('http://otp.demis.ru/smoke/tt/', { waitUntil: 'load' });
        await page.type('body > form > table > tbody > tr:nth-child(1) > td:nth-child(2) > input[type=text]', 'd.anurkin@demis.ru');
        await page.type('body > form > table > tbody > tr:nth-child(2) > td:nth-child(2) > input[type=password]', 'St847CyQ');
        await page.click('body > form > table > tbody > tr:nth-child(3) > td > input[type=submit]');
        await console.log('Вход выполнен');
        let siteName = async function(){
            await page.waitForSelector('body > div.navbar > div > a.btn.btn.btn-success');
            await page.click('body > div.navbar > div > a.btn.btn.btn-success');
            siteName = await page.$('h2 > a');
            siteName = await siteName.getProperty('href');
            siteName = await siteName.jsonValue();
            await browser.close();
            console.log('Взята ссылка на ' + siteName);
            return siteName
        };
        await siteName();
        await check(siteName);
     };

    if (url.length > 0) {
        links = url;
        folder_name = links[links.length - 1].replace('https://', "").replace('http://', "").replace('www.', "").replace('/', '');
        let fileData = {
            name: folder_name,
            links: links
        }
        await data.asyncInsert(fileData)
    } else {
        await getLinkFromTask();
    }

    if (links.length > 0) { 
        await console.log('Начинаем тестирование')
        let today = new Date()
        let dd = String(today.getDate()).padStart(2, '0')
        let mm = String(today.getMonth() + 1).padStart(2, '0')
        let yyyy = today.getFullYear()
        let hours = today.getHours() + '_' + today.getMinutes()
        today = mm + '-' + dd + '-' + yyyy + '-' + hours
        gfol = folder_name + ' ' + today;
        const folder = 'screenshots/' + folder_name + ' ' + today + '/'
        const format = '.jpg'
        await fId('1urf-n0KItOAjN9dl7xgLjLeT_Pt42fok', gfol, true);
        for (const browserType of br) {
            await fId(mainFolderId, browserType, false)
            const browser = await playwright[browserType].launch({headless: true});
            console.log('started for ' + browserType)
            const context = await browser.newContext();
            const page = await context.newPage();
            fs.mkdirSync(folder + browserType + '/',{recursive: true }) 
            await page.setViewport({width: 1920, height: 1080, deviceScaleFactor: 1,});
            for (let i = 0; i < links.length; i++) {
                let link_replaced = links[i].replace('https://', "").replace('http://', "").replace('www.', "").replace(/[\/#!$%\^&\*;?:{}=\_`~()]/g,"_")
                let img_name = link_replaced + format;
                let link_path = folder + browserType + '/' + img_name;
                try {
                    await page.goto(links[i], { waitUntil: 'load'});
                } catch (error) {
                    console.log(error)
                }
                console.log('Делаем скриншот № ' + i )
                await page.setDefaultNavigationTimeout(0);
                await page.waitFor(3000) 
                await page.screenshot({path: link_path, fullPage: true});
                await fs.appendFileSync(folder + 'links.txt/', links[i] + '\r\n', 'utf8');
                images_object.names.push(img_name)
                images_object.local_paths.push('D:/screenshoter/server/' + link_path)
                await insFile(childFolderId, images_object.names[i], images_object.local_paths[i])
            }
            await browser.close()
        }
        console.log('MAINFOLDERID ' + mainFolderId)
        let copyTarget = 'https://drive.google.com/drive/folders/' + mainFolderId + '?usp=sharing'
        console.log(copyTarget)
        clipboardy.writeSync(copyTarget);
        console.log('Тестирование завершено!')
        notifier.notify('Тестирование закончено!');
    }
    return images_object
}

module.exports.mkScreenshots = mkScreenshots;
module.exports.checkRegress = checkRegress;
module.exports.makeDeviceScreenshot = makeDeviceScreenshot;