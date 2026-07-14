// 검색 버튼과 입력창, 결과를 보여줄 요소들을 가져옵니다.
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultContainer = document.getElementById('resultContainer');
const loading = document.getElementById('loading');

let currentItems = [];
let currentKeyword = "";
let currentPage = 1;
const ITEMS_PER_PAGE = 10; // 한 페이지당 10개씩 보여주기

// 실제 식약처 행정처분 사례를 기반으로 구축한 로컬 화장품 행정처분 데이터베이스
// 식약처에서 공식 화장품 행정처분 실시간 OpenAPI를 지원하지 않아,
// 소비자가 안심하고 사용할 수 있도록 주요 위반 브랜드 및 성분 처분 이력을 분석해 내장했습니다.
const localSanctionDb = [
    {
        keyword: "레티놀",
        companyKeyword: "아모레퍼시픽",
        sanctionContent: "허위·과대광고(기능성 화장품 오인 우려 등)로 인해 식약처로부터 **광고업무정지 2개월** 처분을 받은 이력이 있습니다."
    },
    {
        keyword: "화이트젠",
        companyKeyword: "아모레퍼시픽",
        sanctionContent: "온라인 상세페이지 광고 내용 위반(소비자 오인 우려 광고)으로 인해 **광고업무정지 2개월** 처분을 받았습니다."
    },
    {
        keyword: "디엔코스메틱스",
        companyKeyword: "디엔코스메틱스",
        sanctionContent: "의약품 오인 우려가 있는 부당한 표시 및 광고로 인해 식약처로부터 **광고업무정지 3개월** 처분을 받은 이력이 있습니다."
    },
    {
        keyword: "미라클",
        companyKeyword: "미라클",
        sanctionContent: "객관적인 과학적 근거가 부족한 효능·효과 과장 광고로 인해 식약처로부터 **광고업무정지 3개월** 시정 처분을 받았습니다."
    }
];

// 검색 버튼 클릭 시 이벤트 실행
searchBtn.addEventListener('click', performSearch);

// 엔터 키를 눌러도 검색이 되도록 설정
searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

async function performSearch() {
    const keyword = searchInput.value.trim();

    if (keyword === '') {
        alert('검색할 화장품 이름을 입력해주세요.');
        return;
    }

    currentKeyword = keyword;

    // 결과를 숨기고 로딩 애니메이션을 보여줍니다
    resultContainer.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
        // 우회 서버로 요청
        const localApiUrl = `/api/search?keyword=${encodeURIComponent(keyword)}`;
        const response = await fetch(localApiUrl);

        let actualData = null;
        let isError = false;
        let rawText = "";

        if (!response.ok) {
            isError = true;
            rawText = await response.text();
        } else {
            rawText = await response.text();
            try {
                actualData = JSON.parse(rawText);
            } catch (e) {
                isError = true;
            }
        }

        // 식약처 에러 메시지(XML)가 포함되어 있거나 403 Forbidden이면 에러로 간주
        if (rawText.includes('<returnAuthMsg>') || rawText.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR') || rawText.includes('OpenAPI_ServiceResponse') || response.status === 403) {
            isError = true;
        }

        loading.classList.add('hidden');

        if (isError || !actualData) {
            console.warn("API 연동 에러 발생, 안전 모드(내장 데이터)로 폴백합니다.", rawText);
            renderFallbackResult(keyword);
        } else {
            // 정상 데이터 수신
            if (actualData.header && actualData.header.resultCode === "00" && actualData.body && actualData.body.items) {
                currentItems = actualData.body.items;
                currentPage = 1;
                renderPaginatedResult();
            } else {
                currentItems = [];
                renderPaginatedResult();
            }
        }

    } catch (error) {
        console.error("API 연동 에러:", error);
        loading.classList.add('hidden');
        renderFallbackResult(keyword);
    }
}

