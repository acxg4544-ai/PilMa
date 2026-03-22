import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts", // 서비스 워커 소스 파일 경로
  swDest: "public/sw.js", // 빌드 시 생성될 파일 경로
  disable: process.env.NODE_ENV !== "production", // 다시 활성화
});

export default withSerwist({
  // Next.js 추가 설정
});
