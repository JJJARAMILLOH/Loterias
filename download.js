const https = require('https');
const fs = require('fs');

const url = 'https://github.com/JJJARAMILLOH/images/raw/main/Loterias_2026_v20_gemini-pro31.zip';
const file = fs.createWriteStream('loterias.zip');

https.get(url, function(response) {
  if (response.statusCode === 302 || response.statusCode === 301) {
    https.get(response.headers.location, function(redirectResponse) {
      redirectResponse.pipe(file);
      file.on('finish', function() {
        file.close();
        console.log('Download completed');
      });
    }).on('error', function(err) {
      console.error('Redirect Error:', err);
    });
  } else {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      console.log('Download completed');
    });
  }
}).on('error', function(err) {
  console.error('Error:', err);
});
