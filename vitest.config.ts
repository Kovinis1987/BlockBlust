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
                "assets/Script/Service/**/*.ts",
                "assets/Script/Component/GridModel.ts",
                "assets/Script/Enum/**/*.ts"
            ],
            exclude: [
                "assets/Script/**/AudioManager.ts",
                "assets/Script/**/EffectManager.ts",
                "assets/Script/**/PoolManager.ts",
                "assets/Script/**/BoardViewService.ts",
                "assets/Script/**/registerDefaultServices.ts"
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
            "@": path.resolve(__dirname, "assets/Script")
        }
    }
});
