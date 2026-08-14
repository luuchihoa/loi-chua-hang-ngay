import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://avrnbefzxtznpodugacz.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Thiếu Supabase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TAT_NIEN_DATA = {
  liturgy_key: "feast_tat_nien",
  cycle: "all",
  title: "Chiều Tất Niên - Thánh lễ Tạ Ơn Cuối Năm",
  quote: "Không thấy ai trở lại tôn vinh Thiên Chúa, trừ ngoại nhân này sao?",
  r1_ref: "Đn 7,9-10.13-14",
  r1_quote: "Con Người được trao quyền thống trị, vinh quang và vương quốc.",
  r1_intro: "Bài trích sách tiên tri Đa-ni-en.",
  r1_content: "9 Tôi đang nhìn thì thấy đặt các ngai tòa và một Đấng Lão Thành ngự trên ngai. Áo Người trắng như tuyết, tóc trên đầu Người như đúp len sạch. Ngai Người như những ngọn lửa, các bánh xe của ngai như lửa đốt cháy.\n10 Một dòng sông lửa cuồn cuộn chảy ra từ trước mặt Người. Ngàn ngàn hầu hạ Người, vạn vạn túc trực trước mặt Người. Tòa bắt đầu xử, và các sách được mở ra.\n13 Trong những thị kiến đêm ấy, tôi đang nhìn thì kìa: có ai như một Con Người đang ngự trên đám mây trời mà đến. Người tiến lại gần Đấng Lão Thành và được dẫn đến trước mặt Đấng ấy.\n14 Đấng Lão Thành trao cho Người quyền thống trị, vinh quang và vương quốc; muôn dân, muôn nước và muôn tiếng nói đều phải phụng sự Người. Quyền thống trị của Người là quyền thống trị vĩnh cửu, không bao giờ mất đi, và vương quốc của Người sẽ không bao giờ bị tiêu diệt.",
  psalm_ref: "Tv 102 (103),1-2.3-4.8-9.11-12 (Đ. c.1a)",
  psalm_content: "Đ. Hồn tôi ơi, hãy chúc tụng Đức Chúa.\n\n1 Hồn tôi ơi, hãy chúc tụng Đức Chúa,\ntoàn thể tôi gian, hãy chúc tụng thánh danh.\n2 Hồn tôi ơi, hãy chúc tụng Đức Chúa,\nchớ phụ phàng mọi ân huệ của Người.\n\nĐ. Hồn tôi ơi, hãy chúc tụng Đức Chúa.\n\n3 Chúa thứ lỗi cho ngươi muôn vàn tội lỗi,\nthương chữa lành các bệnh tật ngươi,\n4 cứu mạng ngươi khỏi chốn tử thần,\nban cho ngươi tình thương và lòng nhân hậu.\n\nĐ. Hồn tôi ơi, hãy chúc tụng Đức Chúa.\n\n8 Đức Chúa là Đấng từ bi nhân hậu,\nchậm bất bình và hết sức yêu thương.\n9 Người không giận hờn mãi mãi,\ncũng không nuôi hận đến muôn đời.\n\nĐ. Hồn tôi ơi, hãy chúc tụng Đức Chúa.\n\n11 Như trời xanh cao vượt trên mặt đất,\ntình thương Người cũng vượt trên kẻ kính sợ Người.\n12 Như đông tây cách xa biền biệt,\ntội ta đã phạm, Người quăng đi thật xa.\n\nĐ. Hồn tôi ơi, hãy chúc tụng Đức Chúa.",
  r2_ref: "1 Tl 5,16-24",
  r2_quote: "Anh em hãy vui mừng luôn mãi, cầu nguyện không ngừng và tạ ơn trong mọi hoàn cảnh.",
  r2_intro: "Bài trích thư thứ nhất của thánh Phao-lô tông đồ gửi tín hữu Thê-xa-lô-ni-ca.",
  r2_content: "16 Anh em hãy vui mừng luôn mãi, 17 cầu nguyện không ngừng, 18 hãy tạ ơn trong mọi hoàn cảnh. Anh em hãy làm như vậy, đó là điều Thiên Chúa muốn trong Đức Ki-tô Giê-su.\n19 Anh em đừng dập tắt Thần Khí. 20 Đừng khinh thường ơn nói ngôn khí. 21 Hãy cân nhắc mọi điều: điều gì tốt thì giữ; 22 điều gì xấu dưới bất cứ hình thức nào thì hãy tránh cho xa.\n23 Nguyện chính Thiên Chúa là nguồn bình an, thánh hóa anh em toàn diện, ước gì tâm hồn, linh hồn và thân xác anh em được giữ gìn vẹn toàn, không gì đáng trách, trong ngày Đức Giê-su Ki-tô, Chúa chúng ta, quang lâm.\n24 Đấng kêu gọi anh em là Đấng thành tín: Người sẽ thực hiện điều đó.",
  gospel_ref: "Lc 17,11-19",
  gospel_alleluia: "Ha-lê-lui-a. Ha-lê-lui-a. Hãy tạ ơn Chúa vì Chúa nhân từ, muôn ngàn đời Chúa vẫn trọn tình thương. Ha-lê-lui-a.",
  gospel_intro: "✠ Tin Mừng Chúa Giê-su Ki-tô theo thánh Lu-ca.",
  gospel_content: "11 Trên đường lên Giê-ru-sa-lem, Đức Giê-su đi qua biên giới giữa Sa-ma-ri và Ga-li-lê.\n12 Khi Người vào một làng kia, thì có mười người phong cùi đón gặp Người. Họ dừng lại ở đằng xa\n13 và kêu lớn tiếng: “Lạy Thầy Giê-su, xin rủ lòng thương chúng tôi!”\n14 Thấy vậy, Đức Giê-su bảo họ: “Hãy đi trình diện với các tư tế.” Đang khi đi thì họ đã được sạch.\n15 Một người trong số họ, thấy mình được chữa lành, liền quay trở lại lớn tiếng tôn vinh Thiên Chúa.\n16 Anh ta sấp mình dưới chân Đức Giê-su mà tạ ơn Người. Anh ta lại là người Sa-ma-ri.\n17 Đức Giê-su nói: “Không phải cả mười người đều được sạch sao? Thế thì chín người kia đâu?\n18 Sao không thấy ai trở lại tôn vinh Thiên Chúa, trừ ngoại nhân này?”\n19 Rút cuộc, Người bảo anh ta: “Đứng dậy mà về! Lòng tin của anh đã cứu chữa anh.”",
  reflection: "",
  extra_readings: null
};

