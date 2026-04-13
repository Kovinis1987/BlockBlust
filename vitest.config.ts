import {defineConfig} from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        setupFiles: ["./test/setup.ts"],
        include: ["tests/unit/**/*.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "json-summary"],
            reportsDirectory: "./coverage",
            include: [
                "assets/script/**/*.ts"
            ],
            exclude: [
                "assets/script/**/AudioManager.ts",
                "assets/script/**/EffectManager.ts",
                "assets/script/**/PoolManager.ts",
                "assets/script/**/BoardViewService.ts",
                "assets/script/**/registerDefaultServices.ts"
            ],
            thresholds: {
                lines: 80,
                statements: 80,
                functions: 85,
                branches: 70
            }
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "assets/script")
        }
    }
});
