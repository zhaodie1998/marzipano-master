import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 测试环境
    environment: 'jsdom',
    
    // 测试文件匹配模式
    include: [
      'src/**/*.test.js',
      'src/**/*.property.test.js'
    ],
    
    // 全局设置
    globals: true,
    
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/**/index.js']
    },
    
    // 超时设置
    testTimeout: 10000,
    
    // 属性测试默认迭代次数
    fuzz: {
      numRuns: 100
    }
  }
});
