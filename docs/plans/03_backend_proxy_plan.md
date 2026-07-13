# 백엔드 프록시 서버 구축 계획

브라우저에서 직접 식약처에 통신을 시도했을 때 `Failed to fetch` 에러가 발생한 것은, 예상대로 식약처 서버가 '브라우저 직접 접근(CORS)'을 원천 차단하고 있기 때문입니다.

이 문제를 가장 확실하고 전문가답게 해결하기 위해, 수인님의 컴퓨터 안에 식약처 전용 **임시 우회 서버(Node.js 백엔드)**를 만들어 연결을 뚫고자 합니다.

> [!NOTE]
> 수인님의 컴퓨터에는 이미 서버를 구동할 수 있는 Node.js 환경(v26)이 설치되어 있어서 즉시 적용이 가능합니다.

## User Review Required

> [!IMPORTANT]
> **서버 구조 변경 동의**
> 기존에는 단순히 `index.html` 파일을 더블 클릭해서 열었지만, 앞으로는 제가 만들어드릴 `server.js`를 터미널에서 실행해서 접속하는 방식(`http://localhost:3000`)으로 바뀌게 됩니다. 이 방식에 동의하시나요?

## Proposed Changes

CORS 차단을 뚫기 위해 다음 파일들을 생성하고 수정합니다.

### [NEW] [server.js](file:///c:/Users/user/Desktop/Cosmeceuticals/server.js)
- 수인님 컴퓨터에 내장된 Node.js를 이용해, 식약처 서버에 몰래(서버 대 서버로) 질문을 던지고 답변을 받아오는 핵심 '우회 서버' 역할을 할 코드를 작성합니다. 외부 라이브러리 설치 없이 기본 기능만 사용합니다.

### [MODIFY] [app.js](file:///c:/Users/user/Desktop/Cosmeceuticals/app.js)
- 브라우저가 식약처로 바로 돌진하지 않고, 우리가 만든 안전한 중간 서버(`server.js`)에게 대신 물어보도록 요청 주소를 변경합니다.

## Verification Plan

1. 터미널(명령 프롬프트)에서 `node server.js` 명령어로 제가 만든 서버를 실행합니다.
2. 브라우저 주소창에 `http://localhost:3000`을 입력하여 앱에 접속합니다.
3. '클리닉스'를 검색하여 실시간 데이터가 화면에 완벽하게 뜨는지 확인합니다.