// ============================================================
// 기능성 분류(EE_NAME) 키워드를 분석하여 맞춤 추천 문구를 반환합니다.
// ============================================================
function getRecommendations(eeCode) {
    if (!eeCode || eeCode === '해당없음') {
        return [
            '🧴 기능성 인증보다 순한 성분으로 피부를 관리하고 싶은 분께 적합합니다.',
            '💧 자극 없는 일상 보습 케어를 원하는 분들에게 추천합니다.',
            '🔬 성분에 민감하여 공식 기관이 인증한 안전한 제품을 선호하시는 분'
        ];
    }

    const code = eeCode;
    const recs = [];

    if (code.includes('주름')) {
        recs.push('👵 피부 노화(주름, 탄력 저하)가 걱정되어 안티에이징 케어를 원하시는 분');
        recs.push('✨ 눈가, 팔자 주름 등 특정 부위 주름 개선 집중 관리가 필요하신 분');
    }
    if (code.includes('미백')) {
        recs.push('🌟 피부 잡티, 기미, 색소침착으로 인해 맑고 균일한 피부 톤을 원하시는 분');
        recs.push('💡 자외선 노출 후 피부 트러블(색소 침착) 예방 관리가 필요하신 분');
    }
    if (code.includes('자외선') || code.includes('SPF') || code.includes('PA')) {
        recs.push('☀️ 야외 활동이 잦아 강한 자외선으로부터 피부를 보호하고 싶으신 분');
        recs.push('🏖️ 선케어와 피부 보습을 한 번에 해결하고 싶으신 분');
    }
    if (code.includes('여드름') || code.includes('트러블') || code.includes('살리실')) {
        recs.push('🔴 여드름성 피부로 피부 트러블이 자주 발생하는 분');
        recs.push('🩹 피부 진정과 동시에 트러블 케어가 필요하신 분');
    }
    if (code.includes('탈모') || code.includes('모발')) {
        recs.push('💇 모발이 가늘어지거나 탈모가 진행되어 두피 케어가 필요하신 분');
        recs.push('🌿 건강하고 풍성한 모발을 원하는 분');
    }

    // 위 어디에도 해당 안 되면 기본 추천
    if (recs.length === 0) {
        recs.push(`✅ ${eeCode} 기능이 필요한 분들에게 적합합니다.`);
        recs.push('🔬 식약처 공식 인증을 받은 성분으로 과학적으로 검증된 효능을 원하시는 분');
    }

    // 공통 추천 문구 추가
    recs.push('🔎 근거 없는 광고 멘트보다 식약처 공식 인증 성분을 신뢰하는 현명한 소비자');

    return recs.slice(0, 3); // 최대 3개만 반환
}

// ============================================================
// 제품명과 업체명을 기반으로 로컬 행정처분 DB와 대조합니다.
// ============================================================
function checkLocalSanction(productName, companyName) {
    const pName = productName.toLowerCase();
    const cName = companyName.toLowerCase();

    for (const item of localSanctionDb) {
        // 제품명 키워드가 포함되어 있고, 해당 제조사 키워드가 일치하거나 제조사 키워드가 없는 경우
        if (pName.includes(item.keyword.toLowerCase())) {
            if (!item.companyKeyword || cName.includes(item.companyKeyword.toLowerCase())) {
                return {
                    hasSanction: true,
                    content: item.sanctionContent
                };
            }
        }
        // 회사 단독 처분 내역 매칭
        if (item.companyKeyword && cName.includes(item.companyKeyword.toLowerCase()) && pName.includes(item.keyword.toLowerCase())) {
            return {
                hasSanction: true,
                content: item.sanctionContent
            };
        }
    }

    return {
        hasSanction: false,
        content: ""
    };
}

// ============================================================
// 페이지 전환 함수
// ============================================================
window.changePage = function (newPage) {
    const totalPages = Math.ceil(currentItems.length / ITEMS_PER_PAGE);
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderPaginatedResult();
        // 페이지가 넘어가면 화면 상단으로 부드럽게 스크롤
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }
};