const GIAO_THUA_DATA = {
  liturgy_key: "feast_giao_thua",
  cycle: "all",
  title: "Đêm Giao Thừa - Thánh lễ Cầu Bình An Cho Năm Mới",
  quote: "Anh em hãy vui mừng hớn hở, vì phần thưởng dành cho anh em ở trên trời thật lớn lao.",
  r1_ref: "Nm 6,22-27",
  r1_quote: "Họ sẽ khắc ghi danh Ta trên con cái Ít-ra-en và Ta sẽ chúc lành cho chúng.",
  r1_intro: "Bài trích sách Dân số.",
  r1_content: "22 Đức Chúa phán với ông Mô-sê:\n23 “Hãy nói với A-ha-ron và các con nó rằng: Hãy chúc lành cho con cái Ít-ra-en như thế này: Xin Đức Chúa chúc lành và giữ gìn anh em!\n24 Xin Đức Chúa ghé mắt nhìn xem và rủ lòng thương anh em!\n25 Xin Đức Chúa tỏ nét mặt hoan hỷ với anh em và ban bình an cho anh em!\n26 Đó là cách họ khắc ghi danh Ta trên con cái Ít-ra-en, và chính Ta sẽ chúc lành cho chúng.”",
  psalm_ref: "Tv 8,4-5.6-7.8-9 (Đ. c.2a)",
  psalm_content: "Đ. Lạy Đức Chúa là Chúa chúng con, lạ lùng thay danh Chúa khắp nơi hoàn cầu!\n\n4 Ngắm tầng trời tay Chúa sáng tạo,\nmuôn trăng sao Chúa đã an bài,\n5 thì con người là chi mà Chúa cần nhớ đến,\ncon phàm trần là gì mà Chúa phải chăm nom?\n\nĐ. Lạy Đức Chúa là Chúa chúng con, lạ lùng thay danh Chúa khắp nơi hoàn cầu!\n\n6 Chúa dựng nên con người kém thần linh một chút,\ntrang sức cho bằng vinh hiển với huy hoàng,\n7 đặt làm chủ tể tác phẩm tay Chúa sáng tạo,\nđặt muôn loài muôn sự dưới chân:\n\nĐ. Lạy Đức Chúa là Chúa chúng con, lạ lùng thay danh Chúa khắp nơi hoàn cầu!\n\n8 Nào chiên bò đủ loại,\nnào thú vật ngoài đồng,\n9 nào chim trời cá biển,\nmọi loài ngang dọc khắp nẻo đường khơi.\n\nĐ. Lạy Đức Chúa là Chúa chúng con, lạ lùng thay danh Chúa khắp nơi hoàn cầu!",
  r2_ref: "Pl 4,4-9",
  r2_quote: "Anh em hãy vui luôn trong niềm vui của Chúa. Sự bình an của Thiên Chúa sẽ giữ giữ lòng trí anh em.",
  r2_intro: "Bài trích thư của thánh Phao-lô tông đồ gửi tín hữu Phi-líp-phê.",
  r2_content: "4 Thưa anh em, anh em hãy vui luôn trong niềm vui của Chúa. Tôi nhắc lại: vui lên anh em!\n5 Sao cho mọi người thấy anh em sống hiền hòa rộng rãi, Chúa đã gần đến.\n6 Anh em đừng lo lắng gì cả, nhưng trong mọi hoàn cảnh, anh em cứ đem lời cầu khẩn, van xin và tạ ơn, mà giãi bày trước mặt Thiên Chúa những điều anh em thỉnh nguyện.\n7 Và bình an của Thiên Chúa là bình an vượt lên trên mọi hiểu biết, sẽ giữ cho lòng trí anh em được kết hợp với Đức Ki-tô Giê-su.\n8 Ngoài ra, thưa anh em, những gì là chân thật, cao quý, những gì là chính trực tinh tuyền, những gì là đáng mến và đem lại danh thơm tiếng tốt, những gì là đức hạnh, đáng khen, thì xin anh em hãy để ý.\n9 Những gì anh em đã học hỏi, đã nhận lãnh, đã nghe thấy và đã nhìn thấy nơi tôi, thì hãy đem ra thực hành. Và Thiên Chúa là nguồn bình an sẽ ở với anh em.”",
  gospel_ref: "Mt 5,1-12a",
  gospel_alleluia: "Ha-lê-lui-a. Ha-lê-lui-a. Thầy ở cùng anh em mọi ngày cho đến tận thế. Ha-lê-lui-a.",
  gospel_intro: "✠ Tin Mừng Chúa Giê-su Ki-tô theo thánh Mát-thêu.",
  gospel_content: "1 Thấy đám đông, Đức Giê-su lên núi. Người ngồi xuống, các môn đệ đến gần.\n2 Người mở miệng dạy họ rằng:\n3 “Phúc thay ai có tâm hồn nghèo khó, vì Nước Trời là của họ.\n4 Phúc thay ai hiền lành, vì họ sẽ được Đất Hứa làm gia nghiệp.\n5 Phúc thay ai khóc lóc, vì họ sẽ được Thiên Chúa an ủi.\n6 Phúc thay ai khao khát nên người công chính, vì họ sẽ được Thiên Chúa cho thỏa lòng.\n7 Phúc thay ai xót thương người, vì họ sẽ được Thiên Chúa xót thương.\n8 Phúc thay ai có tâm hồn trong sạch, vì họ sẽ được nhìn thấy Thiên Chúa.\n9 Phúc thay ai xây dựng hòa bình, vì họ sẽ được gọi là con Thiên Chúa.\n10 Phúc thay ai bị ngược đãi vì sống chính trực, vì Nước Trời là của họ.\n11 Phúc cho anh em khi vì Thầy mà bị người ta nhạo báng, ngược đãi và vu khống đủ điều xấu xa.\n12a Anh em hãy vui mừng hớn hở, vì phần thưởng dành cho anh em ở trên trời thật lớn lao.”",
  reflection: "",
  extra_readings: null
};

