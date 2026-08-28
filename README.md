# 여행 기록 (tripSupport)

지도에 방문지 정보를 기록하고, 세계사 연표와 연동하며, 저장된 작가·책·사건을 마인드맵으로 탐색하는 개인용 여행 도우미 웹앱.

- 지도: Leaflet + OpenStreetMap. 빈 곳을 더블클릭하면 지역 추가, 마커를 더블클릭하면 수정, 한 번 클릭하면 정보 팝업.
- 연표: 지도 팝업의 "연표에서 보기"로 이동하면 해당 지역과 관련된 사건이 강조됩니다.
- 마인드맵: `@xyflow/react`로 지역·책·작가·사건 관계를 시각화. 노드를 클릭하면 수정/삭제할 수 있습니다.
- 데이터: Supabase(Postgres). 책 정보는 Google Books API에서 가져옵니다.

## 로컬 실행

1. 의존성 설치: `npm install`
2. `.env.local.example`을 `.env.local`로 복사하고 값을 채웁니다.
3. Supabase 프로젝트를 만들고 SQL Editor에서 `supabase/schema.sql`을 실행합니다.
4. `npm run dev` 후 `http://localhost:3000` 접속 → 설정한 `APP_PASSWORD`로 로그인.

## 환경 변수

| 이름 | 설명 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 키 (절대 클라이언트에 노출 금지) |
| `GOOGLE_BOOKS_API_KEY` | Google Books API 키 (선택, 없으면 익명 쿼터 사용) |
| `APP_PASSWORD` | 앱 접근 비밀번호 |

## Vercel 배포

1. GitHub 저장소를 만들어 이 프로젝트를 push합니다.
2. [Vercel](https://vercel.com/new)에서 해당 저장소를 import합니다.
3. Vercel 프로젝트 Settings → Environment Variables에 위 4개 값을 등록합니다.
4. Deploy 하면 push할 때마다 자동 배포됩니다.
