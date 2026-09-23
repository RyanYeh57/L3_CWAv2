# Workflow: 06-fix.md

## 目的
當驗證發現 FAIL 項目時，依照診斷與建議進行代碼修復與回歸測試。

## 執行規範
1. 針對 FAIL 項目定位問題根本原因 (Root Cause)。
2. 進行最小侵入性修復。
3. 執行 RE-TEST 與 RE-VERIFY，確認修復後無副作用。
