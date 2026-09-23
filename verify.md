# Workflow: Verify

## Goal

確認目前實作是否完全符合 spec.md。

## Rules

1. 必須先閱讀 spec.md
2. 必須閱讀目前專案實作
3. 不得修改程式碼
4. 必須逐項檢查 Acceptance Criteria
5. 不得因為「大致可以」而判定 PASS
6. 未實際驗證的項目必須標記 UNKNOWN
7. FAIL 必須提供：
   - Requirement
   - Expected
   - Actual
   - Related Files
   - Suggested Fix

## Output

建立：

verification-report.md

格式：

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| AC-01 | FastAPI 啟動 | PASS | ... |
| AC-02 | Map 顯示 | PASS | ... |
| AC-03 | 22 cities | FAIL | ... |

最後：

PASS:
X

FAIL:
Y

UNKNOWN:
Z