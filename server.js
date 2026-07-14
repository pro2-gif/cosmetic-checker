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
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // 1. 식약처 API 대신 물어봐주는 '프록시' 역할
    if (parsedUrl.pathname === '/api/search') {
        const apiSearch = require('./api/search');
        apiSearch(req, res);
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
