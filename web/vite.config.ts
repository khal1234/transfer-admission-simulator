import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 빌드한 시각. 화면 코드에는 __BUILD_ID__ 로, 서버에는 version.json 으로 같이 나간다.
// 열어 둔 화면이 둘을 견줘 자기가 옛 판인지 알아챈다(src/utils/staleBuild.ts).
const BUILD_ID = new Date().toISOString()

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'emit-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ buildId: BUILD_ID }),
        })
      },
    },
  ],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  build: {
    // 입결 스냅샷은 앱 코드보다 훨씬 자주 그대로 유지된다. 별도 청크로 두면
    // UI만 배포할 때 브라우저가 약 1MB의 데이터 모듈 캐시를 재사용할 수 있다.
    chunkSizeWarningLimit: 1_000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "admission-data",
              test: /[\\/]src[\\/]data[\\/]편입_성적_통합\.json$/,
            },
          ],
        },
      },
    },
  },
})
