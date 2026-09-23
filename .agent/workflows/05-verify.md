# Workflow: 05-verify.md

## 目的
確認目前實作是否完全符合 spec.md，並產出 verification-report.md。

## Rules (參照 verify.md)
1. 必須先閱讀 spec.md
2. 必須閱讀目前專案實作
3. 不得修改程式碼
4. 必須逐項檢查 Acceptance Criteria (AC-01 ~ AC-20)
5. 不得因為「大致可以」而判定 PASS
6. 未實際驗證的項目必須標記 UNKNOWN
7. FAIL 必須提供：
   - Requirement
   - Expected
   - Actual
   - Related Files
   - Suggested Fix

## Output
產出 `verification-report.md`。
