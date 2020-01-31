const { webkit, chromium, firefox, devices } = require('playwright');
const fs = require('fs')
const notifier = require('node-notifier');
const $ = require('jQuery');
const { imgDiff } = require('img-diff-js');
const path = require('path')
// const libpath = require('path');
let links = new Array();
let folder_name;
let path_arr = new Array();
const { AsyncNedb } = require('nedb-async');
const data = new AsyncNedb({
  filename: 'data/data.db',
  autoload: true,
});

const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
// fs.readFile('credentials.json', (err, content) => {
//   if (err) return console.log('Error loading client secret file:', err);
//   // Authorize a client with credentials, then call the Google Drive API.
//   authorize(JSON.parse(content), storeFiles);
// });

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
// function authorize(credentials, callback) {
//   const {client_secret, client_id, redirect_uris} = credentials.installed;
//   const oAuth2Client = new google.auth.OAuth2(
//       client_id, client_secret, redirect_uris[0]);

//   // Check if we have previously stored a token.
//   fs.readFile(TOKEN_PATH, (err, token) => {
//     if (err) return getAccessToken(oAuth2Client, callback);
//     oAuth2Client.setCredentials(JSON.parse(token));
//     callback(oAuth2Client);
//   });
// }

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function listFiles(auth) {
    console.log("auth", JSON.stringify(auth));
    const drive = google.drive({version: 'v3', auth});
}

function storeFiles(auth) {
    console.log("auth", JSON.stringify(auth));
    const drive = google.drive({version: 'v3', auth});
    function getFolderId(callback){
        var fileMetadata = {
            'name': 'HELP',
            'mimeType': 'application/vnd.google-apps.folder'
          };
          drive.files.create({
            resource: fileMetadata,
            fields: 'id'
          }, function (err, file) {
            if (err) {
              // Handle error
              console.error(err);
            } else {
              console.log('Folder Id: ', file.id);
            //   return file.id
            }
        });
       callback()
    }
    getFolderId(insertFile);
    // await insertFile();
    function insertFile(parentFolder)  {
        // console.log('ty loh')
        const drive = google.drive({version: 'v3', auth});
        var folderId = '174lG_GTALLW5wn4tUTrtRfs72Culx5eY';
        var fileMetadata = {
            'name': 'photo.jpg',
            parents: [folderId]
        };
        var media = {
            mimeType: 'image/jpeg',
            body: fs.createReadStream('D:/screenshoter/server/screenshots/proekt-fasad.ru 01-29-2020-11_10/chrome/proekt-fasad.ru_.png')
        };
        drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        }, function (err, file) {
        if (err) {
            // Handle error
            console.error(err);
        } else {
            console.log('File Id: ', file.id);
        }
        });
    }

    insertFile();
        var fileMetadata = {
            'name': 'ImageTest.jpeg'
        };
        var media = {
            mimeType: 'image/jpeg',
            //PATH OF THE FILE FROM YOUR COMPUTER
            body: fs.createReadStream('D:/screenshoter/server/screenshots/astralnw.ru 01-29-2020-10_4/chrome/astralnw.ru_.png')
        };
        drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        }, function (err, file) {
        if (err) {
        // Handle error
        console.error(err);
        } else {
            console.log('File Id: ', file.data.id);
        }
    });
}


let returnedImages = function() {
  return path_arr
}

function check(name) {
  (async () => {
      folder_name = name.replace('https://', "").replace('http://', "").replace('www.', "").replace('/', '')            
      let findLinks = await data.asyncFind({ name: folder_name });
      if (findLinks.length > 0) {
          links = findLinks[0].links;
      }
      urlsFound = (findLinks.length > 0) ? true : false
      if (urlsFound === false) {
          console.log('Список ссылок не найден!')
      }
  })();
};

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

let mkScreenshots = async function(url, br, callback) {
    async function getLinkFromTask() {
        const browser = await chromium.launch({headless: true}); // or 'webkit', 'firefox'
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

    let img_path_promise = new Promise (async function(resolve, reject){
        try {
            path_arr = [];
            await console.log('Начинаем тестирование')
            let today = new Date()
            let dd = String(today.getDate()).padStart(2, '0')
            let mm = String(today.getMonth() + 1).padStart(2, '0')
            let yyyy = today.getFullYear()
            let hours = today.getHours() + '_' + today.getMinutes()
            today = mm + '-' + dd + '-' + yyyy + '-' + hours
            const folder = 'screenshots/' + folder_name + ' ' + today + '/'
            const format = '.png'
            let browser;
            switch(br) {
                case 'firefox':
                    browser = await firefox.launch({headless: true}); // or 'chromium', 'webkit'
                    break;
                case 'chrome':
                    browser = await chromium.launch({headless: true}); // or 'webkit', 'firefox'
                    break;
                case 'webkit':
                    browser = await webkit.launch({headless: true}); // or 'chromium', 'firefox'
                    break;
            }
            const context = await browser.newContext();
            const page = await context.newPage();
            links = links.filter(element => element !== '')
            if (links.length > 0) { fs.mkdirSync(folder + br + '/',{recursive: true }) }
            await page.setViewport({
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
            });
            for (let i = 0; i < links.length; i++) {
                console.log('Делаем скриншот № ' + i )
                let link_replaced = links[i].replace('https://', "").replace('http://', "").replace('www.', "").replace(/[\/#!$%\^&\*;?:{}=\_`~()]/g,"_")
                let link_path = folder + br + '/' + link_replaced + format;
                try {
                    console.log(link_path)
                    await page.goto(links[i], { waitUntil: 'load'});
                    await page.setDefaultNavigationTimeout(0);
                    await page.waitFor(2000) 
                    await page.screenshot({path: link_path, fullPage: true});
                    await fs.appendFileSync(folder + 'links.txt/', links[i] + '\r\n', 'utf8');
                    path_arr.push(link_path)
                } catch (error) {
                    console.log(error)
                }
            }
            links = [];
            await browser.close()
            resolve();
            await callback()
        } catch (err) {
            reject();
            console.log(err)
        }
        
    });
  img_path_promise.then(function(){
      returnedImages();
      console.log('Тестирование завершено!')
      notifier.notify('Тестирование закончено!');
  });
  img_path_promise.catch(function(){
    console.log('err')
  });
};

// async function google(){
//     const { GPhotos } = require('upload-gphotos');
//     const gphotos = new GPhotos();
//     const libpath = require('path');
//     const filepath = libpath.join('screenshots/test/example.png');
//     // console.log(filepath)
//     const username = 'anurkindenis3@gmail.com';
//     const password = 'elefug97';

//     (async () => {
//         await gphotos.signin({
//             username,
//             password,
//         });
    
//         const album = await gphotos.searchAlbum({ title: 'TestAlbum' });
        
//         const photo = await gphotos.upload({
//             stream: fs.createReadStream(filepath),
//             size: (await fs.promises.stat(filepath)).size,
//             filename: libpath.basename(filepath),
//         });
    
//         await album.append(photo);
    
//         console.log(photo.id);
//     })().catch(console.error);
// }

module.exports.mkScreenshots = mkScreenshots;
module.exports.returnedImages = returnedImages;
module.exports.checkRegress = checkRegress;
module.exports.makeDeviceScreenshot = makeDeviceScreenshot;
// module.exports.storeFiles = storeFiles;