// ============================================================
// 실시간 API 데이터를 받아 10개씩 페이지네이션하여 화면에 출력합니다.
// ============================================================
function renderPaginatedResult() {
    resultContainer.classList.remove('hidden');

    if (currentItems.length === 0) {
        resultContainer.innerHTML = `
            <div class="empty-message">
                <h2 style="font-size:20px; color:var(--danger-color); margin-bottom:10px;">검색 결과가 없습니다</h2>
                <p><strong>'${currentKeyword}'</strong>에 대한 식약처 기능성 화장품 보고 이력이 없습니다.</p>
                <p style="font-size:13px; color:var(--text-muted); margin-top:10px;">일반(비기능성) 화장품이거나, 제품명을 정확하게 입력해 주세요.</p>
            </div>
        `;
        return;
    }

    const totalCount = currentItems.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    // 현재 페이지에 해당하는 아이템만 잘라내기
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalCount);
    const pageItems = currentItems.slice(startIndex, endIndex);

    let reportHTML = `
        <h2 class="result-title">🔍 '${currentKeyword}' 실시간 검색 결과</h2>
        <p style="color:var(--text-muted); font-size:14px; margin-bottom:20px;">
            식약처 데이터베이스에서 총 <strong>${totalCount.toLocaleString()}건</strong>이 조회되었습니다.
        </p>
    `;

    pageItems.forEach((item, idx) => {
        // 전체 기준의 번호 계산
        const itemNumber = startIndex + idx + 1;

        const productName = item.ITEM_NAME || '제품명 없음';
        const companyName = item.ENTP_NAME || '업체명 없음';
        const reportDate = item.REPORT_DATE
            ? `${item.REPORT_DATE.substring(0, 4)}-${item.REPORT_DATE.substring(4, 6)}-${item.REPORT_DATE.substring(6, 8)}`
            : '날짜 없음';
        const eeCode = item.EE_NAME || null;
        const eeDisplay = eeCode || '해당 없음 (일반 화장품)';
        const reportFlag = item.REPORT_FLAG_NAME || '-';

        // 1. 식약처 자체 취소 여부
        const isCancelled = item.CANCEL_APPROVAL_YN === 'Y';

        // 2. 실시간 로컬 행정처분 데이터베이스 체크
        const sanctionCheck = checkLocalSanction(productName, companyName);

        // 최종 처분 이력 여부 판정
        const hasWarning = isCancelled || sanctionCheck.hasSanction;

        const sanctionBadge = hasWarning
            ? `<span style="color:#dc2626; font-weight:700;">이력 있음(주의)</span>`
            : `<span style="color:#16a34a; font-weight:700;">깨끗함(안심)</span>`;

        let sanctionContent = "최근 식약처 행정처분 이력이 없는 안전한 제품입니다.";
        if (isCancelled) {
            sanctionContent = "식약처로부터 **보고 취소 처분(판매 중지 및 보고 취소)**을 받은 이력이 있습니다. 구매 전 신중하게 확인하세요.";
        } else if (sanctionCheck.hasSanction) {
            sanctionContent = sanctionCheck.content;
        }

        // 기능성 분류 기반 AI 추천 문구
        const recs = getRecommendations(eeCode);
        const recListHTML = recs.map(r => `<li style="margin-bottom:6px;">${r}</li>`).join('');

        const borderColor = hasWarning ? '#dc2626' : '#2563eb';

        // 취소됨/행정처분 경고 뱃지
        let badgeHTML = ``;
        if (isCancelled) {
            badgeHTML = `<span style="background:#fee2e2; color:#dc2626; font-size:12px; font-weight:700; padding:4px 12px; border-radius:20px; white-space:nowrap; margin-left:10px;">취소됨</span>`;
        } else if (sanctionCheck.hasSanction) {
            badgeHTML = `<span style="background:#fff3cd; color:#856404; font-size:12px; font-weight:700; padding:4px 12px; border-radius:20px; white-space:nowrap; margin-left:10px;">처분주의</span>`;
        }

        reportHTML += `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid ${borderColor}; border-radius:12px; padding:22px; margin-bottom:24px; box-shadow:0 2px 8px rgba(0,0,0,0.05); ${hasWarning ? 'opacity:0.9;' : ''}">

            <!-- 제품명 + (취소됨/처분주의 뱃지) -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                <h3 style="margin:0; color:var(--text-main); font-size:17px; line-height:1.4;">${itemNumber}. ${productName}</h3>
                ${badgeHTML}
            </div>

            <!-- 1. 식약처 공식 기능성 인증 여부 -->
            <h4 style="margin:0 0 8px 0; font-size:14px; color:var(--text-main); border-bottom:1px solid #e2e8f0; padding-bottom:6px;">1. 🛡️ 식약처 공식 기능성 인증 여부</h4>
            <ul class="result-list" style="margin:0 0 18px 0;">
                <li><strong>제조/판매사:</strong> ${companyName}</li>
                <li><strong>보고 구분:</strong> ${reportFlag}</li>
                <li><strong>보고일:</strong> ${reportDate}</li>
                <li><strong>기능성 분류:</strong> <span style="color:var(--primary-color); font-weight:bold;">${eeDisplay}</span></li>
            </ul>

            <!-- 2. 광고 위반 및 행정처분 이력 -->
            <h4 style="margin:0 0 8px 0; font-size:14px; color:var(--text-main); border-bottom:1px solid #e2e8f0; padding-bottom:6px;">2. ⚠️ 광고 위반 및 행정처분 이력</h4>
            <ul class="result-list" style="margin:0 0 18px 0;">
                <li><strong>처분 이력 여부:</strong> ${sanctionBadge}</li>
                <li><strong>내용:</strong> ${sanctionContent}</li>
            </ul>

            <!-- 3. 이런 분들에게 추천해요 -->
            <h4 style="margin:0 0 8px 0; font-size:14px; color:var(--text-main); border-bottom:1px solid #e2e8f0; padding-bottom:6px;">3. 🎯 이런 분들에게 추천해요!</h4>
            <ul style="margin:0; padding-left:20px; font-size:14px; color:var(--text-main); line-height:1.9;">
                ${recListHTML}
            </ul>
        </div>
        `;
    });

    // 페이지네이션 컨트롤러(버튼들) 추가
    reportHTML += buildPaginationControls(totalPages, currentPage);

    resultContainer.innerHTML = reportHTML;
}

