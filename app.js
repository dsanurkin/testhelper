// const babel = require("@babel/core").transform("code", options);
const playwright = require('playwright');
const fs = require('fs')
const notifier = require('node-notifier');
const { imgDiff } = require('img-diff-js');
const path = require('path')
const clipboardy = require('clipboardy');
const { AsyncNedb } = require('nedb-async');
const gdrive = require('./gdrive')
const data = new AsyncNedb({
    filename: 'data/data.db',
    autoload: true,
});
var compress_images = require('compress-images');

function checkRegress(image1, image2, diff){
    imgDiff({
        actualFilename: image1,
        expectedFilename: image2,
        diffFilename: diff,
    }).then(result => console.log(result.imagesAreSame));
}

async function getDate(){
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0');
    let yyyy = today.getFullYear();
    let hours = today.getHours() + '_' + today.getMinutes();
    today = mm + '-' + dd + '-' + yyyy + '-' + hours;
    return today
}

function filterLink(link){
    link = link.replace('https://', "").replace('http://', "").replace('www.', "").replace('/', '');
    return link     
}

async function findInDatabase(name) {
    name = filterLink(name);        
    let findLinks = await data.asyncFind({ name: name });
    if (findLinks.length > 0) {
        console.log('Список ссылок найден!')
        let links = findLinks[0].links;
        return links
    }   else {
        console.log('Список ссылок не найден!') 
        return false
    }
};

async function getLinkFromTask() {
    const browser = await playwright.chromium.launch({headless: true}); // or 'webkit', 'firefox'
    const context = await browser.newContext();
    const page = await context.newPage('http://otp.demis.ru/smoke/tt/', { waitUntil: 'load' });
    await page.type('body > form > table > tbody > tr:nth-child(1) > td:nth-child(2) > input[type=text]', 'd.anurkin@demis.ru');
    await page.type('body > form > table > tbody > tr:nth-child(2) > td:nth-child(2) > input[type=password]', 'St847CyQ');
    await page.click('body > form > table > tbody > tr:nth-child(3) > td > input[type=submit]');
    await console.log('Вход выполнен');
    await page.waitForSelector('body > div.navbar > div > a.btn.btn.btn-success');
    await page.click('body > div.navbar > div > a.btn.btn.btn-success');
    siteName = await page.$('h2 > a');
    siteName = await siteName.getProperty('href');
    siteName = await siteName.jsonValue();
    console.log('Взята ссылка на ' + siteName);
    await browser.close();
    return siteName
};