async function seedTatNienAndGiaoThua() {
  console.log("=== CHẠY SCRIPT NHẬP DỮ LIỆU BÀI ĐỌC TẤT NIÊN VÀ GIAO THỪA VÀO DATABASE ===\n");

  const jsonPath = path.join(__dirname, "../liturgy_contents_rows.json");
  const allRows = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  // Check if exists in Supabase
  for (const item of [TAT_NIEN_DATA, GIAO_THUA_DATA]) {
    const { data: existing, error: fetchErr } = await supabase
      .from('liturgy_contents')
      .select('*')
      .eq('liturgy_key', item.liturgy_key);

    if (fetchErr) {
      console.error(`❌ Lỗi kiểm tra ${item.liturgy_key}:`, fetchErr);
      continue;
    }

    if (existing && existing.length > 0) {
      // Update
      const { error: updateErr } = await supabase
        .from('liturgy_contents')
        .update(item)
        .eq('liturgy_key', item.liturgy_key);

      if (updateErr) {
        console.error(`❌ Lỗi cập nhật ${item.liturgy_key}:`, updateErr);
      } else {
        console.log(`✅ Đã cập nhật bản ghi có sẵn cho "${item.liturgy_key}" (${item.title})`);
        // Update local json
        const idx = allRows.findIndex(r => r.liturgy_key === item.liturgy_key);
        if (idx !== -1) {
          allRows[idx] = { ...allRows[idx], ...item };
        }
      }
    } else {
      // Insert
      const { data: inserted, error: insertErr } = await supabase
        .from('liturgy_contents')
        .insert([item])
        .select();

      if (insertErr) {
        console.error(`❌ Lỗi chèn mới ${item.liturgy_key}:`, insertErr);
      } else {
        console.log(`✅ Đã chèn mới bản ghi cho "${item.liturgy_key}" (${item.title})`);
        if (inserted && inserted[0]) {
          allRows.push(inserted[0]);
        }
      }
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(allRows, null, 2), "utf-8");
  console.log(`\n💾 Đã lưu và đồng bộ tệp liturgy_contents_rows.json (Tổng số dòng: ${allRows.length}).`);
}

seedTatNienAndGiaoThua();
