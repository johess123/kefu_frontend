/**
 * 驗證 src/utils/conversationCleaner.js（production 用的瀏覽器端清理）。
 *
 * 兩件事：
 *   1. 規則的單元測試（對應 Python 版的 34 個測試）
 *   2. 拿真實的 ../範例csv 跑一遍，印出報表 —— 數字必須跟 Python 版
 *      python -m scripts.faq_import_dryrun ../範例csv 完全一樣
 *
 * 不需要任何測試框架或新依賴：
 *   cd frontend && node scripts/verify_cleaner.mjs
 *   cd frontend && node scripts/verify_cleaner.mjs --expect=human=1038,auto=678,unanswered=425
 *
 * 上面那組數字對應 771 個檔案的 ../範例csv；換資料集時要一起更新。
 * 對照指令（backend 目錄下）：
 *   ..\test_venv_for_kefu\Scripts\python.exe -m scripts.faq_import_dryrun ..\範例csv
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    BroadcastStats, CleaningRun, DEFAULT_THRESHOLDS, FLAG_LABELS, REJECT_LABELS,
    TAG_LABELS, Tag, findBroadcastKeys, isLineExport, parseCsv, parseLineExport,
} from '../src/utils/conversationCleaner.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = join(HERE, '..', '..', '範例csv');

const LINE_HEADER =
    '帳號名稱,測試商家\n'
    + "時區,'+09:00\n"
    + '下載時間,2026/07/17 17:25\n'
    + '傳送者類型,傳送者名稱,傳送日期,傳送時間,內容\n';

const enc = new TextEncoder();
const lineCsv = (rows) => enc.encode('﻿' + LINE_HEADER + rows).buffer;

function runLine(files, thresholds) {
    const run = new CleaningRun(thresholds);
    for (const [name, rows] of Object.entries(files)) run.addFile(name, lineCsv(rows));
    return run.finalize();
}

// ---------------------------------------------------------------------------
// 測試
// ---------------------------------------------------------------------------

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ── 格式驗證與解析 ──────────────────────────────────────────────────────
test('LINE 匯出格式被辨識', () => {
    const rows = parseCsv(new TextDecoder().decode(lineCsv('User,客A,2026/07/01,10:00:00,你好\n')));
    assert.equal(isLineExport(rows), true);
});

test('非 LINE 檔案被明確擋掉', () => {
    const other = enc.encode('ticket_id,建立時間,發送人,訊息\nT001,2026/03/01 10:00:00,王小明,退貨\n').buffer;
    const { messages, warnings } = parseLineExport('tickets.csv', other);
    assert.equal(messages.length, 0);
    assert.ok(warnings[0].includes('不是 LINE 官方帳號匯出的聊天紀錄'));
});

test('跨行的引號欄位不會被切成多列', () => {
    const rows = parseCsv('a,b\n"第一行\n第二行",x\n');
    assert.equal(rows.length, 2);
    assert.equal(rows[1][0], '第一行\n第二行');
    assert.equal(rows[1][1], 'x');
});

test('檔頭時區有生效（+09:00 的 10:00 = 台北 09:00）', () => {
    const { messages } = parseLineExport('c1.csv', lineCsv('User,客A,2026/07/01,10:00:00,你好\n'));
    // 09:00+08:00 == 01:00 UTC
    assert.equal(new Date(messages[0].ts).toISOString(), '2026-07-01T01:00:00.000Z');
});

test('對話 ID 取自檔名', () => {
    const { messages } = parseLineExport('U1234abcd.csv', lineCsv('User,客A,2026/07/01,10:00:00,你好\n'));
    assert.equal(messages[0].conversationId, 'U1234abcd');
});

test('傳送者類型非 User/Account 一律忽略並留警告', () => {
    const r = runLine({ 'c1.csv': 'Robot,x,2026/07/01,10:00:00,嗨\n' });
    assert.equal(r.report.tagCounts[Tag.IGNORE_ROLE], 1);
    assert.ok(r.report.warnings.some(w => w.includes('非 User/Account')));
});

test('只有標題列的檔案算「無對話紀錄」，不是失敗', () => {
    // 實測 771 個真實檔案裡有 181 個是這種（從未對話過的好友）
    const r = runLine({ 'c1.csv': '', 'c2.csv': 'User,客A,2026/07/01,10:00:00,你好\n' });
    assert.equal(r.report.emptyFiles, 1);
    assert.equal(r.report.failedFiles, 0);
});

test('parseLineExport 回報 status 區分沒對話與格式錯', () => {
    assert.equal(parseLineExport('c1.csv', lineCsv('')).status, 'empty');
    assert.equal(parseLineExport('x.csv', enc.encode('a,b\n1,2\n').buffer).status, 'invalid');
});

test('問題本身只是附和語 → 不成立', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,謝謝\n'
            + 'Account,小美,2026/07/01,10:20:00,不會喔，有需要再問我們\n'
    });
    assert.equal(r.pairs.length, 0);
    assert.equal(r.unanswered[0].reason, 'question_courtesy');
});

test('同樣板只差流水號的系統通知不會被當答案', () => {
    const files = {};
    ['退貨', '運費', '尺寸'].forEach((q, i) => {
        files[`c${i}.csv`] =
            `User,客${i},2026/07/01,10:00:00,${q}\n`
            + `Account,小美,2026/07/01,10:12:0${i},"訂單 #2025011316040583${i}：\n訂單狀態已更新為「處理中」。"\n`;
    });
    const r = runLine(files);
    assert.equal(r.report.systemNoticeGroups, 3);
    assert.equal(r.report.tagCounts[Tag.SYSTEM_NOTICE], 3);
    assert.equal(r.report.rawPairsByBucket.human, 0);
});

test('真人重複貼同一段話術不會被當系統通知', () => {
    // 這條是防守用的：不能因為想抓系統通知就誤殺人工答案
    const files = {};
    ['退貨', '運費', '尺寸'].forEach((q, i) => {
        files[`c${i}.csv`] =
            `User,客${i},2026/07/01,10:00:00,${q}\n`
            + 'Account,小美,2026/07/01,10:12:00,您好，請提供訂單編號讓我們為您查詢，謝謝您。\n';
    });
    const r = runLine(files);
    assert.equal(r.report.systemNoticeGroups, 0);
});

// ── 組 Q ────────────────────────────────────────────────────────────────
test('非問句的使用者訊息也能成為 Q', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,退貨\n'
            + 'Account,小美,2026/07/01,10:20:00,退貨請於七天內告知訂單編號，我們會安排取件。\n'
    });
    assert.equal(r.pairs.length, 1);
    assert.equal(r.pairs[0].question, '退貨');
    assert.equal(r.pairs[0].bucket, 'human');
});

test('連續使用者訊息合併成一個 Q', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,尺寸怎麼選\n'
            + 'User,客A,2026/07/01,10:01:00,我平常穿M\n'
            + 'Account,小美,2026/07/01,10:30:00,平常穿 M 建議選 L 會比較舒適喔。\n'
    });
    assert.equal(r.pairs.length, 1);
    assert.equal(r.pairs[0].question, '尺寸怎麼選\n我平常穿M');
});

test('連點同一個選單三次，合併後去重成一句', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,綁定說明\n'
            + 'User,客A,2026/07/01,10:00:30,綁定說明\n'
            + 'User,客A,2026/07/01,10:01:00,綁定說明\n'
            + 'Account,小美,2026/07/01,10:30:00,請先登入會員中心後點選傳送到LINE。\n'
    });
    assert.equal(r.pairs[0].question, '綁定說明');
});

test('隔一天問同一句 = 兩個問題，去重後 frequency=2', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,有貨嗎\n'
            + 'Account,小美,2026/07/01,10:30:00,這款目前有現貨喔，可以直接下單。\n'
            + 'User,客A,2026/07/02,10:00:00,有貨嗎\n'
            + 'Account,小美,2026/07/02,10:30:00,這款目前有現貨喔，可以直接下單。\n'
    });
    assert.equal(r.report.rawPairsByBucket.human, 2);
    assert.equal(r.pairs.length, 1);
    assert.equal(r.pairs[0].frequency, 2);
});

// ── 等待與合併門檻 ──────────────────────────────────────────────────────
test('真人隔 20 小時回仍成立（客服可能隔夜回）', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,運費多少\n'
            + 'Account,小美,2026/07/02,06:00:00,單筆滿千免運，未滿千運費 80 元。\n'
    });
    assert.equal(r.pairs.length, 1);
});

test('隔 2 天回超過等待門檻 → 不成立', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,運費多少\n'
            + 'Account,小美,2026/07/03,10:00:00,單筆滿千免運，未滿千運費 80 元。\n'
    });
    assert.equal(r.pairs.length, 0);
    assert.equal(r.unanswered.length, 1);
});

test('晚上的群發不會被併進當天的答案', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,退貨怎麼辦\n'
            + 'Account,小美,2026/07/01,10:20:00,退貨請於七天內告知訂單編號。\n'
            + 'Account,小美,2026/07/01,20:05:00,本週全館八折優惠中，快來看看！\n'
    });
    assert.equal(r.pairs.length, 1);
    assert.ok(!r.pairs[0].answer.includes('八折'));
});

// ── 群發 ────────────────────────────────────────────────────────────────
test('前面沒有使用者訊息的客服訊息 = 群發', () => {
    const r = runLine({
        'c1.csv':
            'Account,小美,2026/07/01,08:00:00,親愛的會員，本週全館八折優惠中！\n'
            + 'User,客A,2026/07/01,10:00:00,退貨怎麼辦\n'
            + 'Account,小美,2026/07/01,10:20:00,退貨請於七天內告知訂單編號。\n'
    });
    const msgs = [...new CleaningRun().constructor.prototype ? [] : []]; // 佔位，不使用
    assert.equal(r.report.tagCounts[Tag.BROADCAST], 1);
    assert.equal(r.pairs.length, 1);
});

test('內容重複且觸發語多樣 = 群發', () => {
    const promo = 'Account,小美,2026/07/01,20:05:00,限時優惠！全館八折只到週日，錯過不再有。\n';
    const questions = ['有現貨嗎', '尺寸怎麼選', '可以退貨嗎', '運費多少', '多久到貨'];
    const files = {};
    questions.forEach((q, i) => {
        files[`c${i + 1}.csv`] = `User,客${i + 1},2026/07/01,10:00:00,${q}\n` + promo;
    });
    const r = runLine(files);
    assert.ok(r.report.broadcastContentGroups >= 1);
    assert.equal(r.report.rawPairsByBucket.human, 0);
    assert.equal(r.report.tagCounts[Tag.BROADCAST], 5);
});

test('重複的自動回應不可被誤殺（第二桶會整桶消失）', () => {
    const files = {};
    for (let i = 1; i <= 50; i += 1) {
        files[`c${i}.csv`] =
            `User,客${i},2026/07/01,10:00:00,折扣碼\n`
            + 'Account,自動回應訊息,2026/07/01,10:00:01,折扣代碼 HOLIDAY888，結帳時輸入即可折抵。\n';
    }
    const r = runLine(files);
    assert.equal(r.report.broadcastContentGroups, 0);
    assert.equal(r.report.rawPairsByBucket.auto_reply, 50);
    assert.equal(r.pairs.length, 1);
    assert.equal(r.pairs[0].frequency, 50);
});

test('重複的真人話術也不可被誤殺', () => {
    const files = {};
    for (let i = 1; i <= 50; i += 1) {
        files[`c${i}.csv`] =
            `User,客${i},2026/07/01,10:00:00,運費多少\n`
            + 'Account,小美,2026/07/01,10:30:00,單筆滿千免運，未滿千運費 80 元。\n';
    }
    const r = runLine(files);
    assert.equal(r.report.broadcastContentGroups, 0);
    assert.equal(r.report.rawPairsByBucket.human, 50);
});

test('群發統計分批餵 = 一次餵到底', () => {
    const promo = '限時優惠！全館八折只到週日，錯過不再有。';
    const questions = ['有現貨嗎', '尺寸怎麼選', '可以退貨嗎', '運費多少', '多久到貨'];
    const base = Date.UTC(2026, 6, 1, 2, 0, 0);       // 台北 10:00
    const late = Date.UTC(2026, 6, 1, 12, 5, 0);      // 台北 20:05
    const convs = questions.map((q, i) => ([
        { conversationId: `c${i}`, rowIndex: 1, ts: base, role: 'user', sender: '客', content: q, tag: Tag.KEEP },
        { conversationId: `c${i}`, rowIndex: 2, ts: late, role: 'agent', sender: '小美', content: promo, tag: Tag.KEEP },
    ]));
    const atOnce = findBroadcastKeys(convs, DEFAULT_THRESHOLDS);
    const stats = new BroadcastStats(DEFAULT_THRESHOLDS);
    for (const c of convs) stats.add(c);
    assert.deepEqual([...stats.keys()].sort(), [...atOnce].sort());
    assert.equal(atOnce.size, 1);
});

// ── 自動回應桶 ──────────────────────────────────────────────────────────
test('傳送者名稱是自動回應 → 第二桶', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,綁定說明\n'
            + 'Account,自動回應訊息,2026/07/01,10:00:01,請先登入會員中心後點選傳送到LINE。\n'
    });
    assert.equal(r.pairs.length, 1);
    assert.equal(r.pairs[0].bucket, 'auto_reply');
});

test('秒回視為機器', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,折扣碼\n'
            + 'Account,Unknown,2026/07/01,10:00:02,折扣代碼 HOLIDAY888，結帳時輸入即可折抵。\n'
    });
    assert.equal(r.pairs[0].bucket, 'auto_reply');
});

test('真人回覆優先於自動回應', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,尺寸怎麼選\n'
            + 'Account,自動回應訊息,2026/07/01,10:00:01,請參考商品頁尺寸表。\n'
            + 'Account,小美,2026/07/01,10:20:00,平常穿 M 建議選 L 會比較舒適喔。\n'
    });
    assert.equal(r.pairs.length, 1);
    assert.equal(r.pairs[0].bucket, 'human');
    assert.ok(r.pairs[0].answer.includes('建議選 L'));
});

// ── 答案判定 ────────────────────────────────────────────────────────────
test('佔位符訊息被標成無內容', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,照片已傳送\n'
            + 'Account,小美,2026/07/01,10:20:00,貼圖已傳送\n'
    });
    assert.equal(r.report.tagCounts[Tag.NO_CONTENT], 2);
    assert.equal(r.pairs.length, 0);
});

test('只有網址的回覆不成立', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,綁定說明\n'
            + 'Account,小美,2026/07/01,14:00:00,https://example.com/guide\n'
    });
    assert.equal(r.pairs.length, 0);
    assert.equal(r.unanswered[0].reason, 'answer_url');
});

test('只有附和語的回覆不成立，且保留原文供調門檻', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,折扣碼\n'
            + 'Account,小美,2026/07/01,14:00:00,好的\n'
    });
    assert.equal(r.unanswered[0].reason, 'answer_courtesy');
    assert.equal(r.unanswered[0].answerPreview, '好的');
});

test('短但有資訊的答案要採用（折扣碼）', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,過年紅包折扣碼\n'
            + 'Account,小美,2026/07/01,14:00:00,NEWYEAR88\n'
    });
    assert.equal(r.pairs.length, 1);
    assert.equal(r.pairs[0].answer, 'NEWYEAR88');
    assert.ok(r.pairs[0].flags.includes('short_answer'));
});

test('回音不成立', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,12\n'
            + 'Account,小美,2026/07/01,14:00:00,12\n'
    });
    assert.equal(r.unanswered[0].reason, 'answer_echo');
});

test('問卷表單流程不成立（問題欄是使用者填的個資）', () => {
    // 實測第二桶有 206 組（30%）是這種，Q 欄裡是姓名、生日、手機號碼
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,0983968503\n'
            + 'Account,自動回應訊息,2026/07/01,10:00:01,☑️ ☑️ ⬜ 您註冊會員的 Email 信箱是？\n'
    });
    assert.equal(r.pairs.length, 0);
    assert.equal(r.unanswered[0].reason, 'form_step');
});

test('答案裡只有一個勾選符號不算表單流程', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,退貨條件是什麼\n'
            + 'Account,小美,2026/07/01,10:20:00,☑️ 七天內、未下水、保持原包裝即可辦理退貨。\n'
    });
    assert.equal(r.pairs.length, 1);
});

test('合併後每段都是附和語 → 不成立', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,好的\n'
            + 'User,客A,2026/07/01,10:00:30,謝謝\n'
            + 'Account,小美,2026/07/01,10:20:00,不會喔，有需要再問我們，祝您順心。\n'
    });
    assert.equal(r.pairs.length, 0);
    assert.equal(r.unanswered[0].reason, 'question_courtesy');
});

test('附和語開頭但後面有真問題 → 要留著', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,好的\n'
            + 'User,客A,2026/07/01,10:00:30,那小蘇打粉的份量都可以嗎\n'
            + 'Account,小美,2026/07/01,10:20:00,小蘇打粉加水建議比例是 1%，1g 兌 100ml。\n'
    });
    assert.equal(r.pairs.length, 1);
});

test('只有符號的回覆不成立', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,問卷\n'
            + 'Account,小美,2026/07/01,14:00:00,"🎉🎉🎉"\n'
    });
    assert.equal(r.unanswered[0].reason, 'answer_symbol');
});

test('匯出記錄重複不會被當成回覆', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:22:33,你是誰?\n'
            + 'Account,客A,2026/07/01,10:29:15,LINE已完成綁定\n'
            + 'User,客A,2026/07/01,10:29:34,LINE已完成綁定\n'
    });
    assert.equal(r.report.tagCounts[Tag.ECHO], 1);
    assert.equal(r.report.rawPairsByBucket.human, 0);
});

test('客服只回圖片 → 與「沒回」分開列', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,尺寸表在哪\n'
            + 'Account,小美,2026/07/01,10:20:00,照片已傳送\n'
    });
    assert.equal(r.unanswered[0].reason, 'answer_image');
});

test('文字＋圖片 → 取文字並標記回答有附圖', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,尺寸表在哪\n'
            + 'Account,小美,2026/07/01,10:20:00,照片已傳送\n'
            + 'Account,小美,2026/07/01,10:21:00,尺寸表在這張圖裡，肩寬請量水平距離。\n'
    });
    assert.equal(r.pairs.length, 1);
    assert.ok(r.pairs[0].flags.includes('had_image'));
});

test('一則訊息問了兩件事 → 標記「問題含多個主題」', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,報價單含打樣嗎?交期大概多久呢?\n'
            + 'Account,小美,2026/07/01,10:20:00,報價單含打樣費用，交期約 14 個工作天。\n'
    });
    assert.ok(r.pairs[0].flags.includes('long_question'));
});

test('網址不算進問題長度', () => {
    // 實測 60~100 字那批大多是「商品網址 + 一句短問題」，不是多主題
    const url = 'https://www.example.com/products/' + 'a'.repeat(90);
    const r = runLine({
        'c1.csv':
            `User,客A,2026/07/01,10:00:00,${url} 這個尺寸有現貨嗎\n`
            + 'Account,小美,2026/07/01,10:20:00,這款目前有現貨，可以直接下單喔。\n'
    });
    assert.ok(!r.pairs[0].flags.includes('long_question'));
});

test('文字類標記不跨去重取聯集', () => {
    // 去重後只留代表那份文字，標記就該只描述那份
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,運費多少\n'
            + 'Account,小美,2026/07/01,10:20:00,單筆滿千免運，未滿千運費 80 元。\n'
            + 'User,客A,2026/07/02,10:00:00,運費?多少?\n'
            + 'Account,小美,2026/07/02,10:20:00,單筆滿千免運，未滿千運費 80 元。\n'
    });
    assert.equal(r.pairs.length, 1);
    assert.equal(r.pairs[0].frequency, 2);
    assert.ok(!r.pairs[0].flags.includes('long_question'));
});

test('情境類標記相反：其中一次有附圖就要提醒', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,尺寸表在哪\n'
            + 'Account,小美,2026/07/01,10:20:00,尺寸表在商品頁下方，肩寬請量水平距離。\n'
            + 'User,客A,2026/07/02,10:00:00,尺寸表在哪\n'
            + 'Account,小美,2026/07/02,10:20:00,照片已傳送\n'
            + 'Account,小美,2026/07/02,10:21:00,尺寸表在商品頁下方，肩寬請量水平距離。\n'
    });
    assert.equal(r.pairs.length, 1);
    assert.ok(r.pairs[0].flags.includes('had_image'));
});

test('限時內容只標記不擋掉', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,有優惠嗎\n'
            + 'Account,小美,2026/07/01,10:20:00,限時優惠！全館八折只到週日，錯過不再有。\n'
    });
    assert.equal(r.pairs.length, 1);
    assert.ok(r.pairs[0].flags.includes('time_sensitive'));
});

test('等待很久要標記出來人工複查', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,有優惠嗎\n'
            + 'Account,小美,2026/07/01,21:00:00,我們近期推出全家福優惠活動，歡迎參考。\n'
    });
    assert.equal(r.pairs.length, 1);
    assert.ok(r.pairs[0].flags.includes('long_wait'));
});

test('商家原文的全形標點要保留', () => {
    const r = runLine({
        'c1.csv':
            'User,客A,2026/07/01,10:00:00,退貨\n'
            + 'Account,小美,2026/07/01,10:20:00,您好，退貨請於七天內告知訂單編號？\n'
    });
    assert.ok(r.pairs[0].answer.includes('，'));
    assert.ok(r.pairs[0].answer.includes('？'));
});

test('壞掉的時間欄不會讓排序爆掉', () => {
    const r = runLine({
        'c1.csv':
            'User,客C,,,壞掉的時間\n'
            + 'User,客C,2026/07/01,10:00:00,尺寸怎麼選\n'
            + 'Account,小美,2026/07/01,10:30:00,平常穿 M 建議選 L 會比較舒適喔。\n'
    });
    assert.equal(r.report.uniquePairsByBucket.human, 1);
});

// ---------------------------------------------------------------------------
// 執行
// ---------------------------------------------------------------------------

let failed = 0;
for (const { name, fn } of tests) {
    try {
        fn();
        console.log(`  ok   ${name}`);
    } catch (e) {
        failed += 1;
        console.log(`  FAIL ${name}\n       ${e.message.split('\n')[0]}`);
    }
}
console.log(`\n${tests.length - failed} / ${tests.length} 通過`);

// ---------------------------------------------------------------------------
// 跑真實範例檔，印出可與 Python 版逐項比對的報表
// ---------------------------------------------------------------------------

if (!existsSync(SAMPLE_DIR)) {
    console.log(`\n找不到 ${SAMPLE_DIR}，跳過真實檔案比對`);
    process.exit(failed ? 1 : 0);
}

const csvFiles = readdirSync(SAMPLE_DIR).filter(f => f.toLowerCase().endsWith('.csv'));
const run = new CleaningRun();
for (const name of csvFiles) {
    const buf = readFileSync(join(SAMPLE_DIR, name));
    run.addFile(name, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}
const { pairs, unanswered, report } = run.finalize();

const pct = (n) => (report.messages ? `${((n / report.messages) * 100).toFixed(1)}%` : '-');
console.log('\n' + '='.repeat(62));
console.log(` 清理報表（JS 版，應與 Python dry run 完全一致）`);
console.log('='.repeat(62));
console.log(` 檔案：${report.files} 個（無對話紀錄 ${report.emptyFiles}／失敗 ${report.failedFiles}）`
    + `　對話：${report.conversations} 段`);
console.log(` 訊息：${report.messages} 則（使用者 ${report.roles.user} / 客服 ${report.roles.agent}`
    + ` / 無法識別 ${report.roles.ignore}）`);
console.log('\n 訊息標記');
for (const [key, label] of Object.entries(TAG_LABELS)) {
    const c = report.tagCounts[key] || 0;
    console.log(`   ${label.padEnd(16, '　')} ${String(c).padStart(7)} 則  ${pct(c)}`);
}
console.log('\n 產出');
console.log(`   第一桶 真人回覆 QA   ${String(report.rawPairsByBucket.human).padStart(7)} 組`
    + ` → 去重後 ${report.uniquePairsByBucket.human} 組`);
console.log(`   第二桶 自動回應 QA   ${String(report.rawPairsByBucket.auto_reply).padStart(7)} 組`
    + ` → 去重後 ${report.uniquePairsByBucket.auto_reply} 組`);
console.log(`   沒人回的問題         ${String(report.rawUnanswered).padStart(7)} 組`
    + ` → 去重後 ${report.uniqueUnanswered} 組`);
console.log('\n 未成立原因');
for (const [key, label] of Object.entries(REJECT_LABELS)) {
    const c = report.rejectCounts[key] || 0;
    if (c) console.log(`   ${label.padEnd(16, '　')} ${String(c).padStart(7)} 組`);
}
if (Object.keys(report.flagCounts).length) {
    console.log('\n 已採用但建議人工確認');
    for (const [key, label] of Object.entries(FLAG_LABELS)) {
        const c = report.flagCounts[key] || 0;
        if (c) console.log(`   ${label.padEnd(16, '　')} ${String(c).padStart(7)} 組`);
    }
}
console.log(`\n 群發內容樣板數：${report.broadcastContentGroups} 種`
    + `　系統通知樣板數：${report.systemNoticeGroups} 種`);
console.log('='.repeat(62));

// --expect human=1,auto=42,unanswered=5 → 直接把 Python 的數字釘死在 CI 裡
const expectArg = process.argv.find(a => a.startsWith('--expect'));
if (expectArg) {
    const raw = expectArg.includes('=') ? expectArg.split('=').slice(1).join('=') : process.argv[process.argv.indexOf(expectArg) + 1];
    const want = Object.fromEntries(raw.split(',').map(kv => {
        const [k, v] = kv.split('=');
        return [k.trim(), Number(v)];
    }));
    const got = {
        human: report.uniquePairsByBucket.human,
        auto: report.uniquePairsByBucket.auto_reply,
        unanswered: report.uniqueUnanswered,
    };
    for (const [k, v] of Object.entries(want)) {
        if (got[k] !== v) {
            console.log(`\nFAIL 與 Python 版不一致：${k} 期望 ${v}，實際 ${got[k]}`);
            failed += 1;
        }
    }
    if (!failed) console.log('\n與 Python 版數字一致 ✓');
}

console.log(`\n樣本（第一桶 ${Math.min(2, pairs.length)} 組 / 未成立 ${Math.min(3, unanswered.length)} 組）`);
for (const p of pairs.filter(x => x.bucket === 'human').slice(0, 2)) {
    console.log(`  [${p.conversationId} 列 ${p.qRows}→${p.aRows}｜${p.flags.join(',')}]`);
    console.log(`    Q: ${p.question.slice(0, 60)}`);
    console.log(`    A: ${p.answer.slice(0, 60)}`);
}
for (const u of unanswered.slice(0, 3)) {
    console.log(`  [${u.frequency} 次｜${REJECT_LABELS[u.reason]}] ${u.question.slice(0, 40)}`);
}

process.exit(failed ? 1 : 0);
