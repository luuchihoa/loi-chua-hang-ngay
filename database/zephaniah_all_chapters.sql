INSERT INTO chapters (translation_id, book_id, chapter, content) VALUES (1, 'xp', 1, '[PART] Chương 1
(1) Dưới thời Giô-si-gia-hu con vua A-môn làm vua Giu-đa, có lời ĐỨC CHÚA phán với ông Xô-phô-ni-a, con ông Cu-si; ông Cu-si là con ông Gơ-đan-gia; ông Gơ-đan-gia là con ông A-mác-gia; ông A-mác-gia là con ông Khít-ki-gia.
[PART] I. NGÀY CỦA ĐỨC CHÚA TẠI GIU-ĐA
[SECTION] Lời mở đầu liên quan đến vũ trụ
(2) Phải, Ta sẽ quét sạch tất cả khỏi mặt đất này
– sấm ngôn của ĐỨC CHÚA.
(3) Ta sẽ quét sạch loài người cũng như loài vật,
Ta sẽ quét sạch chim trời lẫn cá biển.
Ta sẽ khiến cho kẻ gian ác phải lảo đảo té nhào
và sẽ tận diệt loài người khỏi mặt đất – sấm ngôn của ĐỨC CHÚA.
[SECTION] Hạch tội thờ các thần ngoại bang
(4) Ta sẽ dang tay đánh phạt Giu-đa
và toàn thể dân cư Giê-ru-sa-lem.
Ta sẽ tận diệt khỏi nơi này số còn sót lại của Ba-an,
và xóa bỏ tên của hàng tư tế bất hợp pháp.
(5) Ta sẽ tận diệt những kẻ leo lên mái nhà
mà sụp lạy các thiên binh,
những kẻ thờ lạy ĐỨC CHÚA, và nhân danh Đức Chúa mà thề,
rồi lại thề nhân danh thần Min-côm.
(6) Ta sẽ tận diệt những kẻ lìa xa ĐỨC CHÚA,
những kẻ chẳng kiếm tìm, cũng không thỉnh vấn ĐỨC CHÚA.
(7) Hãy lặng thinh trước nhan ĐỨC CHÚA là Chúa Thượng,
vì ngày của ĐỨC CHÚA đã đến gần!
Quả thật, ĐỨC CHÚA đã chuẩn bị một hy lễ,
Người đã tách riêng ra các khách được mời.
[SECTION] Hạch tội các quan chức triều đình
(8) Trong ngày dâng hy lễ của ĐỨC CHÚA,
Ta sẽ trừng phạt các thủ lãnh, các hoàng tử
và những kẻ mặc y phục ngoại bang.
(9) Trong ngày đó, Ta sẽ trừng phạt
tất cả những kẻ nghênh ngang bước lên ngưỡng cửa
và những kẻ chất đầy cung điện chúa mình
những của chiếm được nhờ bạo tàn và gian dối.
[SECTION] Hạch tội những kẻ buôn bán ở Giê-ru-sa-lem
(10) Trong ngày ấy –sấm ngôn của ĐỨC CHÚA–
từ phía cửa Cá vọng lên tiếng than van,
từ thành mới vang ra tiếng rên siết,
từ các ngọn đồi văng vẳng tiếng kêu la.
(11) Hỡi dân cư Khu Phố Dưới, hãy rên siết,
vì đám dân buôn bán đã bị hủy diệt,
hết những ai lắm bạc nhiều tiền đã bị tiêu vong.
[SECTION] Hạch tội những kẻ không tin
(12) Trong thời ấy, Ta sẽ cầm đèn mà lục soát Giê-ru-sa-lem,
Ta sẽ trừng phạt bọn đàn ông,
những kẻ cứ điềm nhiên như rượu trên lớp cặn.
Chúng tự nhủ trong lòng:
“ĐỨC CHÚA không ban phúc, Người cũng chẳng giáng họa.”
(13) Bấy giờ, tài sản chúng sẽ bị cướp phá,
nhà cửa chúng sẽ bị tan hoang;
chúng xây nhà, nhưng không được ở;
chúng trồng nho, nhưng chẳng được uống rượu.
[SECTION] Ngày của ĐỨC CHÚA
(14) Đã gần rồi, ngày của ĐỨC CHÚA, ngày vĩ đại,
đã gần rồi, ngày ấy đến thật mau.
Trong ngày của ĐỨC CHÚA
sẽ vọng lên những tiếng kêu thê thảm,
ngay bậc anh hùng cũng phải kêu cứu
(15) Ngày đó là ngày thịnh nộ, ngày khốn quẫn và gian truân,
ngày hủy diệt và tàn phá, ngày tối tăm và mịt mù,
ngày âm u và ảm đạm,
(16) ngày vang tiếng tù và với tiếng hét xung phong
tấn công vào các thành kiên cố
và các tháp cao ở góc tường thành.
(17) Dân cư sẽ bị Ta vây hãm, chúng sẽ bước đi như những kẻ mù
vì đã đắc tội với ĐỨC CHÚA.
Máu chúng sẽ đổ ra chan hòa, và thịt chúng rữa ra như rác rưởi.
(18) Dù bạc hay vàng cũng không cứu nổi chúng:
trong ngày ĐỨC CHÚA nổi lôi đình,
lúc cơn ghen của Người bừng lên như lửa;
bấy giờ toàn cõi đất sẽ bị thiêu rụi.
Quả thật, Người sắp thi hành án diệt vong
để trừng phạt dân cư toàn cõi đất, điều ấy thật kinh hoàng.') ON CONFLICT (translation_id, book_id, chapter) DO UPDATE SET content = EXCLUDED.content;

INSERT INTO chapters (translation_id, book_id, chapter, content) VALUES (1, 'xp', 2, '[SECTION] Kết luận: Kêu gọi trở lại
(1) Này hỡi đám dân vô liêm sỉ, hãy tập họp, tập họp lại đi,
(2) trước khi các ngươi bị phân tán
như vỏ trấu bị gió thổi bay trong một ngày,
trước khi ĐỨC CHÚA bừng bừng nổi giận
đến trừng phạt các ngươi,
trước khi ĐỨC CHÚA nổi trận lôi đình
đến trừng phạt các ngươi.
(3) Hỡi tất cả những ai nghèo hèn trong xứ sở,
những kẻ thi hành mệnh lệnh của ĐỨC CHÚA,
anh em hãy tìm kiếm Người;
hãy tìm sự công chính, hãy tìm đức khiêm nhường
thì may ra anh em sẽ được che chở
trong ngày thịnh nộ của ĐỨC CHÚA.
[PART] II. HẠCH TỘI CHƯ QUỐC
[SECTION] Kẻ thù ở Phương Tây: quân Phi-li-tinh
(4) Quả thật, Ga-da sẽ bị bỏ rơi,
Át-cơ-lôn sẽ thành chốn hoang tàn,
Át-đốt sẽ bị trục xuất vào giữa trưa, và Éc-rôn sẽ bị bứng rễ.
(5) Khốn cho ngươi, hỡi dân cư miền ven biển,
khốn cho ngươi, hỡi dân tộc Cơ-rê-thi:
ngươi sẽ bị lời ĐỨC CHÚA hạch tội:
“Hỡi Ca-na-an, đất của dân Phi-li-tinh,
Ta sẽ tận diệt ngươi, khiến chẳng còn ai cư ngụ.
(6) Miền ven biển sẽ thành đồng cỏ,
thành cánh đồng cho người chăn chiên,
thành bãi quây cho chiên cừu.
(7) Miền này sẽ thuộc về số còn sót lại của nhà Giu-đa;
chúng sẽ dẫn chiên dê tới đó.
Chiều đến, chúng sẽ nằm nghỉ tại nhà Át-cơ-lôn,
vì ĐỨC CHÚA, Thiên Chúa của chúng, sẽ viếng thăm
và thay đổi vận mệnh của chúng.
[SECTION] Kẻ thù ở Phương Đông: Mô-áp và Am-mon
(8) Ta đã nghe lời nhạo báng của dân Mô-áp
và những lời nhục mạ của con cái Am-mon,
chúng nhạo báng dân Ta, và đắc chí vì lãnh thổ của mình.
(9) Vì thế, Ta lấy mạng sống Ta mà thề
–sấm ngôn của ĐỨC CHÚA các đạo binh,
Thiên Chúa của Ít-ra-en–
Mô-áp sẽ trở nên như Xơ-đôm
và con cái Am-mon sẽ nên như Gô-mô-ra.
Đó là một mảnh đất hoang cỏ mọc, một hầm muối,
một hoang địa cho đến muôn đời.
Số dân còn sót lại của Ta sẽ cướp phá chúng,
số còn sống sót của dân Ta
sẽ chiếm đất đai chúng làm gia nghiệp.
(10) Đó là giá chúng phải trả cho sự kiêu ngạo của mình.
Quả thật, chúng đã nhạo báng
và đắc chí nhạo cười dân của ĐỨC CHÚA các đạo binh.
(11) Đối với chúng, ĐỨC CHÚA thật đáng kinh đáng sợ,
Người tiêu diệt tất cả các thần trên cõi đất.
Các dân tộc trên mọi hải đảo
ngay tại nơi mình ở sẽ sụp lạy Người.
[SECTION] Kẻ thù ở Phương Nam: Cút
(12) Cả các ngươi nữa, hỡi dân Cút,
các ngươi sẽ là mồi cho gươm của Ta.
[SECTION] Kẻ thù ở Phương Bắc: Át-sua
(13) Đức Chúa sẽ dang tay đánh phạt Phương Bắc
và tiêu diệt Át-sua;
Người biến Ni-ni-vê thành chốn hoang tàn,
thành nơi khô cằn như sa mạc.
(14) Đó sẽ là nơi cho đàn vật nằm nghỉ,
là chỗ qua đêm cho sinh vật mọi loài:
bồ nông cũng như nhím ngủ trên đầu cột,
bên cửa sổ vang lên tiếng cú,
trên ngưỡng cửa vang tiếng quạ kêu;
vì nhà bằng gỗ bá hương nay bị tàn phá.
(15) Đó sẽ là số phận của thành phố xưa kia nhộn nhịp,
thành đã sống trong cảnh yên hàn,
đã nhủ thầm: ‘Chẳng thành nào sánh được với ta.’
Cớ sao thành ấy lại trở nên hoang tàn,
nên hang động cho loài dã thú?
Bất cứ ai qua lại cũng huýt sáo vẫy tay.') ON CONFLICT (translation_id, book_id, chapter) DO UPDATE SET content = EXCLUDED.content;

INSERT INTO chapters (translation_id, book_id, chapter, content) VALUES (1, 'xp', 3, '[PART] III. HẠCH TỘI GIÊ-RU-SA-LEM
[SECTION] Hạch tội các nhà lãnh đạo quốc gia
(1) Khốn cho thành phản loạn và ô uế, khốn cho thành tàn bạo,
(2) không nghe tiếng kêu mời, chẳng tiếp thu lời sửa dạy,
không cậy trông vào ĐỨC CHÚA,
chẳng đến gần Thiên Chúa của mình.
(3) Trong thành, các thủ lãnh như sư tử rống,
các thẩm phán như sói ăn đêm
sáng ngày ra chẳng còn gì để gặm.
(4) Các ngôn sứ của nó là hạng người khoác lác ba hoa,
là những quân phản bội;
các tư tế của nó làm ô uế đền thờ và vi phạm Lề Luật.
(5) Nhưng ĐỨC CHÚA vẫn hiện diện trong thành,
Người là Đấng công chính, chẳng làm điều dối gian;
sáng sáng Người ban hành phán quyết,
tựa bình minh chẳng bao giờ sai hẹn.
Thế mà kẻ bất chính lại không biết thẹn thùng.
[SECTION] Bài học của các nước
(6) Ta đã quét sạch các dân tộc,
khiến các tháp canh ở góc tường thành ra hoang tàn đổ nát,
làm cho phố phường của chúng tan hoang,
chẳng còn ai lui tới, các thành của chúng bị phá hủy:
không một bóng người qua, chẳng còn ai cư ngụ.
(7) Ta tự nhủ: ‘Ít ra Giê-ru-sa-lem sẽ kính sợ Ta,
sẽ tiếp thu lời Ta sửa dạy,
và nó sẽ không bị phá hủy mỗi lần Ta đến viếng thăm.’
Nhưng dân thành lại càng ra hư hỏng
vì mọi việc ngang trái chúng làm.
(8) Vì thế, các ngươi hãy đợi Ta –sấm ngôn của ĐỨC CHÚA–
đợi ngày Ta đứng lên làm nhân chứng cáo tội,
vì Ta đã quyết định tập hợp chư dân, quy tụ các vương quốc
để trút hết xuống đầu chúng cơn thịnh nộ của Ta;
toàn cõi đất sẽ bị thiêu rụi
khi cơn ghen của Ta bừng lên như lửa.
[PART] IV. CÁC LỜI HỨA
[SECTION] Các dân tộc trở lại
(9) Bấy giờ, Ta sẽ làm cho môi miệng chư dân nên tinh sạch
để tất cả đều kêu cầu danh ĐỨC CHÚA
và kề vai sát cánh phụng sự Người.
(10) Từ bên kia sông ngòi xứ Cút,
những kẻ tôn thờ Ta, những kẻ đã bị Ta phân tán,
sẽ mang lễ vật đến kính dâng Ta.
[SECTION] Thiểu số Ít-ra-en còn sót lại
(11) Ngày ấy, ngươi sẽ không còn phải hổ thẹn
vì mọi hành vi ngang trái chống lại Ta.
Bấy giờ, Ta sẽ đuổi cho khuất mắt ngươi
những kẻ kiêu căng đắc thắng,
và ngươi sẽ không còn nghênh ngang
trên Núi Thánh của Ta nữa.
(12) Ta sẽ cho sót lại giữa ngươi một dân nghèo hèn và bé nhỏ;
chúng sẽ tìm nương ẩn nơi danh ĐỨC CHÚA.
(13) Số dân Ít-ra-en còn sót lại
sẽ không làm chuyện tàn ác bất công,
cũng không ăn gian nói dối
và miệng lưỡi chúng sẽ không còn phỉnh gạt.
Nhưng chúng sẽ được chăn dắt và nghỉ ngơi
mà không còn bị ai làm cho khiếp sợ.”
[SECTION] Thánh vịnh mời gọi Xi-on vui mừng
(14) Reo vui lên, hỡi thiếu nữ Xi-on,
hò vang dậy đi nào, nhà Ít-ra-en hỡi!
Hỡi thiếu nữ Giê-ru-sa-lem, hãy nức lòng phấn khởi.
(15) Án lệnh phạt ngươi, ĐỨC CHÚA đã rút lại,
thù địch của ngươi, Người đã đẩy lùi xa.
Đức Vua của Ít-ra-en đang ngự giữa ngươi, chính là ĐỨC CHÚA.
Sẽ chẳng còn tai ương nào khiến ngươi phải sợ.
(16) Ngày ấy, người ta sẽ bảo Giê-ru-sa-lem:
“Này Xi-on, đừng sợ, chớ kinh hãi rụng rời.”
(17) ĐỨC CHÚA, Thiên Chúa của ngươi đang ngự giữa ngươi,
Người là Vị cứu tinh, là Đấng anh hùng.
Vì ngươi, Chúa sẽ vui mừng hoan hỷ,
sẽ lấy tình thương của Người mà đổi mới ngươi.
Vì ngươi, Chúa sẽ nhảy múa tưng bừng
(18) như trong ngày lễ hội.
[SECTION] Những kẻ tản lạc được hồi hương
Ta đã cất khỏi ngươi tai họa
khiến ngươi không còn phải ô nhục nữa.
(19) Này Ta sắp hành động để trừng phạt mọi kẻ hành hạ ngươi;
–thời ấy – Ta sẽ cứu thoát chiên bị què, sẽ tập hợp chiên đi lạc.
Ta sẽ cho chúng được danh tiếng và ngợi khen
tại khắp nơi chúng đã nếm mùi ô nhục.
(20) Thời ấy, Ta sẽ dẫn các ngươi về;
đó sẽ là thời Ta tập hợp các ngươi lại.
Quả thật, Ta sẽ cho các ngươi được danh tiếng và ngợi khen
giữa tất cả các dân trên cõi đất,
ngày Ta đổi vận mệnh cho các ngươi,
ngay trước mắt các ngươi. ĐỨC CHÚA đã phán.') ON CONFLICT (translation_id, book_id, chapter) DO UPDATE SET content = EXCLUDED.content;