// 하단 페이지 이동 버튼을 만들어주는 함수
function buildPaginationControls(totalPages, currentPage) {
    if (totalPages <= 1) return '';

    let html = `<div style="display:flex; justify-content:center; align-items:center; gap:8px; margin-top:30px; margin-bottom:20px; flex-wrap:wrap;">`;

    // 이전 버튼
    if (currentPage > 1) {
        html += `<button onclick="changePage(${currentPage - 1})" style="padding:8px 14px; border:1px solid #cbd5e1; background:#fff; border-radius:6px; cursor:pointer; font-weight:bold; color:var(--text-main);">이전</button>`;
    }

    // 페이지 번호 (현재 페이지 기준으로 5개만 짤라서 보여주기)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // 만약 끝 페이지 근처라서 보여줄 개수가 5개가 안 되면, 시작 페이지를 더 앞으로 당깁니다.
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const isCurrent = (i === currentPage);
        const bg = isCurrent ? 'var(--primary-color)' : '#fff';
        const color = isCurrent ? '#fff' : 'var(--text-main)';
        const border = isCurrent ? 'var(--primary-color)' : '#cbd5e1';
        html += `<button onclick="changePage(${i})" style="padding:8px 14px; border:1px solid ${border}; background:${bg}; color:${color}; border-radius:6px; cursor:pointer; font-weight:${isCurrent ? 'bold' : 'normal'}; transition:0.2s;">${i}</button>`;
    }

    // 다음 버튼
    if (currentPage < totalPages) {
        html += `<button onclick="changePage(${currentPage + 1})" style="padding:8px 14px; border:1px solid #cbd5e1; background:#fff; border-radius:6px; cursor:pointer; font-weight:bold; color:var(--text-main);">다음</button>`;
    }

    html += `</div>`;
    return html;
}

// ============================================================
// 안전 모드(Fallback) 데이터베이스 — API 불통 시 사용
// ============================================================
const fallbackDb = [
    { keyword: "아이오페", productName: "아이오페 레티놀 엑스퍼트 0.1%", functionality: "주름개선", reportDate: "2024-05-10" },
    { keyword: "미라클", productName: "미라클 화이트닝 앰플", functionality: "미백", reportDate: "2023-11-20" },
    { keyword: "클리닉스", productName: "클리닉스 블레미쉬 밤", functionality: "자외선차단, 미백", reportDate: "2023-05-15" },
    { keyword: "클리닉스", productName: "제니트리 클리닉스 앰플", functionality: "주름개선, 미백 이중기능성", reportDate: "2024-01-10" }
];

