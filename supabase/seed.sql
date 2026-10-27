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
