
import * as cheerio from "cheerio";
import fs from "node:fs/promises";

const BOARD_URL =
    "https://computer.knu.ac.kr/bbs/board.php?bo_table=sub6_1_a&lang=kor";

const MAX_PAGES = 3;
const DELAY = 500;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function crawlNotices() {
    try {
        console.log("컴퓨터학부 공지사항 수집 시작!");

        const notices = [];

        // 1. 여러 페이지의 공지사항 목록 수집
        for (let page = 1; page <= MAX_PAGES; page++) {
            console.log(`\n===== ${page}페이지 목록 수집 =====`);

            const pageUrl = new URL(BOARD_URL);
            pageUrl.searchParams.set("page", page);

            const response = await fetch(pageUrl.href, {
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            });

            if (!response.ok) {
                console.log(`${page}페이지 수집 실패`);
                continue;
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            let pageCount = 0;

            $(".bo_tit").each((index, element) => {
                const titleElement = $(element).find("a").first();

                const href = titleElement.attr("href");
                const title = titleElement.text().trim();

                if (!href || !title) return;

                const url = new URL(href, BOARD_URL);
                const postId = url.searchParams.get("wr_id");

                if (!postId) return;

                if (notices.some(n => n.source_id === postId)) {
                    return;
                }

                const category = $(element)
                    .prevAll(".bo_cate_link")
                    .first()
                    .text()
                    .trim();

                const dateText = $(element)
                    .nextAll(".rep_info")
                    .first()
                    .find(".date")
                    .text()
                    .trim();

                const dateMatch = dateText.match(/\d{4}-\d{2}-\d{2}/);
                const date = dateMatch ? dateMatch[0] : null;

                notices.push({
                    source_id: postId,
                    title: title,
                    category: category || null,
                    created_at: date,
                    source_url: url.href,
                    content: null,
                    author: null,
                    attachments: []
                });

                pageCount++;
            });

            console.log(`${page}페이지에서 ${pageCount}개 공지 발견`);

            await sleep(DELAY);
        }

        console.log(`\n목록 수집 완료: 총 ${notices.length}개`);

        // 2. 공지사항 상세 페이지 수집
        for (let i = 0; i < notices.length; i++) {
            const notice = notices[i];

            try {
                console.log(
                    `\n===== 상세 페이지 수집 (${i + 1}/${notices.length}) =====`
                );

                console.log("게시글 번호:", notice.source_id);
                console.log("제목:", notice.title);

                const detailResponse = await fetch(notice.source_url, {
                    headers: {
                        "User-Agent": "Mozilla/5.0"
                    }
                });

                if (!detailResponse.ok) {
                    console.log("상세 페이지 수집 실패");
                    await sleep(DELAY);
                    continue;
                }

                const detailHtml = await detailResponse.text();
                const detail$ = cheerio.load(detailHtml);

                notice.content = detail$("#bo_v_con")
                    .text()
                    .replace(/\s+/g, " ")
                    .trim();

                detail$(".bo_v_file a, #bo_v_file a").each((index, element) => {
                    const link = detail$(element);

                    const name = link.text().trim();
                    const href = link.attr("href");

                    if (!href || !name) return;

                    const fileUrl = new URL(
                        href,
                        notice.source_url
                    ).href;

                    if (!notice.attachments.some(file => file.url === fileUrl)) {
                        notice.attachments.push({
                            name: name,
                            url: fileUrl
                        });
                    }
                });

                console.log("본문 수집:", notice.content ? "성공" : "본문 없음");
                console.log("첨부파일 개수:", notice.attachments.length);

            } catch (error) {
                console.log(
                    `${notice.source_id}번 공지 수집 실패:`,
                    error.message
                );
            }

            await sleep(DELAY);
        }

        // 3. JSON 파일로 저장
        const output = {
            collected_at: new Date().toISOString(),
            total_count: notices.length,
            notices: notices
        };

        await fs.writeFile(
            "crawler/notices.json",
            JSON.stringify(output, null, 2),
            "utf-8"
        );

        console.log("\n===== JSON 저장 완료 =====");
        console.log("저장 위치: crawler/notices.json");

        // 4. 수집 통계
        const contentCount = notices.filter(
            notice => notice.content
        ).length;

        const attachmentCount = notices.reduce(
            (total, notice) => total + notice.attachments.length,
            0
        );

        console.log("\n===== 수집 통계 =====");
        console.log("목록 수집:", notices.length, "개");
        console.log("본문 수집 성공:", contentCount, "개");
        console.log("첨부파일:", attachmentCount, "개");
        console.log("\n크롤링 완료!");

    } catch (error) {
        console.error("크롤링 실패:", error.message);
    }
}

crawlNotices();
