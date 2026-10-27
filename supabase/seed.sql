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

-- Shop catalogue: prototype data for local QA only (rating/sold/give/lot removed). Real SKUs need content approval.
insert into core.energy_cards(id, entity_id, title, purpose, origin, usage, frequency, stones, symbols, chakras, status) values
('d1000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','Vòng tay thạch anh hồng 8 ly','Nuôi dưỡng yêu thương bản thân, mềm lại khi căng thẳng.','Madagascar, chế tác tại Đà Lạt','Đeo tay trái. Mỗi sáng đặt tay lên tim, thở chậm 3 nhịp.','528Hz',array['Thạch anh hồng Madagascar']::text[],array['Hoa sen']::text[],array['heart']::text[],'published'),
('d1000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001','Cụm thạch anh tím Uruguay','Hỗ trợ trực giác, giữ không gian ngủ yên tĩnh.','Uruguay','Đặt ở đầu giường hoặc góc thiền, cách gối 50cm.','852Hz',array['Thạch anh tím Uruguay']::text[],array['Mắt bindu']::text[],array['third_eye']::text[],'published'),
('d1000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000001','Đá mắt hổ thô','Giúp cảm thấy vững chãi.','Nam Phi','Mang trong túi áo hoặc đặt ở bàn làm việc.','396Hz',array['Mắt hổ vàng Nam Phi']::text[],array['Vòng enso']::text[],array['root']::text[],'published'),
('d1000000-0000-4000-8000-000000000004','e0000000-0000-4000-8000-000000000001','Kim tự tháp thạch anh trắng','Làm trong không gian và tâm trí.','Lâm Đồng','Đặt giữa bàn, đỉnh hướng lên.','963Hz',array['Thạch anh trắng Lâm Đồng']::text[],array['Kim tự tháp']::text[],array['crown']::text[],'published'),
('d1000000-0000-4000-8000-000000000005','e0000000-0000-4000-8000-000000000001','Chuông xoay Nepal 7 kim loại 14cm','Dẫn thiền, làm sạch không gian bằng âm thanh.','Patan, Nepal','Xoay dùi gỗ quanh miệng chuông, chậm và đều.','741Hz',array['']::text[],array['Om']::text[],array['throat']::text[],'published'),
('d1000000-0000-4000-8000-000000000006','e0000000-0000-4000-8000-000000000001','Bồ đoàn vỏ kiều mạch','Ngồi thẳng lưng lâu mà không mỏi.','May tại Đà Lạt','Ngồi trên 1/3 trước bồ đoàn, hai gối chạm sàn.',null,array['']::text[],array['']::text[],array['root']::text[],'published'),
('d1000000-0000-4000-8000-000000000007','e0000000-0000-4000-8000-000000000001','Nhang thảo mộc trầm','Mùi trầm nhẹ cho buổi thiền.','Làm tay tại Lạc Dương','Đốt 1 nén, để cách xa rèm.',null,array['']::text[],array['Hoa sen']::text[],array['crown']::text[],'published'),
('d1000000-0000-4000-8000-000000000008','e0000000-0000-4000-8000-000000000001','Mặt dây chuyền hoa sen bạc','Nhắc nhở sự thanh tịnh mỗi ngày.','Bạc 925, chế tác tại Hà Nội','Đeo sát tim.',null,array['']::text[],array['Hoa sen']::text[],array['crown']::text[],'published'),
('d1000000-0000-4000-8000-000000000009','e0000000-0000-4000-8000-000000000001','Vòng mala 108 hạt gỗ đàn hương','Đếm hơi thở, trì chú.','Gỗ đàn hương Ấn Độ','Lần hạt bằng ngón cái và ngón giữa.',null,array['']::text[],array['']::text[],array['heart']::text[],'published'),
('d1000000-0000-4000-8000-000000000010','e0000000-0000-4000-8000-000000000001','Gói ngâm chân thảo dược 7 ngày','Thả lỏng cơ thể trước giờ ngủ.','Công thức Zen Homestay','Ngâm 1 gói với 3 lít nước ấm 40°C trong 15 phút.','432Hz',array['']::text[],array['']::text[],array['root']::text[],'published'),
('d1000000-0000-4000-8000-000000000011','e0000000-0000-4000-8000-000000000001','Tinh dầu oải hương Đà Lạt 10ml','Giúp dễ ngủ, dịu tâm trí.','Trang trại oải hương Đà Lạt','3 giọt vào đèn xông hoặc gối.',null,array['']::text[],array['']::text[],array['third_eye']::text[],'published'),
('d1000000-0000-4000-8000-000000000012','e0000000-0000-4000-8000-000000000001','Combo Thiền Định: trà hoa cúc, hạnh nhân, mật ong rừng, bột nghệ','Tĩnh tâm, hỗ trợ ngồi thiền sâu buổi tối.','Nông sản Lâm Đồng','Pha 1 thìa trà hoa cúc với 200ml nước 90°C, thêm mật ong. Ăn kèm 7 hạt hạnh nhân.','963Hz',array['']::text[],array['Hoa sự sống']::text[],array['crown']::text[],'published'),
('d1000000-0000-4000-8000-000000000013','e0000000-0000-4000-8000-000000000001','Trà hoa cúc Đà Lạt','Thư giãn, dễ ngủ.','Trại Mát, Đà Lạt','1 thìa / 200ml nước 90°C, ủ 5 phút.',null,array['']::text[],array['']::text[],array['crown']::text[],'published'),
('d1000000-0000-4000-8000-000000000014','e0000000-0000-4000-8000-000000000001','Hạnh nhân rang mộc','Bữa phụ nhẹ, đủ năng lượng.','Rang tại Đà Lạt','',null,array['']::text[],array['']::text[],array['solar']::text[],'published'),
('d1000000-0000-4000-8000-000000000015','e0000000-0000-4000-8000-000000000001','Mắc khén Tây Bắc','Gia vị rừng thơm ấm.','Sơn La','',null,array['']::text[],array['']::text[],array['solar']::text[],'published'),
('d1000000-0000-4000-8000-000000000016','e0000000-0000-4000-8000-000000000001','Hạt dổi rừng','Gia vị rừng hiếm.','Điện Biên','',null,array['']::text[],array['']::text[],array['sacral']::text[],'published'),
('d1000000-0000-4000-8000-000000000017','e0000000-0000-4000-8000-000000000001','Muối hồng rang thảo mộc Lâm Đồng','Muối ăn và muối tẩy uế không gian.','Lâm Đồng','Rắc một nhúm ở 4 góc phòng mỗi tháng.',null,array['']::text[],array['']::text[],array['root']::text[],'published'),
('d1000000-0000-4000-8000-000000000018','e0000000-0000-4000-8000-000000000001','Muối tắm thạch anh hồng','Thư giãn trong bồn tắm.','Đà Lạt','3 thìa vào bồn nước ấm.',null,array['']::text[],array['']::text[],array['heart']::text[],'published'),
('d1000000-0000-4000-8000-000000000019','e0000000-0000-4000-8000-000000000001','Nghi thức năng lượng tại gia','Bộ đủ để bắt đầu một góc thiền tại nhà.','Đóng gói tại Zen Homestay','Quét QR lá bài trong hộp để mở bài hướng dẫn 7 ngày.','528Hz',array['Thạch anh hồng, thạch anh trắng']::text[],array['Hoa sự sống']::text[],array['heart']::text[],'published'),
('d1000000-0000-4000-8000-000000000020','e0000000-0000-4000-8000-000000000001','Combo Trăng non','Gieo ý định đầu tháng âm lịch.','Zen Homestay','Thắp nến, viết 3 ý định, đặt đá lên sổ.','417Hz',array['Đá mặt trăng']::text[],array['Trăng khuyết']::text[],array['sacral']::text[],'published'),
('d1000000-0000-4000-8000-000000000021','e0000000-0000-4000-8000-000000000001','Áo linen thêu hoa sự sống','','May tại Đà Lạt','',null,array['']::text[],array['Hoa sự sống']::text[],array['crown']::text[],'published'),
('d1000000-0000-4000-8000-000000000022','e0000000-0000-4000-8000-000000000001','Túi canvas mandala','','In lụa thủ công','',null,array['']::text[],array['Mandala']::text[],array['heart']::text[],'published'),
('d1000000-0000-4000-8000-000000000023','e0000000-0000-4000-8000-000000000001','Bộ lá bài năng lượng 44 lá','Rút một lá mỗi sáng, mỗi lá có QR bài thiền.','Thiết kế ZSOPO','Quét QR mặt sau lá bài.',null,array['']::text[],array['']::text[],array['third_eye']::text[],'published'),
('d1000000-0000-4000-8000-000000000024','e0000000-0000-4000-8000-000000000001','Vòng tay đá mặt trăng','Mềm mại với chu kỳ cảm xúc.','Ấn Độ','Đeo tay trái vào kỳ trăng non.','417Hz',array['Đá mặt trăng Ấn Độ']::text[],array['Trăng khuyết']::text[],array['sacral']::text[],'published');
insert into shop.products(id, entity_id, category_id, slug, name, summary, origin, usage, energy_card_id, ritual_slug, status) values
('f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='da-va-vat-pham'),'vong-tay-thach-anh-hong-8-ly','Vòng tay thạch anh hồng 8 ly','Nuôi dưỡng yêu thương bản thân, mềm lại khi căng thẳng.','Madagascar, chế tác tại Đà Lạt','Đeo tay trái. Mỗi sáng đặt tay lên tim, thở chậm 3 nhịp.','d1000000-0000-4000-8000-000000000001','nghi-le-vong-tay-thach-anh-hong-8-ly','published'),
('f0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='da-va-vat-pham'),'cum-thach-anh-tim-uruguay','Cụm thạch anh tím Uruguay','Hỗ trợ trực giác, giữ không gian ngủ yên tĩnh.','Uruguay','Đặt ở đầu giường hoặc góc thiền, cách gối 50cm.','d1000000-0000-4000-8000-000000000002','nghi-le-cum-thach-anh-tim-uruguay','published'),
('f0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='da-va-vat-pham'),'da-mat-ho-tho','Đá mắt hổ thô','Giúp cảm thấy vững chãi.','Nam Phi','Mang trong túi áo hoặc đặt ở bàn làm việc.','d1000000-0000-4000-8000-000000000003','nghi-le-da-mat-ho-tho','published'),
('f0000000-0000-4000-8000-000000000004','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='da-va-vat-pham'),'kim-tu-thap-thach-anh-trang','Kim tự tháp thạch anh trắng','Làm trong không gian và tâm trí.','Lâm Đồng','Đặt giữa bàn, đỉnh hướng lên.','d1000000-0000-4000-8000-000000000004','nghi-le-kim-tu-thap-thach-anh-trang','published'),
('f0000000-0000-4000-8000-000000000005','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='dung-cu-thien'),'chuong-xoay-nepal-7-kim-loai-14cm','Chuông xoay Nepal 7 kim loại 14cm','Dẫn thiền, làm sạch không gian bằng âm thanh.','Patan, Nepal','Xoay dùi gỗ quanh miệng chuông, chậm và đều.','d1000000-0000-4000-8000-000000000005','nghi-le-chuong-xoay-nepal-7-kim-loai-14cm','published'),
('f0000000-0000-4000-8000-000000000006','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='dung-cu-thien'),'bo-doan-vo-kieu-mach','Bồ đoàn vỏ kiều mạch','Ngồi thẳng lưng lâu mà không mỏi.','May tại Đà Lạt','Ngồi trên 1/3 trước bồ đoàn, hai gối chạm sàn.','d1000000-0000-4000-8000-000000000006','nghi-le-bo-doan-vo-kieu-mach','published'),
('f0000000-0000-4000-8000-000000000007','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='dung-cu-thien'),'nhang-thao-moc-tram','Nhang thảo mộc trầm','Mùi trầm nhẹ cho buổi thiền.','Làm tay tại Lạc Dương','Đốt 1 nén, để cách xa rèm.','d1000000-0000-4000-8000-000000000007','nghi-le-nhang-thao-moc-tram','published'),
('f0000000-0000-4000-8000-000000000008','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='trang-suc'),'mat-day-chuyen-hoa-sen-bac','Mặt dây chuyền hoa sen bạc','Nhắc nhở sự thanh tịnh mỗi ngày.','Bạc 925, chế tác tại Hà Nội','Đeo sát tim.','d1000000-0000-4000-8000-000000000008','nghi-le-mat-day-chuyen-hoa-sen-bac','published'),
('f0000000-0000-4000-8000-000000000009','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='trang-suc'),'vong-mala-108-hat-go-dan-huong','Vòng mala 108 hạt gỗ đàn hương','Đếm hơi thở, trì chú.','Gỗ đàn hương Ấn Độ','Lần hạt bằng ngón cái và ngón giữa.','d1000000-0000-4000-8000-000000000009','nghi-le-vong-mala-108-hat-go-dan-huong','published'),
('f0000000-0000-4000-8000-000000000010','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='duoc-lieu-cong-thuc-rieng'),'goi-ngam-chan-thao-duoc-7-ngay','Gói ngâm chân thảo dược 7 ngày','Thả lỏng cơ thể trước giờ ngủ.','Công thức Zen Homestay','Ngâm 1 gói với 3 lít nước ấm 40°C trong 15 phút.','d1000000-0000-4000-8000-000000000010','nghi-le-goi-ngam-chan-thao-duoc-7-ngay','published'),
('f0000000-0000-4000-8000-000000000011','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='duoc-lieu-cong-thuc-rieng'),'tinh-dau-oai-huong-da-lat-10ml','Tinh dầu oải hương Đà Lạt 10ml','Giúp dễ ngủ, dịu tâm trí.','Trang trại oải hương Đà Lạt','3 giọt vào đèn xông hoặc gối.','d1000000-0000-4000-8000-000000000011','nghi-le-tinh-dau-oai-huong-da-lat-10ml','published'),
('f0000000-0000-4000-8000-000000000012','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='nong-san-kho-chay'),'combo-thien-dinh-tra-hoa-cuc-hanh-nhan-mat-ong-rung-bot-nghe','Combo Thiền Định: trà hoa cúc, hạnh nhân, mật ong rừng, bột nghệ','Tĩnh tâm, hỗ trợ ngồi thiền sâu buổi tối.','Nông sản Lâm Đồng','Pha 1 thìa trà hoa cúc với 200ml nước 90°C, thêm mật ong. Ăn kèm 7 hạt hạnh nhân.','d1000000-0000-4000-8000-000000000012','nghi-le-combo-thien-dinh-tra-hoa-cuc-hanh-nhan-mat-ong-rung-bot-nghe','published'),
('f0000000-0000-4000-8000-000000000013','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='nong-san-kho-chay'),'tra-hoa-cuc-da-lat','Trà hoa cúc Đà Lạt','Thư giãn, dễ ngủ.','Trại Mát, Đà Lạt','1 thìa / 200ml nước 90°C, ủ 5 phút.','d1000000-0000-4000-8000-000000000013','nghi-le-tra-hoa-cuc-da-lat','published'),
('f0000000-0000-4000-8000-000000000014','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='nong-san-kho-chay'),'hanh-nhan-rang-moc','Hạnh nhân rang mộc','Bữa phụ nhẹ, đủ năng lượng.','Rang tại Đà Lạt','','d1000000-0000-4000-8000-000000000014','nghi-le-hanh-nhan-rang-moc','published'),
('f0000000-0000-4000-8000-000000000015','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='gia-vi-rung'),'mac-khen-tay-bac','Mắc khén Tây Bắc','Gia vị rừng thơm ấm.','Sơn La','','d1000000-0000-4000-8000-000000000015','nghi-le-mac-khen-tay-bac','published'),
('f0000000-0000-4000-8000-000000000016','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='gia-vi-rung'),'hat-doi-rung','Hạt dổi rừng','Gia vị rừng hiếm.','Điện Biên','','d1000000-0000-4000-8000-000000000016','nghi-le-hat-doi-rung','published'),
('f0000000-0000-4000-8000-000000000017','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='muoi'),'muoi-hong-rang-thao-moc-lam-dong','Muối hồng rang thảo mộc Lâm Đồng','Muối ăn và muối tẩy uế không gian.','Lâm Đồng','Rắc một nhúm ở 4 góc phòng mỗi tháng.','d1000000-0000-4000-8000-000000000017','nghi-le-muoi-hong-rang-thao-moc-lam-dong','published'),
('f0000000-0000-4000-8000-000000000018','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='muoi'),'muoi-tam-thach-anh-hong','Muối tắm thạch anh hồng','Thư giãn trong bồn tắm.','Đà Lạt','3 thìa vào bồn nước ấm.','d1000000-0000-4000-8000-000000000018','nghi-le-muoi-tam-thach-anh-hong','published'),
('f0000000-0000-4000-8000-000000000019','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='combo-tam-linh'),'nghi-thuc-nang-luong-tai-gia','Nghi thức năng lượng tại gia','Bộ đủ để bắt đầu một góc thiền tại nhà.','Đóng gói tại Zen Homestay','Quét QR lá bài trong hộp để mở bài hướng dẫn 7 ngày.','d1000000-0000-4000-8000-000000000019','nghi-le-nghi-thuc-nang-luong-tai-gia','published'),
('f0000000-0000-4000-8000-000000000020','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='combo-tam-linh'),'combo-trang-non','Combo Trăng non','Gieo ý định đầu tháng âm lịch.','Zen Homestay','Thắp nến, viết 3 ý định, đặt đá lên sổ.','d1000000-0000-4000-8000-000000000020','nghi-le-combo-trang-non','published'),
('f0000000-0000-4000-8000-000000000021','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='in-an-va-thoi-trang'),'ao-linen-theu-hoa-su-song','Áo linen thêu hoa sự sống','','May tại Đà Lạt','','d1000000-0000-4000-8000-000000000021','nghi-le-ao-linen-theu-hoa-su-song','published'),
('f0000000-0000-4000-8000-000000000022','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='in-an-va-thoi-trang'),'tui-canvas-mandala','Túi canvas mandala','','In lụa thủ công','','d1000000-0000-4000-8000-000000000022','nghi-le-tui-canvas-mandala','published'),
('f0000000-0000-4000-8000-000000000023','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='in-an-va-thoi-trang'),'bo-la-bai-nang-luong-44-la','Bộ lá bài năng lượng 44 lá','Rút một lá mỗi sáng, mỗi lá có QR bài thiền.','Thiết kế ZSOPO','Quét QR mặt sau lá bài.','d1000000-0000-4000-8000-000000000023','nghi-le-bo-la-bai-nang-luong-44-la','published'),
('f0000000-0000-4000-8000-000000000024','e0000000-0000-4000-8000-000000000001',(select id from shop.categories where slug='da-va-vat-pham'),'vong-tay-da-mat-trang','Vòng tay đá mặt trăng','Mềm mại với chu kỳ cảm xúc.','Ấn Độ','Đeo tay trái vào kỳ trăng non.','d1000000-0000-4000-8000-000000000024','nghi-le-vong-tay-da-mat-trang','published');
insert into shop.product_variants(id, entity_id, product_id, sku, name, price) values
('f1000000-0000-4000-8000-000001000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001','ZS-001-1','Size S (14-15cm)',380000),
('f1000000-0000-4000-8000-000001000002','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001','ZS-001-2','Size M (16-17cm)',380000),
('f1000000-0000-4000-8000-000001000003','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000001','ZS-001-3','Size L (18cm)',380000),
('f1000000-0000-4000-8000-000002000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002','ZS-002-1','300-400g',1250000),
('f1000000-0000-4000-8000-000002000002','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002','ZS-002-2','500-700g',1250000),
('f1000000-0000-4000-8000-000003000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000003','ZS-003-1','1 viên',220000),
('f1000000-0000-4000-8000-000004000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000004','ZS-004-1','5cm',650000),
('f1000000-0000-4000-8000-000004000002','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000004','ZS-004-2','8cm',650000),
('f1000000-0000-4000-8000-000005000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000005','ZS-005-1','12cm',1850000),
('f1000000-0000-4000-8000-000005000002','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000005','ZS-005-2','14cm',1850000),
('f1000000-0000-4000-8000-000005000003','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000005','ZS-005-3','18cm',1850000),
('f1000000-0000-4000-8000-000006000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000006','ZS-006-1','Màu đất',590000),
('f1000000-0000-4000-8000-000006000002','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000006','ZS-006-2','Màu rêu',590000),
('f1000000-0000-4000-8000-000006000003','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000006','ZS-006-3','Màu tím than',590000),
('f1000000-0000-4000-8000-000007000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000007','ZS-007-1','Hộp 30 nén',120000),
('f1000000-0000-4000-8000-000008000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000008','ZS-008-1','Dây 45cm',890000),
('f1000000-0000-4000-8000-000008000002','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000008','ZS-008-2','Dây 50cm',890000),
('f1000000-0000-4000-8000-000009000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000009','ZS-009-1','108 hạt 6 ly',750000),
('f1000000-0000-4000-8000-000010000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000010','ZS-010-1','7 gói',210000),
('f1000000-0000-4000-8000-000011000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000011','ZS-011-1','10ml',180000),
('f1000000-0000-4000-8000-000011000002','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000011','ZS-011-2','30ml',180000),
('f1000000-0000-4000-8000-000012000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000012','ZS-012-1','Hộp tiêu chuẩn',450000),
('f1000000-0000-4000-8000-000012000002','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000012','ZS-012-2','Hộp quà',450000),
('f1000000-0000-4000-8000-000013000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000013','ZS-013-1','50g',150000),
('f1000000-0000-4000-8000-000013000002','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000013','ZS-013-2','100g',150000),
('f1000000-0000-4000-8000-000014000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000014','ZS-014-1','250g',160000),
('f1000000-0000-4000-8000-000015000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000015','ZS-015-1','100g',95000),
('f1000000-0000-4000-8000-000016000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000016','ZS-016-1','50g',120000),
('f1000000-0000-4000-8000-000017000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000017','ZS-017-1','200g',120000),
('f1000000-0000-4000-8000-000018000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000018','ZS-018-1','300g',180000),
('f1000000-0000-4000-8000-000019000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000019','ZS-019-1','Hộp tiêu chuẩn',1490000),
('f1000000-0000-4000-8000-000020000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000020','ZS-020-1','1 bộ',690000),
('f1000000-0000-4000-8000-000021000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000021','ZS-021-1','S',650000),
('f1000000-0000-4000-8000-000021000002','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000021','ZS-021-2','M',650000),
('f1000000-0000-4000-8000-000021000003','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000021','ZS-021-3','L',650000),
('f1000000-0000-4000-8000-000021000004','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000021','ZS-021-4','XL',650000),
('f1000000-0000-4000-8000-000022000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000022','ZS-022-1','1 cỡ',220000),
('f1000000-0000-4000-8000-000023000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000023','ZS-023-1','1 bộ',390000),
('f1000000-0000-4000-8000-000024000001','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000024','ZS-024-1','S',420000),
('f1000000-0000-4000-8000-000024000002','e0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000024','ZS-024-2','M',420000);
insert into shop.inventory(entity_id, variant_id, warehouse_id, on_hand) values
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000001000001','90000000-0000-4000-8000-000000000002',8),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000001000002','90000000-0000-4000-8000-000000000002',8),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000001000003','90000000-0000-4000-8000-000000000002',0),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000002000001','90000000-0000-4000-8000-000000000002',3),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000002000002','90000000-0000-4000-8000-000000000002',3),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000003000001','90000000-0000-4000-8000-000000000002',40),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000004000001','90000000-0000-4000-8000-000000000002',5),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000004000002','90000000-0000-4000-8000-000000000002',5),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000005000001','90000000-0000-4000-8000-000000000002',2),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000005000002','90000000-0000-4000-8000-000000000002',2),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000005000003','90000000-0000-4000-8000-000000000002',2),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000006000001','90000000-0000-4000-8000-000000000002',5),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000006000002','90000000-0000-4000-8000-000000000002',0),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000006000003','90000000-0000-4000-8000-000000000002',5),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000007000001','90000000-0000-4000-8000-000000000002',60),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000008000001','90000000-0000-4000-8000-000000000002',4),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000008000002','90000000-0000-4000-8000-000000000002',4),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000009000001','90000000-0000-4000-8000-000000000002',18),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000010000001','90000000-0000-4000-8000-000000000002',0),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000011000001','90000000-0000-4000-8000-000000000002',15),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000011000002','90000000-0000-4000-8000-000000000002',15),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000012000001','90000000-0000-4000-8000-000000000002',10),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000012000002','90000000-0000-4000-8000-000000000002',10),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000013000001','90000000-0000-4000-8000-000000000002',22),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000013000002','90000000-0000-4000-8000-000000000002',22),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000014000001','90000000-0000-4000-8000-000000000002',32),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000015000001','90000000-0000-4000-8000-000000000002',25),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000016000001','90000000-0000-4000-8000-000000000002',14),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000017000001','90000000-0000-4000-8000-000000000002',50),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000018000001','90000000-0000-4000-8000-000000000002',22),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000019000001','90000000-0000-4000-8000-000000000002',7),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000020000001','90000000-0000-4000-8000-000000000002',12),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000021000001','90000000-0000-4000-8000-000000000002',4),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000021000002','90000000-0000-4000-8000-000000000002',4),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000021000003','90000000-0000-4000-8000-000000000002',4),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000021000004','90000000-0000-4000-8000-000000000002',0),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000022000001','90000000-0000-4000-8000-000000000002',35),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000023000001','90000000-0000-4000-8000-000000000002',19),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000024000001','90000000-0000-4000-8000-000000000002',1),
('e0000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000024000002','90000000-0000-4000-8000-000000000002',1);
insert into shop.ritual_contents(entity_id, slug, title, intro, steps, status) values
('e0000000-0000-4000-8000-000000000001','nghi-le-vong-tay-thach-anh-hong-8-ly','Nghi lễ: Vòng tay thạch anh hồng 8 ly','Nuôi dưỡng yêu thương bản thân, mềm lại khi căng thẳng.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Đeo tay trái. Mỗi sáng đặt tay lên tim, thở chậm 3 nhịp.'),jsonb_build_object('title','Làm sạch năng lượng','text','Làm sạch dưới trăng tròn mỗi tháng')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-cum-thach-anh-tim-uruguay','Nghi lễ: Cụm thạch anh tím Uruguay','Hỗ trợ trực giác, giữ không gian ngủ yên tĩnh.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Đặt ở đầu giường hoặc góc thiền, cách gối 50cm.'),jsonb_build_object('title','Làm sạch năng lượng','text','Xông khói thảo mộc trước khi đặt')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-da-mat-ho-tho','Nghi lễ: Đá mắt hổ thô','Giúp cảm thấy vững chãi.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Mang trong túi áo hoặc đặt ở bàn làm việc.'),jsonb_build_object('title','Làm sạch năng lượng','text','Phơi nắng sớm 15 phút')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-kim-tu-thap-thach-anh-trang','Nghi lễ: Kim tự tháp thạch anh trắng','Làm trong không gian và tâm trí.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Đặt giữa bàn, đỉnh hướng lên.'),jsonb_build_object('title','Làm sạch năng lượng','text','Gõ chuông xoay 3 lần cạnh tháp')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-chuong-xoay-nepal-7-kim-loai-14cm','Nghi lễ: Chuông xoay Nepal 7 kim loại 14cm','Dẫn thiền, làm sạch không gian bằng âm thanh.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Xoay dùi gỗ quanh miệng chuông, chậm và đều.'),jsonb_build_object('title','Làm sạch năng lượng','text','Mỗi sáng 3 vòng trước khi ngồi thiền')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-bo-doan-vo-kieu-mach','Nghi lễ: Bồ đoàn vỏ kiều mạch','Ngồi thẳng lưng lâu mà không mỏi.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Ngồi trên 1/3 trước bồ đoàn, hai gối chạm sàn.'),jsonb_build_object('title','Làm sạch năng lượng','text','Theo hướng dẫn kèm sản phẩm')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-nhang-thao-moc-tram','Nghi lễ: Nhang thảo mộc trầm','Mùi trầm nhẹ cho buổi thiền.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Đốt 1 nén, để cách xa rèm.'),jsonb_build_object('title','Làm sạch năng lượng','text','Thắp trước khi đặt ý định')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-mat-day-chuyen-hoa-sen-bac','Nghi lễ: Mặt dây chuyền hoa sen bạc','Nhắc nhở sự thanh tịnh mỗi ngày.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Đeo sát tim.'),jsonb_build_object('title','Làm sạch năng lượng','text','Theo hướng dẫn kèm sản phẩm')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-vong-mala-108-hat-go-dan-huong','Nghi lễ: Vòng mala 108 hạt gỗ đàn hương','Đếm hơi thở, trì chú.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Lần hạt bằng ngón cái và ngón giữa.'),jsonb_build_object('title','Làm sạch năng lượng','text','Theo hướng dẫn kèm sản phẩm')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-goi-ngam-chan-thao-duoc-7-ngay','Nghi lễ: Gói ngâm chân thảo dược 7 ngày','Thả lỏng cơ thể trước giờ ngủ.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Ngâm 1 gói với 3 lít nước ấm 40°C trong 15 phút.'),jsonb_build_object('title','Làm sạch năng lượng','text','Ngâm cùng nhạc 432Hz')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-tinh-dau-oai-huong-da-lat-10ml','Nghi lễ: Tinh dầu oải hương Đà Lạt 10ml','Giúp dễ ngủ, dịu tâm trí.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','3 giọt vào đèn xông hoặc gối.'),jsonb_build_object('title','Làm sạch năng lượng','text','Theo hướng dẫn kèm sản phẩm')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-combo-thien-dinh-tra-hoa-cuc-hanh-nhan-mat-ong-rung-bot-nghe','Nghi lễ: Combo Thiền Định: trà hoa cúc, hạnh nhân, mật ong rừng, bột nghệ','Tĩnh tâm, hỗ trợ ngồi thiền sâu buổi tối.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Pha 1 thìa trà hoa cúc với 200ml nước 90°C, thêm mật ong. Ăn kèm 7 hạt hạnh nhân.'),jsonb_build_object('title','Làm sạch năng lượng','text','Nghi thức pha trà 7 phút')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-tra-hoa-cuc-da-lat','Nghi lễ: Trà hoa cúc Đà Lạt','Thư giãn, dễ ngủ.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','1 thìa / 200ml nước 90°C, ủ 5 phút.'),jsonb_build_object('title','Làm sạch năng lượng','text','Theo hướng dẫn kèm sản phẩm')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-hanh-nhan-rang-moc','Nghi lễ: Hạnh nhân rang mộc','Bữa phụ nhẹ, đủ năng lượng.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text',''),jsonb_build_object('title','Làm sạch năng lượng','text','Theo hướng dẫn kèm sản phẩm')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-mac-khen-tay-bac','Nghi lễ: Mắc khén Tây Bắc','Gia vị rừng thơm ấm.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text',''),jsonb_build_object('title','Làm sạch năng lượng','text','Theo hướng dẫn kèm sản phẩm')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-hat-doi-rung','Nghi lễ: Hạt dổi rừng','Gia vị rừng hiếm.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text',''),jsonb_build_object('title','Làm sạch năng lượng','text','Theo hướng dẫn kèm sản phẩm')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-muoi-hong-rang-thao-moc-lam-dong','Nghi lễ: Muối hồng rang thảo mộc Lâm Đồng','Muối ăn và muối tẩy uế không gian.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Rắc một nhúm ở 4 góc phòng mỗi tháng.'),jsonb_build_object('title','Làm sạch năng lượng','text','Tẩy uế không gian đầu tháng')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-muoi-tam-thach-anh-hong','Nghi lễ: Muối tắm thạch anh hồng','Thư giãn trong bồn tắm.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','3 thìa vào bồn nước ấm.'),jsonb_build_object('title','Làm sạch năng lượng','text','Theo hướng dẫn kèm sản phẩm')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-nghi-thuc-nang-luong-tai-gia','Nghi lễ: Nghi thức năng lượng tại gia','Bộ đủ để bắt đầu một góc thiền tại nhà.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Quét QR lá bài trong hộp để mở bài hướng dẫn 7 ngày.'),jsonb_build_object('title','Làm sạch năng lượng','text','Hướng dẫn 7 ngày qua QR')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-combo-trang-non','Nghi lễ: Combo Trăng non','Gieo ý định đầu tháng âm lịch.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Thắp nến, viết 3 ý định, đặt đá lên sổ.'),jsonb_build_object('title','Làm sạch năng lượng','text','Nghi lễ trăng non')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-ao-linen-theu-hoa-su-song','Nghi lễ: Áo linen thêu hoa sự sống','',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text',''),jsonb_build_object('title','Làm sạch năng lượng','text','Theo hướng dẫn kèm sản phẩm')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-tui-canvas-mandala','Nghi lễ: Túi canvas mandala','',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text',''),jsonb_build_object('title','Làm sạch năng lượng','text','Theo hướng dẫn kèm sản phẩm')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-bo-la-bai-nang-luong-44-la','Nghi lễ: Bộ lá bài năng lượng 44 lá','Rút một lá mỗi sáng, mỗi lá có QR bài thiền.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Quét QR mặt sau lá bài.'),jsonb_build_object('title','Làm sạch năng lượng','text','Rút bài buổi sáng')),'published'),
('e0000000-0000-4000-8000-000000000001','nghi-le-vong-tay-da-mat-trang','Nghi lễ: Vòng tay đá mặt trăng','Mềm mại với chu kỳ cảm xúc.',jsonb_build_array(jsonb_build_object('title','Chuẩn bị','text','Chọn nơi yên tĩnh, thở chậm 3 nhịp.'),jsonb_build_object('title','Thực hành','text','Đeo tay trái vào kỳ trăng non.'),jsonb_build_object('title','Làm sạch năng lượng','text','Làm sạch dưới trăng non')),'published');
insert into ops_config.notification_templates(entity_id, key, channel, subject, body, allowed_vars) values
('e0000000-0000-4000-8000-000000000001','stock.back','email','{{productName}} đã có hàng trở lại',E'Sản phẩm bạn quan tâm đã có hàng: {{productName}}.\nXem: {{productUrl}}\n\nBạn nhận email này vì đã đăng ký báo có hàng.',array['productName','productUrl']),
('e0000000-0000-4000-8000-000000000001','newsletter.confirm','email','Xác nhận nhận thư năng lượng ZSOPO',E'Bấm để xác nhận bạn muốn nhận thư năng lượng: {{confirmUrl}}\n\nNếu bạn không đăng ký, hãy bỏ qua email này. Hủy bất cứ lúc nào: {{unsubscribeUrl}}',array['confirmUrl','unsubscribeUrl']);

