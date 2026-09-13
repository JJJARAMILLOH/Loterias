const https = require('https');
const fs = require('fs');
const AdmZip = require('adm-zip');

const url = 'https://github.com/JJJARAMILLOH/images/raw/main/Loterias_2026_v20_gemini-pro31.zip';
const zipFilePath = 'loterias.zip';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
        }).on('error', reject);
      } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else {
        reject(new Error(`Failed to download, status code: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

downloadFile(url, zipFilePath)
  .then(() => {
    console.log('Download complete, extracting...');
    try {
      const zip = new AdmZip(zipFilePath);
      zip.extractAllTo("./extracted", true);
      console.log('Extraction complete');
      fs.writeFileSync('extract_success.txt', 'Extraction complete');
    } catch (e) {
      console.error('Zip Error:', e);
      fs.writeFileSync('extract_error.txt', e.toString());
    }
  })
  .catch((err) => {
    console.error('Download Error:', err);
    fs.writeFileSync('extract_error.txt', err.toString());
  });
