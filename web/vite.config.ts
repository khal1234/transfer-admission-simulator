import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