-- Blog categories and two sample posts (local QA only).
insert into content.categories(slug, name, sort) values ('thien-va-chua-lanh','Thiền và chữa lành',1),('da-lat','Đà Lạt',2),('nang-luong','Năng lượng',3);
insert into content.posts(entity_id, slug, title, excerpt, body_md, category_id, author_name, status, published_at, cta) values
('e0000000-0000-4000-8000-000000000001','thien-buoi-sang-giua-doi-thong','Thiền buổi sáng giữa đồi thông Đà Lạt','Năm bước đơn giản để bắt đầu ngày mới bằng hơi thở chậm.',
 E'## Vì sao thiền buổi sáng\n\nKhông khí se lạnh và yên tĩnh của Đà Lạt giúp hơi thở chậm lại tự nhiên.\n\n## Năm bước\n\n1. Ngồi thẳng lưng, thả lỏng vai.\n2. Hít vào bằng mũi 4 nhịp.\n3. Giữ 2 nhịp.\n4. Thở ra 6 nhịp.\n5. Lặp lại 10 lần.\n\n## Thực hành tại Zen Homestay\n\nKhách lưu trú có thể tham gia buổi thiền buổi sáng tại sân vườn. Xem [phòng tại Zen Homestay Đà Lạt](/stay/da-lat/phong).',
 (select id from content.categories where slug='thien-va-chua-lanh'),'Ban biên tập ZSOPO','published', now() - interval '2 days', '{"label":"Xem phòng Zen Homestay","href":"/stay/da-lat/phong"}'),
