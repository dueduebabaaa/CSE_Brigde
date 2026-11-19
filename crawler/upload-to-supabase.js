
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { getCategory, getMatchedNoticeTypes, isTargetNotice } from "./notice-filter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 프로젝트 최상위 폴더의 .env 읽기
dotenv.config({
    path: path.resolve(__dirname, "../.env"),
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ .env의 Supabase 연결 정보를 확인해 주세요.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function makeSummary(content) {
    if (!content) {
        return "원문 공지에서 상세 내용을 확인해 주세요.";
    }

    const cleaned = content
        .replace(/\s+/g, " ")
        .replace(/붙임\s*\d*\.?.*$/g, "")
        .trim();

    const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
    let summary = sentences.slice(0, 2).join(" ");

    if (!summary) summary = cleaned;
    if (summary.length > 220) {
        summary = summary.slice(0, 220).trim() + "...";
    }

    return summary || "원문 공지에서 상세 내용을 확인해 주세요.";
}

function toISODate(year, month, day) {
    const date = new Date(
        Date.UTC(Number(year), Number(month) - 1, Number(day))
    );

    if (
        date.getUTCFullYear() !== Number(year) ||
        date.getUTCMonth() !== Number(month) - 1 ||
        date.getUTCDate() !== Number(day)
    ) return null;

    return date.toISOString();
}

function extractDeadline(content, createdAt) {
    if (!content) return null;

    const yearMatch = String(createdAt || "").match(/^(\d{4})/);
    const defaultYear = yearMatch ? Number(yearMatch[1]) : null;

    const patterns = [
        /(?:마감|마감일|접수\s*종료|신청\s*종료|제출\s*기한|까지)[^0-9]{0,20}(\d{4})[.\-/년 ]+\s*(\d{1,2})[.\-/월 ]+\s*(\d{1,2})일?/i,
        /(?:마감|마감일|접수\s*종료|신청\s*종료|제출\s*기한|까지)[^0-9]{0,20}(\d{1,2})월\s*(\d{1,2})일/,
    ];

    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (!match) continue;

        if (match.length === 4) {
            return toISODate(match[1], match[2], match[3]);
        }

        if (match.length === 3 && defaultYear) {
            return toISODate(defaultYear, match[1], match[2]);
        }
    }

    return null;
}

function convertNotice(notice) {
    const deadline = extractDeadline(
        notice.content,
        notice.created_at
    );

    return {
        title: notice.title,
        description: notice.content?.trim() || makeSummary(notice.content),
        category: getCategory(notice.title, notice.content),
        tags: getMatchedNoticeTypes(notice),
        organizer: "경북대학교 컴퓨터학부",
        posted_at: notice.created_at
            ? new Date(`${notice.created_at}T00:00:00+09:00`).toISOString()
            : null,
        application_start: null,
        deadline,
        source_type: "knu_cse_official",
        source_post_id: String(notice.source_id),
        source_url: notice.source_url,
        application_url: null,
        source_updated_at: null,
        status: deadline ? "active" : "needs_confirmation",
    };
}

async function getExistingIds(ids) {
    const existingIds = new Set();

    for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);

        const { data, error } = await supabase
            .from("opportunities")
            .select("source_post_id")
            .in("source_post_id", batch);

        if (error) throw error;

        for (const row of data || []) {
            existingIds.add(row.source_post_id);
        }
    }

    return existingIds;
}

async function writeCrawlingLog(
    status,
    newCount,
    updatedCount,
    errorMessage = null
) {
    const { error } = await supabase
        .from("crawling_logs")
        .insert({
            status,
            new_items_count: newCount,
            updated_items_count: updatedCount,
            error_message: errorMessage,
            triggered_by: "admin_manual",
        });

    if (error) {
        console.error("⚠️ 크롤링 로그 저장 실패:", error.message);
    }
}

async function main() {
    console.log("==================================");
    console.log(" KNU 컴퓨터학부 공지 업로드 시작");
    console.log("==================================");

    let newCount = 0;
    let updatedCount = 0;

    try {
        const jsonPath = path.join(__dirname, "notices.json");

        if (!fs.existsSync(jsonPath)) {
            throw new Error("crawler/notices.json 파일을 찾을 수 없습니다.");
        }

        const jsonData = JSON.parse(
            fs.readFileSync(jsonPath, "utf-8")
        );

        if (!Array.isArray(jsonData.notices)) {
            throw new Error("JSON의 notices 배열을 찾을 수 없습니다.");
        }

        console.log(`전체 공지: ${jsonData.notices.length}개`);

        const targets = jsonData.notices.filter(isTargetNotice);

        console.log(`수집 대상 공지: ${targets.length}개`);
        console.log(
            `제외된 공지: ${jsonData.notices.length - targets.length}개`
        );

        if (targets.length === 0) {
            console.log("수집 조건에 맞는 공지가 없습니다.");
            await writeCrawlingLog("success", 0, 0);
            return;
        }

        const rows = targets.map(convertNotice);
        const ids = rows.map((row) => row.source_post_id);
        const existingIds = await getExistingIds(ids);

        newCount = rows.filter(
            (row) => !existingIds.has(row.source_post_id)
        ).length;

        updatedCount = rows.length - newCount;

        const { error } = await supabase
            .from("opportunities")
            .upsert(rows, {
                onConflict: "source_post_id",
            });

        if (error) throw error;

        await writeCrawlingLog("success", newCount, updatedCount);

        console.log("----------------------------------");
        console.log("✅ Supabase 업로드 완료!");
        console.log(`신규 등록: ${newCount}개`);
        console.log(`기존 수정: ${updatedCount}개`);
        console.log("----------------------------------");
    } catch (error) {
        console.error("❌ 업로드 실패:", error.message);

        await writeCrawlingLog(
            "failed",
            newCount,
            updatedCount,
            error.message
        );

        process.exitCode = 1;
    }
}

main();
