# Chipfolio — 盤後投資筆記

## 功能
- 新光、中信分帳交易紀錄，買進、賣出、實收股息。
- 移動平均成本；費用以實收金額填入；金額以分計算並分攤已售成本。
- 庫存、市值、已實現與未實現損益、股息、自選股票、JSON 匯出備份。
- 上市／上櫃每日收盤行情，個股未還原收盤走勢。
- 外資、投信、自營商買賣超；集保 400／1,000 張以上分級。
- 台指期盤後近月、費半、Nasdaq 100、TSM、NVDA、AMD、AVGO。

## 資料更新與界限
開啟網站時自動查詢，頁面停留且可見時每小時更新。這不是背景排程；關閉所有頁面後不會自動收集。行情與法人快取一小時，集保快取十二小時。手動更新會重新讀取快取或到期來源，避免反覆打到官方網站。

籌碼歷史自首次查詢開始累積；沒有補齊過去 5／20 日。比較不足時顯示資料不足。集保比較使用上次保存週次，明確標示比較日期。集保級距 12–15 合計為超過 400 張，15 級為超過 1,000 張；16 級差異調整、17 級合計不納入股東人數。

美股使用 Yahoo Finance 非官方 chart 端點，服務不保證可用。美東 17:00 前不採用當日日線，以避免把盘中當成收盤。台指期來源的日期為歸屬交易日，漲跌以官方參考價計算，不是直接和現貨收盤相比。各來源可能公布較慢，以畫面日期為準。

股票分割、減資、配股不自動調整；手動記帳適用一般現股交易。費率不推定。未實現損益不預扣未來卖出成本。無券商登入、無下單能力。首次沒有個人持股，預設自選不是持股。

## 安全與儲存
Sites 保持擁有人私人存取。API 在伺服器檢查登入。D1 portfolios 以使用者 ID 隔離資料；revision 條件更新避免多視窗覆寫。資料來源快取與歷史使用 D1。個人紀錄不放 localStorage。

## 開發
專案根目錄即此資料夾。Node 24.19 經驗證可建置；這台電腦的系統 Node 24.13 曾在 Vite production build 中止，請使用 Codex bundled Node 24.19。

```powershell
node scripts/run-framework.mjs dev
node node_modules/vite/bin/vite.js build
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/portfolio.test.ts
./scripts/test-api.ps1
```

初次安裝使用既有 package-lock.json 與 install:ci。Windows 若 npm shim 路徑錯誤，可使用安裝位置的 node_modules/npm/bin/npm-cli.js 執行 npm run install:ci。

本機資料庫：build 後依序執行 drizzle 遷移，使用 dist/server/wrangler.json 與 .wrangler/state；不重播已套用 SQL。本機登入由既有 Sites loopback 模擬登入提供。線上使用平台登入，不包含模擬身分。

## 驗證
- 四個計算／驗證測試：分批成本、部分賣出、整筆出清、分帳、日期、超賣。
- API 測試：新增與讀回、版本衝突、超賣拒絕、匿名拒絕；測試交易清除。
- 官方行情、上櫃、法人、集保、夜盤及六個海外來源實際讀取成功。
- WebMCP 已提供 read_portfolio 與 start_trade_entry；目前沒有可用 WebMCP 驗證環境，未宣稱已驗證。
- 未進行瀏覽器互動或視覺 QA；已完成 HTTP、型別與建置檢查。
