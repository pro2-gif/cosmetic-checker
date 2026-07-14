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
        const keyword = parsedUrl.query.keyword;
        
        if (!keyword) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '검색어를 입력해주세요.' }));
            return;
        }

        // -------------------------------------------------------
        // 식약처 API 전체 데이터 수집 로직
        // 1단계: numOfRows=1로 빠르게 totalCount만 파악
        // 2단계: totalCount 기반으로 필요한 모든 페이지를 병렬 요청
        // 3단계: 모든 결과를 하나로 합쳐서 브라우저에 전달
        // -------------------------------------------------------
        const PAGE_SIZE = 100; // 한 번에 가져올 건수 (API 허용 최대치)
        const BASE_URL = `https://apis.data.go.kr/1471000/FtnltCosmRptPrdlstInfoService/getRptPrdlstInq?serviceKey=${API_KEY}&type=json&item_name=${encodeURIComponent(keyword)}`;

        // 편의 함수: 특정 페이지 데이터를 가져옵니다
        const fetchPage = (pageNo, numOfRows) => new Promise((resolve, reject) => {
            const url = `${BASE_URL}&pageNo=${pageNo}&numOfRows=${numOfRows}`;
            https.get(url, (r) => {
                let d = '';
                r.on('data', c => d += c);
                r.on('end', () => resolve(d));
            }).on('error', reject);
        });

        try {
            // 1단계: totalCount 파악
            const firstRaw = await fetchPage(1, PAGE_SIZE);
            const firstJson = JSON.parse(firstRaw);
            const totalCount = firstJson.body ? firstJson.body.totalCount : 0;
            const firstItems = (firstJson.body && firstJson.body.items) ? firstJson.body.items : [];

            if (totalCount <= PAGE_SIZE) {
                // 결과가 PAGE_SIZE 이하면 이미 다 가져왔으므로 바로 응답
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(firstRaw);
                return;
            }

            // 2단계: 나머지 페이지 병렬 요청
            const totalPages = Math.ceil(totalCount / PAGE_SIZE);
            const pagePromises = [];
            for (let p = 2; p <= totalPages; p++) {
                pagePromises.push(fetchPage(p, PAGE_SIZE));
            }
            const restRaws = await Promise.all(pagePromises);

            // 3단계: 모든 페이지 아이템 합치기
            let allItems = [...firstItems];
            for (const raw of restRaws) {
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed.body && parsed.body.items) {
                        allItems = allItems.concat(parsed.body.items);
                    }
                } catch(e) { /* 파싱 실패 페이지는 건너뜀 */ }
            }

            // 전체 데이터를 하나의 JSON으로 합쳐서 응답
            const mergedResponse = {
                header: firstJson.header,
                body: {
                    pageNo: 1,
                    numOfRows: allItems.length,
                    totalCount: totalCount,
                    items: allItems
                }
            };

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(mergedResponse));

        } catch(parseErr) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '데이터 수집 중 오류가 발생했습니다: ' + parseErr.message }));
        }
        
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
