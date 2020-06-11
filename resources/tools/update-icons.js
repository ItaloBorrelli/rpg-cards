const mv = require('mv');
const fs = require('fs');
const fse = require('fs-extra');
const request = require('request');
const path = require('path');
const walk = require('walk');
const yauzl = require("yauzl");
const ncp = require('ncp');

const gameIconsUrl = "https://game-icons.net/archives/svg/zip/ffffff/transparent/game-icons.net.svg.zip";
const tempFilePath = "./temp.zip";
const tempDir = "./temp";
const imgDir = "./generator/img";
const customIconDir = "./resources/custom-icons";
const cssPath = "./generator/css/icons.css";
const jsPath = "./generator/js/icons.js";


// ----------------------------------------------------------------------------
// Download
// ----------------------------------------------------------------------------
function downloadFile(url, dest) {
    console.log("Downloading...");
    return new Promise((resolve, reject) => {
        request(url)
            .pipe(fs.createWriteStream(dest))
            .on("close", resolve)
            .on("error", reject);
    });
}

// ----------------------------------------------------------------------------
// Unzip
// ----------------------------------------------------------------------------
function unzipAll(src, dest) {
    console.log("Unzipping...");
    return new Promise((resolve, reject) => {
        yauzl.open(src, {lazyEntries: true}, function(err, zipfile) {
            if (err) {
                reject(err);
                return;
            }
            zipfile.readEntry();
            zipfile.on("entry", function(entry) {
                if (/\/$/.test(entry.fileName)) {
                    // Directory file names end with '/'. Note that entries for
                    // directories themselves are optional. An entry's fileName
                    // implicitly requires its parent directories to exist.
                    zipfile.readEntry();
                } else {
                    var entryPath = path.parse(entry.fileName);
                    var fileName = entryPath.base;
                    var targetFile = path.join(dest, fileName);
                    var i = 2;
                    while (true) {
                        if (!fs.existsSync(targetFile)) {
                            break;
                        }
                        fileName = entryPath.name + "-" + i++ + entryPath.ext;
                        targetFile = path.join(dest, fileName);
                    }
                    zipfile.openReadStream(entry, function(err, readStream) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        readStream
                            .on("end", function() {
                                zipfile.readEntry();
                            }).pipe(
                                fs.createWriteStream(targetFile)
                                    .on("error", reject)
                            ).on("error", reject);
                    });
                }
            }).on("close", resolve);
        });
    });
}

// ----------------------------------------------------------------------------
// Generate CSS
// ----------------------------------------------------------------------------
function generateCSS(src, dest) {
    console.log("Generating CSS...");
    return new Promise((resolve, reject) => {
        fs.readdir(src, (err, files) => {
            if (err) {
                reject(err);
            }
            else {
                const content = files
                    .filter(function (fileName) {
                        return path.extname(fileName) === ".svg";
                    }).map(name => `.icon-${name.replace(".svg", "")} { background-image: url(../img/${name});}\n`)
                    .join("");
                fs.writeFile(dest, content, err => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }
        });
    });
}

// ----------------------------------------------------------------------------
// Generate JS
// ----------------------------------------------------------------------------
function generateJS(src, dest) {
    console.log("Generating JS...");
    return new Promise((resolve, reject) => {
        fs.readdir(src, (err, files) => {
            if (err) {
                reject(err);
            }
            else {
                const content = "var icon_names = [\n" + files
                    .filter(function (fileName) {
                        return path.extname(fileName) === ".svg";
                    }).map(name => `    "${name.replace(".svg", "")}"`)
                    .join(",\n") +
`
];

var class_icon_names = [
    "class-barbarian",
    "class-bard",
    "class-cleric",
    "class-druid",
    "class-fighter",
    "class-monk",
    "class-paladin",
    "class-ranger",
    "class-rogue",
    "class-sorcerer",
    "class-warlock",
    "class-wizard"
];

icon_names = icon_names.concat(class_icon_names);
`;
                fs.writeFile(dest, content, err => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }
        });
    });
}

// ----------------------------------------------------------------------------
// Copy
// ----------------------------------------------------------------------------
function copyAll(src, dest) {
    console.log("Copying...");
    return new Promise((resolve, reject) => {
        fse.copy(src, dest, err => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

fse.emptyDir(tempDir)
.then(() => downloadFile(gameIconsUrl, tempFilePath))
.then(() => unzipAll(tempFilePath, tempDir))
.then(() => copyAll(tempDir, imgDir))
.then(() => copyAll(customIconDir, imgDir))
.then(() => generateCSS(imgDir, cssPath))
.then(() => generateJS(imgDir, jsPath))
.then(() => console.log("Done."))
.catch(err => console.log("Error", err));
