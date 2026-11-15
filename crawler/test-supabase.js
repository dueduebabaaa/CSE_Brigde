
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// 1. .env 파일에서 연결 정보 가져오기
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

// 2. 환경변수 확인
if (!supabaseUrl || !supabaseSecretKey) {
    console.error(".env 파일의 연결 정보를 확인해 주세요.");
    process.exit(1);
}

// 3. Supabase 연결
const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey
);

// 4. 데이터베이스 연결 테스트
async function testConnection() {
    console.log("Supabase 연결 테스트 시작!");

    try {
        const { data, error } = await supabase
            .from("opportunities")
            .select("id")
            .limit(1);

        if (error) {
            throw error;
        }

        console.log("Supabase 연결 성공!");
        console.log("opportunities 테이블 접근 성공!");
        console.log("조회된 데이터:", data.length, "개");

    } catch (error) {
        console.error("연결 실패:", error.message);
    }
}

testConnection();