async function makeDeviceScreenshot(urls, dev) {
    const { webkit, devices } = require('playwright');
    let device;
    switch(dev) {
        case 'iPad':
            device = devices['iPad Mini'];
            break;
        case 'iPhone':
            device = devices['iPhone 6'];
            break;
        case 'iPhone 11 Pro Max':
            device = devices['iPhone 11 Pro Max'];
            break;
    }
    for (let i = 0; i < urls.length; i++){
        const screenshotName = urls[i].replace('https://', "").replace('http://', "").replace('www.', "").replace(/[\/#!$%\^&\*;?:{}=\_`~()]/g,"_") + '.png'
        const browser = await webkit.launch();
        const context = await browser.newContext({
            viewport: device.viewport,
            userAgent: device.userAgent
        });
        const page = await context.newPage(urls[i], { waitUntil: 'load' });
        await page.setDefaultNavigationTimeout(0);
        await page.screenshot({path: dev + '/' + screenshotName, fullPage: true});
        await browser.close();
    }

    // const { webkit, devices } = require('playwright');
    // const iPhone = devices['iPhone 6'];

    // (async () => {
    //     const browser = await webkit.launch();
    //     const context = await browser.newContext({
    //         viewport: iPhone.viewport,
    //         userAgent: iPhone.userAgent
    //     });
    //     const page = await context.newPage();
    //     await page.goto('http://example.com');
    //     // other actions...
    //     await browser.close();
    // })();
}

async function mkScreenshots(mainLink, customLinks, browsers) {
    // customLinks = customLinks.filter(element => element !== '')
    let links = new Array();
    let imagesData = {
        names: new Array(),
        localPaths: {
            chromium: new Array(),
            firefox: new Array(),
            webkit: new Array()
        },
        gdriveLinks: {
            chromium: new Array(),
            firefox: new Array(),
            webkit: new Array()
        },
        folderLink: null,
        sitename: null
    }

    if (mainLink) {
        let linksFound = await findInDatabase(mainLink);
        if (linksFound.length > 0) {
            siteName = filterLink(mainLink);
            links = linksFound;
            if (customLinks.length > 0) {
                for(let i = 0; i < customLinks.length; i++) { links.push(customLinks[i]) }
            }
        } else {
            siteName = filterLink(mainLink);
            links = customLinks;
            links.push(mainLink);
            let fileData = {
                name: siteName,
                links: links
            }
            // await data.asyncInsert(fileData)
        }
    } else {
        siteName = await getLinkFromTask();
        links = await findInDatabase(siteName);
        if (links == false) {
            return false
        }
        if (customLinks.length > 0) {
            for(let i = 0; i < customLinks.length; i++) { links.push(customLinks[i]) }
        }
    }

    if (links.length > 0) { 
        await console.log('Начинаем тестирование');
        imagesData.sitename = siteName;
        let today = await getDate();
        siteName = filterLink(siteName)
        let gFolderName = siteName + ' ' + today;
        const folder = 'screenshots/' + siteName + ' ' + today + '/'
        const format = '.jpg'
        let mainFolderId = await gdrive.createFolder('1urf-n0KItOAjN9dl7xgLjLeT_Pt42fok', gFolderName);
        for (const browserType of browsers) {
            let childFolderId = await gdrive.createFolder(mainFolderId, browserType);
            const browser = await playwright[browserType].launch({headless: true});
            console.log('started for ' + browserType)
            const context = await browser.newContext();
            const page = await context.newPage();
            fs.mkdirSync(folder + browserType + '/',{recursive: true }) 
            await page.setViewport({width: 1920, height: 1080, deviceScaleFactor: 1,});
            for (let i = 0; i < links.length; i++) {
                let imageName = links[i].replace('https://', "").replace('http://', "").replace('www.', "").replace(/[\/#!$%\^&\*;?:{}=\_`~()]/g,"_") + format;
                let imageLocalPath = folder + browserType + '/' + imageName;
                try {
                    await page.goto(links[i], { waitUntil: 'load'});   
                } catch (error) {
                    console.log(error)
                }
                console.log('Делаем скриншот № ' + (i + 1) + ' из ' + links.length)
                await page.setDefaultNavigationTimeout(0);
                await page.screenshot({path: imageLocalPath, fullPage: true});
                await fs.appendFileSync(folder + 'links.txt/', links[i] + '\r\n', 'utf8');
                imagesData.names.push(imageName)
                imagesData.localPaths[browserType].push('D:/screenshoter/server/' + imageLocalPath)
                imagesData.gdriveLinks[browserType].push(await gdrive.insertFile(childFolderId, imagesData.names[i], imagesData.localPaths[browserType][i]))                                      
            }
            await browser.close()
        }
        imagesData.folderLink = 'https://drive.google.com/drive/folders/' + mainFolderId + '?usp=sharing';
        console.log(imagesData.folderLink);
        // clipboardy.writeSync(imagesData.folderLink);
        // for(let i = 0; i < links.length; i++) {
        //     checkRegress(imagesData.localPaths.chromium[i], imagesData.localPaths.firefox[i], folder + 'crossBrowser/' + imagesData.names[i])
        // }
        console.log('Тестирование завершено!')
        notifier.notify('Тестирование закончено!');
    }
    return imagesData
}

module.exports.mkScreenshots = mkScreenshots;
module.exports.checkRegress = checkRegress;
module.exports.makeDeviceScreenshot = makeDeviceScreenshot;
module.exports.filterLink = filterLink;
module.exports.findInDatabase = findInDatabase;