-- LOCAL/STAGING ONLY. Fake tenants, staff and catalogue for development and tests. Never run on production.
-- Staff password for every fake account: zsopo-local-1
insert into core.entities(id, code, name, kind) values
  ('e0000000-0000-4000-8000-000000000001','ZS-SPACE','ZSOPO Space (pháp nhân vận hành, giả lập)','operating'),
  ('e0000000-0000-4000-8000-000000000002','TEST-B','Pháp nhân thử nghiệm B','operating');
insert into core.locations(id, entity_id, slug, name, status, address) values
  ('c0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','da-lat','Zen Homestay Đà Lạt','active','Địa chỉ chờ chủ cơ sở duyệt'),
  ('c0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001','diem-thu-nghiem-2','Điểm thử nghiệm 2 (RLS)','test',null),
  ('c0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000002','diem-thu-nghiem-b','Điểm thử nghiệm B (RLS)','test',null);

insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) values
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000001','authenticated','authenticated','le-tan@example.test',extensions.crypt('zsopo-local-1', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000002','authenticated','authenticated','buong-phong@example.test',extensions.crypt('zsopo-local-1', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000003','authenticated','authenticated','quan-ly@example.test',extensions.crypt('zsopo-local-1', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000004','authenticated','authenticated','bien-tap@example.test',extensions.crypt('zsopo-local-1', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000005','authenticated','authenticated','tai-chinh@example.test',extensions.crypt('zsopo-local-1', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000006','authenticated','authenticated','admin@example.test',extensions.crypt('zsopo-local-1', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000007','authenticated','authenticated','le-tan-2@example.test',extensions.crypt('zsopo-local-1', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000008','authenticated','authenticated','le-tan-b@example.test',extensions.crypt('zsopo-local-1', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000009','authenticated','authenticated','buong-phong-2@example.test',extensions.crypt('zsopo-local-1', extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
insert into auth.identities(id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  (gen_random_uuid(),'a0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001',jsonb_build_object('sub','a0000000-0000-4000-8000-000000000001','email','le-tan@example.test','email_verified',true),'email',now(),now(),now()),
  (gen_random_uuid(),'a0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000002',jsonb_build_object('sub','a0000000-0000-4000-8000-000000000002','email','buong-phong@example.test','email_verified',true),'email',now(),now(),now()),
  (gen_random_uuid(),'a0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000003',jsonb_build_object('sub','a0000000-0000-4000-8000-000000000003','email','quan-ly@example.test','email_verified',true),'email',now(),now(),now()),
  (gen_random_uuid(),'a0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000004',jsonb_build_object('sub','a0000000-0000-4000-8000-000000000004','email','bien-tap@example.test','email_verified',true),'email',now(),now(),now()),
  (gen_random_uuid(),'a0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000005',jsonb_build_object('sub','a0000000-0000-4000-8000-000000000005','email','tai-chinh@example.test','email_verified',true),'email',now(),now(),now()),
  (gen_random_uuid(),'a0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000006',jsonb_build_object('sub','a0000000-0000-4000-8000-000000000006','email','admin@example.test','email_verified',true),'email',now(),now(),now()),
  (gen_random_uuid(),'a0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000007',jsonb_build_object('sub','a0000000-0000-4000-8000-000000000007','email','le-tan-2@example.test','email_verified',true),'email',now(),now(),now()),
  (gen_random_uuid(),'a0000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000008',jsonb_build_object('sub','a0000000-0000-4000-8000-000000000008','email','le-tan-b@example.test','email_verified',true),'email',now(),now(),now()),
  (gen_random_uuid(),'a0000000-0000-4000-8000-000000000009','a0000000-0000-4000-8000-000000000009',jsonb_build_object('sub','a0000000-0000-4000-8000-000000000009','email','buong-phong-2@example.test','email_verified',true),'email',now(),now(),now());
insert into core.profiles(user_id, display_name) values
  ('a0000000-0000-4000-8000-000000000001','Lễ tân Đà Lạt'),
  ('a0000000-0000-4000-8000-000000000002','Buồng phòng Đà Lạt'),
  ('a0000000-0000-4000-8000-000000000003','Quản lý điểm Đà Lạt'),
  ('a0000000-0000-4000-8000-000000000004','Biên tập viên'),
  ('a0000000-0000-4000-8000-000000000005','Vận hành tài chính'),
  ('a0000000-0000-4000-8000-000000000006','Quản trị hệ thống'),
  ('a0000000-0000-4000-8000-000000000007','Lễ tân điểm 2'),
  ('a0000000-0000-4000-8000-000000000008','Lễ tân pháp nhân B'),
  ('a0000000-0000-4000-8000-000000000009','Buồng phòng 2')
on conflict (user_id) do update set display_name = excluded.display_name;
insert into core.user_roles(user_id, role, entity_id, location_id) values
  ('a0000000-0000-4000-8000-000000000001','front_desk','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002','housekeeping','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000003','location_manager','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000004','editor','e0000000-0000-4000-8000-000000000001',null),
  ('a0000000-0000-4000-8000-000000000005','ops_finance','e0000000-0000-4000-8000-000000000001',null),
  ('a0000000-0000-4000-8000-000000000006','super_admin',null,null),
  ('a0000000-0000-4000-8000-000000000007','front_desk','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000008','front_desk','e0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003'),
  ('a0000000-0000-4000-8000-000000000009','housekeeping','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001');

-- Energy cards + 13 rooms (9 sellable). Source: packages/db/fixtures/rooms.json
insert into core.energy_cards(id, entity_id, title, purpose, origin, usage, frequency, stones, symbols, chakras, status) values
('d0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','Phòng Thạch Anh Hồng','Nuôi dưỡng yêu thương bản thân, giúp giấc ngủ êm và tâm trí dịu lại.','Thạch anh hồng Madagascar','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','528Hz',array['Thạch anh hồng Madagascar'],array['Hoa sen'],array['heart'],'published'),
('d0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001','Phòng Thạch Anh Tím','Hỗ trợ trực giác, thích hợp cho người viết nhật ký và thiền sâu.','Thạch anh tím Uruguay','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','852Hz',array['Thạch anh tím Uruguay'],array['Mắt bindu'],array['third_eye'],'published'),
('d0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000001','Phòng Ngọc Bích','Cân bằng cảm xúc, nhẹ nhàng cho người vừa trải qua thay đổi.','Ngọc bích Myanmar','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','639Hz',array['Ngọc bích Myanmar'],array['Lá bồ đề'],array['heart'],'published'),
('d0000000-0000-4000-8000-000000000004','e0000000-0000-4000-8000-000000000001','Phòng Hổ Phách','Khơi lại sự tự tin và ấm áp, hợp với buổi sáng nhiều nắng.','Hổ phách Baltic','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','528Hz',array['Hổ phách Baltic'],array['Mặt trời'],array['solar'],'published'),
('d0000000-0000-4000-8000-000000000005','e0000000-0000-4000-8000-000000000001','Phòng Mắt Hổ','Giúp bạn cảm thấy vững chãi, được che chở.','Mắt hổ vàng Nam Phi','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','396Hz',array['Mắt hổ vàng Nam Phi'],array['Vòng enso'],array['root'],'published'),
('d0000000-0000-4000-8000-000000000006','e0000000-0000-4000-8000-000000000001','Phòng Thạch Anh Khói','Thả bớt căng thẳng, trở về cơ thể sau ngày dài.','Thạch anh khói Brazil','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','396Hz',array['Thạch anh khói Brazil'],array['Rễ cây'],array['root'],'published'),
('d0000000-0000-4000-8000-000000000007','e0000000-0000-4000-8000-000000000001','Phòng Lam Ngọc','Hỗ trợ diễn đạt nhẹ nhàng, hợp người làm sáng tạo.','Aquamarine Brazil','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','741Hz',array['Aquamarine Brazil'],array['Sóng nước'],array['throat'],'published'),
('d0000000-0000-4000-8000-000000000008','e0000000-0000-4000-8000-000000000001','Phòng Đá Mặt Trăng','Mềm mại với chu kỳ cảm xúc.','Đá mặt trăng Ấn Độ','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','417Hz',array['Đá mặt trăng Ấn Độ'],array['Trăng khuyết'],array['sacral'],'published'),
('d0000000-0000-4000-8000-000000000009','e0000000-0000-4000-8000-000000000001','Phòng Thạch Anh Trắng','Làm trong tâm trí, hợp cho những ngày cần nghĩ rõ ràng.','Thạch anh trắng Lâm Đồng','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','963Hz',array['Thạch anh trắng Lâm Đồng'],array['Hoa sự sống'],array['crown'],'published'),
('d0000000-0000-4000-8000-000000000010','e0000000-0000-4000-8000-000000000001','Phòng Lưu Ly','Hỗ trợ suy ngẫm và học tập.','Lapis lazuli Afghanistan','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','852Hz',array['Lapis lazuli Afghanistan'],array['Sao tám cánh'],array['third_eye'],'published'),
('d0000000-0000-4000-8000-000000000011','e0000000-0000-4000-8000-000000000001','Phòng Ngọc Lục Bảo','Không gian rộng cho gia đình, nuôi dưỡng sự gắn kết.','Ngọc lục bảo Colombia','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','639Hz',array['Ngọc lục bảo Colombia'],array['Cây sự sống'],array['heart'],'published'),
('d0000000-0000-4000-8000-000000000012','e0000000-0000-4000-8000-000000000001','Phòng Mã Não','Khơi niềm vui và sáng tạo, hợp với gia đình có trẻ nhỏ.','Mã não đỏ Brazil','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','417Hz',array['Mã não đỏ Brazil'],array['Xoắn ốc'],array['sacral'],'published'),
('d0000000-0000-4000-8000-000000000013','e0000000-0000-4000-8000-000000000001','Phòng Pha Lê Gác Mái','Suite dưới mái chữ A, góc thiền riêng, hợp kỳ nghỉ dài ngày.','Cụm pha lê thạch anh trắng','Đặt đá ở góc thiền, hít thở chậm 3 lần trước khi ngủ.','963Hz',array['Cụm pha lê thạch anh trắng'],array['Kim tự tháp'],array['crown'],'published');
insert into stay.rooms(id, entity_id, location_id, code, slug, name, room_type, area_m2, capacity_adults, capacity_children, max_guests, amenities, description, energy_card_id, sellable, status, sort) values
('b0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P01','thach-anh-hong','Thạch Anh Hồng','Đôi tiêu chuẩn',22,2,0,2,array['Wifi','Nước nóng','Trà thảo mộc','Cửa sổ đồi thông'],'Nuôi dưỡng yêu thương bản thân, giúp giấc ngủ êm và tâm trí dịu lại.','d0000000-0000-4000-8000-000000000001',true,'published',0),
('b0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P02','thach-anh-tim','Thạch Anh Tím','Đôi ban công',24,2,0,2,array['Wifi','Nước nóng','Trà thảo mộc','Ban công hướng đông'],'Hỗ trợ trực giác, thích hợp cho người viết nhật ký và thiền sâu.','d0000000-0000-4000-8000-000000000002',true,'published',1),
('b0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P03','ngoc-bich','Ngọc Bích','Đôi ban công',24,2,0,2,array['Wifi','Nước nóng','Trà thảo mộc','Ban công vườn'],'Cân bằng cảm xúc, nhẹ nhàng cho người vừa trải qua thay đổi.','d0000000-0000-4000-8000-000000000003',false,'published',2),
('b0000000-0000-4000-8000-000000000004','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P04','ho-phach','Hổ Phách','Đôi tiêu chuẩn',20,2,0,2,array['Wifi','Nước nóng','Trà thảo mộc','Cửa sổ sân cỏ'],'Khơi lại sự tự tin và ấm áp, hợp với buổi sáng nhiều nắng.','d0000000-0000-4000-8000-000000000004',true,'published',3),
('b0000000-0000-4000-8000-000000000005','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P05','mat-ho','Mắt Hổ','Đôi tiêu chuẩn',20,2,0,2,array['Wifi','Nước nóng','Trà thảo mộc','Cửa sổ đồi thông'],'Giúp bạn cảm thấy vững chãi, được che chở.','d0000000-0000-4000-8000-000000000005',true,'published',4),
('b0000000-0000-4000-8000-000000000006','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P06','thach-anh-khoi','Thạch Anh Khói','Đôi tiêu chuẩn',20,2,0,2,array['Wifi','Nước nóng','Trà thảo mộc','Cửa sổ rừng'],'Thả bớt căng thẳng, trở về cơ thể sau ngày dài.','d0000000-0000-4000-8000-000000000006',true,'published',5),
('b0000000-0000-4000-8000-000000000007','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P07','lam-ngoc','Lam Ngọc','Đôi ban công',24,2,0,2,array['Wifi','Nước nóng','Trà thảo mộc','Ban công thung lũng'],'Hỗ trợ diễn đạt nhẹ nhàng, hợp người làm sáng tạo.','d0000000-0000-4000-8000-000000000007',true,'published',6),
('b0000000-0000-4000-8000-000000000008','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P08','da-mat-trang','Đá Mặt Trăng','Đôi ban công',24,2,0,2,array['Wifi','Nước nóng','Trà thảo mộc','Ban công hướng tây'],'Mềm mại với chu kỳ cảm xúc.','d0000000-0000-4000-8000-000000000008',false,'published',7),
('b0000000-0000-4000-8000-000000000009','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P09','thach-anh-trang','Thạch Anh Trắng','Đôi tiêu chuẩn',20,2,0,2,array['Wifi','Nước nóng','Trà thảo mộc','Cửa sổ trời'],'Làm trong tâm trí, hợp cho những ngày cần nghĩ rõ ràng.','d0000000-0000-4000-8000-000000000009',true,'published',8),
('b0000000-0000-4000-8000-000000000010','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P10','luu-ly','Lưu Ly','Đôi tiêu chuẩn',20,2,0,2,array['Wifi','Nước nóng','Trà thảo mộc','Cửa sổ vườn'],'Hỗ trợ suy ngẫm và học tập.','d0000000-0000-4000-8000-000000000010',false,'published',9),
('b0000000-0000-4000-8000-000000000011','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P11','ngoc-luc-bao','Ngọc Lục Bảo','Gia đình',32,4,1,4,array['Wifi','Nước nóng','Trà thảo mộc','Sân riêng nhỏ'],'Không gian rộng cho gia đình, nuôi dưỡng sự gắn kết.','d0000000-0000-4000-8000-000000000011',true,'published',10),
('b0000000-0000-4000-8000-000000000012','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P12','ma-nao','Mã Não','Gia đình',30,4,1,4,array['Wifi','Nước nóng','Trà thảo mộc','Cửa sổ sân cỏ'],'Khơi niềm vui và sáng tạo, hợp với gia đình có trẻ nhỏ.','d0000000-0000-4000-8000-000000000012',false,'published',11),
('b0000000-0000-4000-8000-000000000013','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','P13','pha-le-gac-mai','Pha Lê Gác Mái','Suite gác mái',38,2,1,3,array['Wifi','Nước nóng','Trà thảo mộc','Cửa sổ tam giác, view toàn đồi'],'Suite dưới mái chữ A, góc thiền riêng, hợp kỳ nghỉ dài ngày.','d0000000-0000-4000-8000-000000000013',true,'published',12);

-- Shop base: 9 PRD categories and two warehouses.
insert into shop.categories(slug, name, sort) values
  ('da-va-vat-pham','Đá và vật phẩm',0),
  ('dung-cu-thien','Dụng cụ thiền',1),
  ('trang-suc','Trang sức',2),
  ('duoc-lieu-cong-thuc-rieng','Dược liệu công thức riêng',3),
  ('nong-san-kho-chay','Nông sản khô chay',4),
  ('gia-vi-rung','Gia vị rừng',5),
  ('muoi','Muối',6),
  ('combo-tam-linh','Combo tâm linh',7),
  ('in-an-va-thoi-trang','In ấn và thời trang',8);
insert into shop.warehouses(id, entity_id, location_id, code, name) values
  ('90000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','showroom','Kho showroom Đà Lạt'),
  ('90000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001',null,'online','Kho online');

-- Public pages and policies: DRAFT TEXT for local/staging. Owner and legal must approve before production.
insert into content.pages(entity_id, slug, kind, title, excerpt, body_md, status, published_at) values
('e0000000-0000-4000-8000-000000000001','gioi-thieu','page','Giới thiệu ZSOPO',
 'ZSOPO là hệ sinh thái nối không gian nghỉ dưỡng, kết nối học tập và hoạt động phụng sự cộng đồng.',
 E'ZSOPO là hệ sinh thái giúp mỗi người trở về với chính mình qua ba trụ cột: nghỉ ngơi trong không gian năng lượng, kết nối với người dẫn đường, và phụng sự cộng đồng.\n\n## Space\n\nKhông gian lưu trú và trải nghiệm. Điểm đang mở: Zen Homestay Đà Lạt, nhà gỗ giữa đồi thông. Mỗi phòng có một bảng năng lượng riêng mô tả đá, biểu tượng và cách dùng.\n\n## Connect\n\nHọc tập, chuyên gia và sự kiện. Phân hệ đang được chuẩn bị; hiện ZSOPO giới thiệu sản phẩm năng lượng và bài viết trên Blog.\n\n## Give\n\nHoạt động thiện nguyện và cộng đồng phụng sự. Trang quyên góp chưa mở; thông tin chương trình sẽ được công bố minh bạch khi sẵn sàng.\n\n## Đội ngũ\n\nThông tin đội ngũ đang chờ biên tập.',
 'published', now()),
('e0000000-0000-4000-8000-000000000001','noi-quy','policy','Nội quy lưu trú',
 'Giờ nhận phòng 14:00, trả phòng trước 12:00, giữ yên tĩnh từ 22:00 đến 06:00.',
 E'> Bản nháp phục vụ kiểm thử, chờ chủ cơ sở và pháp lý duyệt.\n\n## 1. Nhận và trả phòng\n\n- Xuất trình căn cước công dân, hộ chiếu hoặc giấy tờ tùy thân có ảnh để đăng ký tạm trú theo quy định.\n- Nhận phòng từ **14:00**, trả phòng trước **12:00** hôm sau. Muốn gia hạn, vui lòng báo lễ tân trước.\n\n## 2. An ninh và an toàn\n\n- Không mang vũ khí, chất nổ, chất dễ cháy, chất độc hại hoặc chất cấm vào khu lưu trú.\n- Không tự ý thay đổi bố trí trang thiết bị hoặc mang tài sản của cơ sở ra ngoài.\n- Khóa cửa khi ra ngoài và khi ngủ. Tài sản giá trị vui lòng gửi tại quầy lễ tân.\n\n## 3. Sinh hoạt chung\n\n- Giữ vệ sinh phòng và hành lang; không nấu nướng, giặt phơi trái quy định trong phòng.\n- Không hút thuốc tại khu vực cấm.\n- Tiếp khách tại sảnh; khách ở qua đêm cần khai báo với lễ tân.\n- Giữ yên tĩnh từ **22:00** đến **06:00**.\n\n## 4. Bồi thường và thanh toán\n\n- Bồi thường theo giá thị trường nếu làm hư hỏng, mất mát tài sản do sơ suất.\n- Thanh toán tiền phòng và dịch vụ phát sinh trước khi trả phòng.',
 'published', now()),
('e0000000-0000-4000-8000-000000000001','bao-mat','policy','Chính sách bảo mật',
 'Cách ZSOPO thu thập, sử dụng, lưu giữ và xóa dữ liệu cá nhân.',
 E'> Bản nháp phục vụ kiểm thử, chờ pháp lý duyệt.\n\n## Dữ liệu chúng tôi thu thập\n\nHọ tên, số điện thoại, email, thông tin đặt phòng và đơn hàng do bạn cung cấp. Giấy tờ tùy thân chỉ thu tại quầy khi nhận phòng để đăng ký tạm trú.\n\n## Mục đích\n\nXử lý đặt phòng, đơn hàng, thanh toán, chăm sóc khách hàng. Tin tiếp thị chỉ gửi khi bạn đồng ý riêng và có thể hủy bất cứ lúc nào.\n\n## Lưu giữ và xóa\n\nẢnh giấy tờ tùy thân được mã hóa và xóa sau 30 ngày. Bạn có thể yêu cầu xuất, sửa hoặc xóa dữ liệu; chúng tôi phản hồi trong 72 giờ, trừ dữ liệu giao dịch phải lưu theo quy định.\n\n## Liên hệ\n\nGửi yêu cầu qua trang Liên hệ.',
 'published', now()),
('e0000000-0000-4000-8000-000000000001','dieu-khoan','policy','Điều khoản sử dụng',
 'Điều khoản khi đặt phòng, mua hàng và sử dụng website ZSOPO.',
 E'> Bản nháp phục vụ kiểm thử, chờ pháp lý duyệt.\n\n## Đặt phòng và mua hàng\n\nGiá và tổng tiền hiển thị tại bước xác nhận là giá cuối cùng do hệ thống tính. Đặt phòng chỉ được xác nhận khi ZSOPO ghi nhận tiền cọc.\n\n## Nội dung năng lượng\n\nNội dung mang tính hỗ trợ tinh thần, không thay thế tư vấn y khoa.',
 'published', now()),
('e0000000-0000-4000-8000-000000000001','huy-hoan','policy','Chính sách hủy và hoàn tiền',
 'Điều kiện hủy, đổi ngày và hoàn tiền cọc.',
 E'> Bản nháp phục vụ kiểm thử. Mức hoàn thực tế do chủ cơ sở duyệt và được lưu theo từng đặt phòng.\n\nĐiều kiện hủy và hoàn tiền áp dụng theo phiên bản chính sách tại thời điểm bạn đặt phòng, được ghi trong xác nhận đặt phòng. Mọi khoản hoàn được duyệt và ghi nhận bằng chứng.',
 'published', now()),
('e0000000-0000-4000-8000-000000000001','giao-hang','policy','Chính sách giao hàng và đổi trả',
 'Phí giao hàng, thời gian xử lý và đổi trả sản phẩm.',
 E'> Bản nháp phục vụ kiểm thử, chờ duyệt trước khi mở bán.\n\nPhí giao hàng tính theo khu vực, hiển thị trước khi đặt. Sản phẩm có nghi lễ chuẩn bị năng lượng có thể cần thêm 24 giờ trước khi giao.',
 'published', now());

insert into ops_config.runtime_settings(key, entity_id, value, is_public) values
('site.contact', 'e0000000-0000-4000-8000-000000000001',
 '{"name":"Zen Homestay Đà Lạt","address":"Địa chỉ chờ chủ cơ sở duyệt","phone":null,"email":"lien-he@example.test","zalo":null,"mapsUrl":null,"approved":false}', true);

-- Stay policy v1 (fixture: 30% deposit per prototype, NOT an approved business policy) and rates from rooms.json.
insert into ops_config.policy_versions(entity_id, location_id, kind, version, params, summary_md) values
('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','stay',1,
 '{"deposit_rate_bp":3000,"hold_minutes":30,"quote_ttl_minutes":10,"child_free_under_age":6,"check_in":"14:00","check_out":"12:00","handbook_hours_before":24,"thanks_hours_after":24,"cancellation":"Theo chính sách hủy và hoàn tiền tại thời điểm đặt (bản nháp chờ duyệt)."}',
 E'Cọc 30% để giữ phòng. Nhận phòng 14:00, trả phòng trước 12:00. Hủy và hoàn tiền theo chính sách tại thời điểm đặt.');

insert into stay.rate_plans(entity_id, location_id, room_id, kind, price, extra_adult_fee, extra_child_fee)
select entity_id, location_id, id, 'base',
  case room_type when 'Đôi tiêu chuẩn' then 1250000 when 'Đôi ban công' then 1450000 when 'Gia đình' then 2200000 else 2800000 end,
  250000, 150000
from stay.rooms where location_id = 'c0000000-0000-4000-8000-000000000001';
-- Weekend surcharge (Fri, Sat +200.000 đ) from the prototype.
insert into stay.rate_plans(entity_id, location_id, room_id, kind, dow, price, label)
select rp.entity_id, rp.location_id, rp.room_id, 'weekday', d, rp.price + 200000, 'Cuối tuần'
from stay.rate_plans rp cross join unnest(array[5,6]) d where rp.kind = 'base';
-- Holiday sample: 24-26/12 (+500.000 đ).
insert into stay.rate_plans(entity_id, location_id, room_id, kind, date_range, price, label)
select entity_id, location_id, room_id, 'date', daterange('2026-12-24','2026-12-26'), price + 500000, 'Giáng sinh'
from stay.rate_plans where kind = 'base';

-- Payment config: FAKE bank account for local QA only (approved=true so the flow is testable). Production needs Finance approval.
insert into ops_config.runtime_settings(key, entity_id, value, is_public) values
('payment.vietqr', 'e0000000-0000-4000-8000-000000000001', '{"bankBin":"970436","bankName":"Ngân hàng thử nghiệm","accountNo":"0000000000","accountName":"ZSOPO THU NGHIEM","approved":true,"fixture":true}', false),
('rate_limit.scale', null, '100', false);

-- Transactional templates (plain text, {{var}} allow-list). Copy is a draft for owner review.
insert into ops_config.notification_templates(entity_id, key, channel, subject, body, allowed_vars) values
('e0000000-0000-4000-8000-000000000001','booking.confirmed','email','Xác nhận đặt phòng {{orderCode}} tại {{locationName}}',
 E'Chào {{name}},\n\nZSOPO đã nhận tiền cọc và xác nhận đặt phòng {{orderCode}}.\n\nPhòng: {{roomName}}\nNhận phòng: {{arrival}} từ {{checkIn}}\nTrả phòng: {{departure}} trước {{checkOut}}\nĐã thanh toán: {{paid}} đ\nCòn lại thanh toán tại quầy: {{due}} đ\n\nXem đặt phòng: {{link}}\n\nHẹn gặp bạn tại Đà Lạt.\nZSOPO',
 array['name','orderCode','locationName','roomName','arrival','checkIn','departure','checkOut','paid','due','link']),
('e0000000-0000-4000-8000-000000000001','handbook.due','email','Cẩm nang lưu trú cho đặt phòng {{orderCode}}',
 E'Chào {{name}},\n\nNgày {{arrival}} bạn sẽ nhận phòng {{roomName}} từ {{checkIn}}.\n\nCẩm nang, đường đi và nội quy: {{handbookUrl}}\nĐặt phòng của bạn: {{link}}\n\nZSOPO',
 array['name','orderCode','arrival','roomName','checkIn','handbookUrl','link']),
('e0000000-0000-4000-8000-000000000001','checkout.thanks','email','Cảm ơn bạn đã ở cùng ZSOPO',
 E'Chào {{name}},\n\nCảm ơn bạn đã lưu trú tại {{locationName}}. Nếu có thời gian, chia sẻ trải nghiệm của bạn giúp chúng tôi: {{reviewUrl}}\n\nZSOPO',
 array['name','locationName','reviewUrl']),
('e0000000-0000-4000-8000-000000000001','ops.alert','email','[ZSOPO vận hành] {{kind}}',
 E'Có việc cần xử lý: {{kind}}\n\nChi tiết: {{detail}}\n\nMở trang quản trị để xử lý.',
 array['kind','detail']);

insert into ops_config.runtime_settings(key, entity_id, value, is_public) values
('ops.alerts', 'e0000000-0000-4000-8000-000000000001', '{"alertEmail":"van-hanh@example.test"}', false);

-- Local only: let pg_cron/pg_net reach the notify Edge Function (demo service key of the local stack).
select vault.create_secret('http://supabase_kong_zsopo:8000/functions/v1/notify', 'notify_url');
select vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU', 'notify_key');

insert into content.pages(entity_id, slug, kind, title, excerpt, body_md, status, published_at) values
('e0000000-0000-4000-8000-000000000001','handbook-da-lat','page','Cẩm nang lưu trú Zen Homestay Đà Lạt',
 'Đường đi, giờ nhận và trả phòng, nội quy và lưu ý.',
 E'> Bản nháp chờ quản lý điểm duyệt.\n\n## Giờ nhận và trả phòng\n\nNhận phòng từ 14:00, trả phòng trước 12:00. Báo lễ tân trước nếu cần nhận sớm hoặc trả muộn.\n\n## Khi đến\n\nVui lòng mang căn cước công dân hoặc hộ chiếu để đăng ký tạm trú. Thông tin Wifi và mã cửa được lễ tân trao khi nhận phòng.\n\n## Yên tĩnh\n\nGiữ yên tĩnh từ 22:00 đến 06:00. Thiền buổi sáng tại sân vườn nếu thời tiết cho phép.\n\n## Nội quy đầy đủ\n\nXem [Nội quy lưu trú](/chinh-sach/noi-quy).',
 'published', now());

-- Services (fixture menu from the homestay journey docs; prices NOT approved).
insert into stay.services(entity_id, location_id, group_key, source_category, slug, name, description, unit, price, lead_time_min, serve_from, serve_to, prebook_discount_bp, revenue_source, sort) values
('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','food',null,'bua-sang-thuc-duong','Bữa sáng thực dưỡng','Cháo gạo lứt, rau củ hấp, trà gừng.','phần',120000,720,'06:30','09:30',1000,'own_service',1),
('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','food','b2b_upsell','tra-thao-moc-tai-phong','Trà thảo mộc tại phòng','Ấm trà hoa cúc và atiso Đà Lạt.','ấm',60000,30,'07:00','21:30',0,'beverage',2),
('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','transport',null,'xe-don-lien-khuong','Xe đón sân bay Liên Khương','Xe 4 chỗ, đón theo giờ hạ cánh.','lượt',350000,1440,'05:00','23:00',500,'own_service',3),
('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','experience',null,'thien-am-thanh-chuong-xoay','Thiền âm thanh chuông xoay','Buổi thiền 60 phút cùng người hướng dẫn đồng tổ chức.','người',250000,240,'06:00','20:00',1000,'cohost_service',4),
('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','flex',null,'giat-ui','Giặt ủi','Trả trong ngày nếu gửi trước 10:00.','kg',80000,120,'07:00','18:00',0,'own_service',5);

-- SOP templates v1: 7 groups (XLSX) carrying the 11 DOCX checkpoints (safe entry, clean/dirty separation, equipment check, self-check).
insert into stay.checklist_templates(entity_id, kind, version, title, items) values
('e0000000-0000-4000-8000-000000000001','room_checkout',1,'BP01 Dọn phòng khách trả',
 '[{"code":"G1-1","group":"1. Vào phòng an toàn","label":"Gõ cửa, xưng danh, kiểm tra biển DND trước khi vào","safety":true},
   {"code":"G1-2","group":"1. Vào phòng an toàn","label":"Mở rèm, cửa sổ thông gió; kiểm tra mùi lạ, khói","safety":true},
   {"code":"G2-1","group":"2. Thu dọn","label":"Kiểm tra đồ khách để quên trước khi thu dọn","photo":true},
   {"code":"G2-2","group":"2. Thu dọn","label":"Thu rác, đồ vải bẩn vào túi riêng; tách dụng cụ sạch và bẩn"},
   {"code":"G3-1","group":"3. Giường","label":"Thay ga, vỏ gối, vỏ chăn sạch; giường phẳng, không vết"},
   {"code":"G4-1","group":"4. Phòng tắm và WC","label":"Cọ bồn cầu, lavabo, sàn tắm; khử khuẩn tay nắm"},
   {"code":"G4-2","group":"4. Phòng tắm và WC","label":"Kiểm tra nước nóng, thoát nước, rò rỉ","safety":true},
   {"code":"G5-1","group":"5. Bề mặt và thiết bị","label":"Lau bụi bề mặt, gương, kính, góc đá năng lượng"},
   {"code":"G5-2","group":"5. Bề mặt và thiết bị","label":"Kiểm tra đèn, ổ điện, điều hòa/sưởi, TV, Wifi","safety":true},
   {"code":"G6-1","group":"6. Bổ sung vật tư","label":"Bổ sung khăn, amenities, trà thảo mộc, nước uống theo chuẩn"},
   {"code":"G7-1","group":"7. Sàn và tự kiểm (BM02)","label":"Hút bụi, lau sàn; tự kiểm lần cuối mùi, ánh sáng, bố trí","photo":true}]'),
('e0000000-0000-4000-8000-000000000001','room_stayover',1,'BP02 Dọn phòng đang ở',
 '[{"code":"S1","group":"1. Vào phòng","label":"Có sự đồng ý của khách, không có DND","safety":true},
   {"code":"S2","group":"2. Thu dọn","label":"Thu rác, không di chuyển đồ cá nhân của khách"},
   {"code":"S3","group":"3. Giường","label":"Sửa giường; thay ga theo yêu cầu khách"},
   {"code":"S4","group":"4. Phòng tắm","label":"Làm sạch phòng tắm, thay khăn đã dùng"},
   {"code":"S5","group":"6. Bổ sung","label":"Bổ sung amenities, nước uống"}]'),
('e0000000-0000-4000-8000-000000000001','common_area',1,'BP04 Khu chung',
 '[{"code":"C-KITCHEN","group":"Bếp","label":"Bếp chung sạch, gas tắt, rác đổ","safety":true,"naAllowed":true},
   {"code":"C-BBQ","group":"BBQ","label":"Khu BBQ sạch, than nguội","safety":true,"naAllowed":true},
   {"code":"C-LOBBY","group":"Sảnh","label":"Sảnh, quầy lễ tân sạch, lối thoát hiểm thông thoáng","safety":true},
   {"code":"C-GARDEN","group":"Sân vườn","label":"Sân vườn, khu thiền gọn gàng","naAllowed":true},
   {"code":"C-POOL","group":"Hồ bơi","label":"Hồ bơi (nếu có): nước sạch, biển cảnh báo","safety":true,"naAllowed":true}]');

insert into stay.supply_items(entity_id, location_id, code, name, kind, min_level) values
('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','GA-DOI','Ga giường đôi','linen',20),
('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','KHAN-TAM','Khăn tắm','linen',30),
('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','TRA-TM','Trà thảo mộc gói','amenity',50);