('e0000000-0000-4000-8000-000000000001','cach-chon-da-nang-luong','Cách chọn đá năng lượng phù hợp với bạn','Đọc bảng năng lượng: công dụng, nguồn gốc và cách dùng.',
 E'## Bắt đầu từ ý định\n\nMỗi sản phẩm tại ZSOPO có bảng năng lượng ghi rõ công dụng, nguồn gốc, cách dùng.\n\n## Lưu ý\n\nNội dung mang tính hỗ trợ tinh thần, không thay thế tư vấn y khoa.\n\nXem [Shop năng lượng](/shop).',
 (select id from content.categories where slug='nang-luong'),'Ban biên tập ZSOPO','published', now() - interval '1 day', '{"label":"Vào Shop","href":"/shop"}');

-- Shop policy and shipping fixture (prototype: 30.000 đ, free from 500.000 đ): to be confirmed before selling.
insert into ops_config.policy_versions(entity_id, location_id, kind, version, params, summary_md) values
('e0000000-0000-4000-8000-000000000001', null, 'shop', 1, '{"bank_due_hours":24,"ritual_24h":true,"ritual_hours":24,"cod_confirm_hours":24}', 'Chuyển khoản trong 24 giờ. Sản phẩm có nghi lễ cần thêm 24 giờ trước khi giao.');
insert into shop.shipping_rules(entity_id, region_code, fee, free_threshold) values ('e0000000-0000-4000-8000-000000000001', 'default', 30000, 500000);
-- Region list is configuration (current administrative units must be loaded by the operator); fixture only.
insert into shop.regions(code, name, sort) values ('lam-dong','Lâm Đồng',1),('tp-ho-chi-minh','TP. Hồ Chí Minh',2),('ha-noi','Hà Nội',3);
insert into ops_config.notification_templates(entity_id, key, channel, subject, body, allowed_vars) values
('e0000000-0000-4000-8000-000000000001','campaign','email','{{subject}}',E'{{body}}\n\nHủy nhận thư: {{unsubscribeUrl}}',array['subject','body','unsubscribeUrl']);
-- Local only: shared secret that lets the web server forward the visitor IP to the DB rate limiter.
select vault.create_secret('local-rate-limit-forward-secret', 'rate_limit_forward_secret');