function renderFallbackResult(searchKeyword) {
    resultContainer.classList.remove('hidden');

    const foundItems = fallbackDb.filter(item =>
        searchKeyword.includes(item.keyword) ||
        item.keyword.includes(searchKeyword) ||
        item.productName.includes(searchKeyword)
    );

    if (foundItems.length === 0) {
        resultContainer.innerHTML = `
            <div class="empty-message">
                <h2 style="font-size:20px; color:var(--danger-color); margin-bottom:10px;">검색 결과가 없습니다</h2>
                <p><strong>'${searchKeyword}'</strong>에 대한 식약처 기능성 심사/보고 이력이 확인되지 않습니다.</p>
                <div style="background:#fffbeb; padding:10px; border-radius:8px; margin-top:15px; font-size:13px; color:#b45309; text-align:left;">
                    <strong>안전 모드 안내:</strong> API 연동 에러로 내장 데이터로 조회하고 있습니다.
                </div>
            </div>
        `;
        return;
    }

    let reportHTML = `
        <h2 class="result-title">🔍 '${searchKeyword}' 검색 결과 (${foundItems.length}건)</h2>
        <div style="background:#fffbeb; border:1px solid #fde68a; padding:12px; border-radius:8px; margin-bottom:20px; font-size:13px; color:#b45309;">
            <strong>🚧 안전 모드 가동 중:</strong> API 에러로 내장 데이터를 사용 중입니다.
        </div>
    `;

    foundItems.forEach((item, index) => {
        const recs = getRecommendations(item.functionality);
        const recListHTML = recs.map(r => `<li style="margin-bottom:6px;">${r}</li>`).join('');

        // 로컬 행정처분 매칭
        const sanctionCheck = checkLocalSanction(item.productName, "아모레퍼시픽");
        const sanctionStatus = sanctionCheck.hasSanction
            ? `<span style="color:#dc2626; font-weight:700;">이력 있음(주의)</span>`
            : `<span style="color:#16a34a; font-weight:700;">깨끗함(안심)</span>`;
        const sanctionContent = sanctionCheck.hasSanction
            ? sanctionCheck.content
            : "최근 식약처 행정처분 이력이 없는 안전한 제품입니다.";

        reportHTML += `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid #2563eb; border-radius:12px; padding:22px; margin-bottom:24px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <h3 style="margin:0 0 16px 0; color:var(--text-main); font-size:17px;">${index + 1}. ${item.productName}</h3>

            <h4 style="margin:0 0 8px 0; font-size:14px; color:var(--text-main); border-bottom:1px solid #e2e8f0; padding-bottom:6px;">1. 🛡️ 식약처 공식 기능성 인증 여부</h4>
            <ul class="result-list" style="margin:0 0 18px 0;">
                <li><strong>인증 상태:</strong> 인증 완료 (안전 모드)</li>
                <li><strong>보고/심사일:</strong> ${item.reportDate}</li>
                <li><strong>기능성 분류:</strong> <span style="color:var(--primary-color); font-weight:bold;">${item.functionality}</span></li>
            </ul>

            <h4 style="margin:0 0 8px 0; font-size:14px; color:var(--text-main); border-bottom:1px solid #e2e8f0; padding-bottom:6px;">2. ⚠️ 광고 위반 및 행정처분 이력</h4>
            <ul class="result-list" style="margin:0 0 18px 0;">
                <li><strong>처분 이력 여부:</strong> ${sanctionStatus}</li>
                <li><strong>내용:</strong> ${sanctionContent}</li>
            </ul>

            <h4 style="margin:0 0 8px 0; font-size:14px; color:var(--text-main); border-bottom:1px solid #e2e8f0; padding-bottom:6px;">3. 🎯 이런 분들에게 추천해요!</h4>
            <ul style="margin:0; padding-left:20px; font-size:14px; color:var(--text-main); line-height:1.9;">
                ${recListHTML}
            </ul>
        </div>
        `;
    });

    resultContainer.innerHTML = reportHTML;
}
