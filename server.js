const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 서버 포트 설정
const PORT = 3000;

// 수인님의 식약처 공공데이터 API 인증키
const API_KEY = "8438e0c9c0276651df0610f950fb14f1e6b328ad92f388072a7fdf5dfed4c8b3";

// 파일 형식(확장자)에 따른 웹 문서 타입 정의
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg'
};

// 웹 서버 생성
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // 1. 식약처 API 대신 물어봐주는 '프록시' 역할
    if (parsedUrl.pathname === '/api/search') {
        const keyword = parsedUrl.query.keyword;
        
        if (!keyword) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '검색어를 입력해주세요.' }));
            return;
        }

        // 서버에서 식약처로 진짜 요청을 보냅니다 (이 과정은 CORS 차단을 받지 않음!)
        // 데이터 포털 사양에 따라 http 통신이 더 안정적일 수 있으므로 우선 http로 요청합니다.
        const targetUrl = `http://apis.data.go.kr/1471000/FtnlCosmRptInfoService/getFtnlCosmRptInfoList?serviceKey=${API_KEY}&pageNo=1&numOfRows=10&type=json&ITEM_NAME=${encodeURIComponent(keyword)}`;

        http.get(targetUrl, (proxyRes) => {
            let data = '';
            
            // 데이터 조각을 받을 때마다 하나로 합칩니다.
            proxyRes.on('data', chunk => {
                data += chunk;
            });
            
            // 데이터 수신이 끝나면, 그 결과를 브라우저(app.js)에게 전달합니다.
            proxyRes.on('end', () => {
                res.writeHead(proxyRes.statusCode, { 
                    'Content-Type': proxyRes.headers['content-type'] || 'application/json; charset=utf-8'
                });
                res.end(data);
            });
            
        }).on('error', (err) => {
            console.error('식약처 통신 에러:', err);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '서버 대 서버 통신 중 문제가 발생했습니다: ' + err.message }));
        });
        
        return;
    }

    // 2. 브라우저가 화면을 띄울 수 있도록 파일(index.html 등)을 보내주는 역할
    let filePath = path.join(__dirname, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if(err.code == 'ENOENT'){
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found - 파일을 찾을 수 없습니다.');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('500 Internal Server Error - 서버 오류 발생');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// 서버 실행
server.listen(PORT, () => {
    console.log('==================================================');
    console.log(`✨ 수인님의 뷰티 팩트체커 전용 우회 서버가 켜졌습니다!`);
    console.log(`👉 접속 주소: http://localhost:${PORT}`);
    console.log('==================================================');
});
