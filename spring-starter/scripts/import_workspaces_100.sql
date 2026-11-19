-- ====================================================================
-- IMPORT DỮ LIỆU WORKSPACE (ID RANGE 101..119) KHÔNG THAY ĐỔI CẤU TRÚC BẢNG
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

-- 1. BUILDING (ID: 101..108)
INSERT INTO `building` (`id`, `created_at`, `updated_at`, `organizer_id`, `name`, `address`, `latitude`, `longitude`, `city`, `ward`) VALUES 
(101,'2026-11-15 15:13:06.822520','2026-11-15 15:13:06.822520',3,'Tòa nhà Enouvo Space 1','15 An Nhơn 3, Phường An Hải Tây, Quận Sơn Trà, TP. Đà Nẵng',16.06245000,108.23321000,'Đà Nẵng','Phường An Hải Tây'),
(102,'2026-11-15 15:13:06.822520','2026-11-15 15:13:06.822520',3,'Tòa nhà Enouvo Riverside','169 Trần Hưng Đạo, Phường An Hải Bắc, Quận Sơn Trà, TP. Đà Nẵng',16.06712000,108.23045000,'Đà Nẵng','Phường An Hải Bắc'),
(103,'2026-11-15 15:13:06.822520','2026-11-15 15:13:06.822520',3,'Tòa nhà Enouvo Tech FPT','Khu Đô Thị FPT City, Phường Hòa Hải, Quận Ngũ Hành Sơn, TP. Đà Nẵng',15.98685000,108.26210000,'Đà Nẵng','Phường Hòa Hải'),
(104,'2026-11-15 15:13:06.822520','2026-11-15 15:13:06.822520',3,'Tòa nhà Enouvo Creative Lab','102 Ngô Quyền, Phường An Hải Bắc, Quận Sơn Trà, TP. Đà Nẵng',16.07250000,108.23780000,'Đà Nẵng','Phường An Hải Bắc'),
(105,'2026-11-15 15:13:06.822520','2026-11-15 15:13:06.822520',4,'Tòa nhà Toong Bạch Đằng Heritage','36 Bạch Đằng, Phường Thạch Thang, Quận Hải Châu, TP. Đà Nẵng',16.06421000,108.22380000,'Đà Nẵng','Phường Thạch Thang'),
(106,'2026-11-15 15:13:06.822520','2026-11-15 15:13:06.822520',4,'Tòa nhà Toong Duy Tân Innovation','88 Duy Tân, Phường Hòa Cường Bắc, Quận Hải Châu, TP. Đà Nẵng',16.03540000,108.21450000,'Đà Nẵng','Phường Hòa Cường Bắc'),
(107,'2026-11-15 15:13:06.822520','2026-11-15 15:13:06.822520',4,'Tòa nhà Toong Hội An Heritage House','45 Trần Phú, Phường Minh An, TP. Hội An, Tỉnh Quảng Nam',15.87720000,108.32860000,'Quảng Nam','Phường Minh An'),
(108,'2026-11-15 15:13:06.822520','2026-11-15 15:13:06.822520',4,'Tòa nhà Toong Mỹ Khê Beachside','Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng',16.06380000,108.24620000,'Đà Nẵng','Phường Phước Mỹ');

-- 2. BUILDING_FLOOR (ID: 101..107)
INSERT INTO `building_floor` (`id`, `created_at`, `updated_at`, `building_id`, `name`, `floor_number`, `canvas_width`, `canvas_height`, `real_width_m`, `real_length_m`, `max_occupancy`) VALUES 
(101,'2026-11-15 15:13:06.839258','2026-11-15 15:13:06.839258',101,'Tầng 2 - Co-working & Hot Desks',2,1200.00,800.00,24.00,16.00,40),
(102,'2026-11-15 15:13:06.839258','2026-11-15 15:13:06.839258',101,'Tầng 3 - Executive Boardroom & Team Pods',3,1000.00,700.00,20.00,14.00,25),
(103,'2026-11-15 15:13:06.839258','2026-11-15 15:13:06.839258',102,'Tầng 2 - Riverside Open Space',2,1400.00,900.00,28.00,18.00,50),
(104,'2026-11-15 15:13:06.839258','2026-11-15 15:13:06.839258',103,'Tầng 1 - Tech Innovation Arena',1,1600.00,1000.00,32.00,20.00,60),
(105,'2026-11-15 15:13:06.839258','2026-11-15 15:13:06.839258',105,'Tầng 2 - Không gian Di sản Sông Hàn',2,1300.00,850.00,26.00,17.00,45),
(106,'2026-11-15 15:13:06.839258','2026-11-15 15:13:06.839258',106,'Tầng 2 - Innovation Collaborative Floor',2,1200.00,800.00,24.00,16.00,35),
(107,'2026-11-15 15:13:06.839258','2026-11-15 15:13:06.839258',107,'Tầng 1 - Sân vườn Cổ kính Hội An',1,1100.00,750.00,22.00,15.00,30);

-- 3. WORKSPACE (ID: 101..108)
INSERT INTO `workspace` (`id`, `created_at`, `updated_at`, `address`, `area_sqm`, `booking_confirmation_mode`, `category`, `city`, `description`, `district`, `entry_instructions`, `featured_order`, `featured_until`, `latitude`, `longitude`, `name`, `review_feedback`, `reviewed_at`, `status`, `submitted_at`, `support_phone`, `organizer_id`, `reviewed_by`) VALUES 
(101,'2026-11-15 15:13:06.831440','2026-11-15 15:13:06.831440','15 An Nhơn 3, Phường An Hải Tây, Quận Sơn Trà, TP. Đà Nẵng',450.00,'INSTANT','COWORKING_HUB','Đà Nẵng','Không gian làm việc sáng tạo hàng đầu ngay chân Cầu Rồng và bờ sông Hàn. Được thiết kế tối ưu cho lập trình viên, startup công nghệ và digital nomads với ghế công thái học Herman Miller, mạng cáp quang kép 1Gbps, phòng họp trực tuyến 4K chuyên nghiệp và quầy bar cà phê specialty.','Quận Sơn Trà','Vào cổng bấm chuông tầng 1 hoặc quét mã QR check-in trên ứng dụng NexSpace. Lễ tân tầng G phục vụ từ 07:30 đến 21:30 hàng ngày.',101,'2026-12-15 15:13:06.831440',16.06245000,108.23321000,'Enouvo Space 1 - Dragon Bridge Hub',NULL,'2026-11-15 15:13:06.831440','ACTIVE','2026-11-15 15:13:06.831440','0905123456',3,1),
(102,'2026-11-15 15:13:06.831440','2026-11-15 15:13:06.831440','169 Trần Hưng Đạo, Phường An Hải Bắc, Quận Sơn Trà, TP. Đà Nẵng',650.00,'INSTANT','COWORKING_HUB','Đà Nẵng','Tọa lạc trên trục đường du lịch ven sông Hàn sầm uất với tầm nhìn trực diện ngắm cầu Sông Hàn và cầu Rồng phun lửa. Không gian mang phong cách mở hiện đại, nhiều cây xanh, phòng cách âm tiêu chuẩn thu podcast/livestream và khu vực ban công thư giãn thoáng đãng.','Quận Sơn Trà','Gửi xe tại tầng hầm tòa nhà, thang máy đi thẳng lên sảnh tầng 2. Quét mã QR tại cửa từ để vào không gian.',102,'2026-12-15 15:13:06.831440',16.06712000,108.23045000,'Enouvo Space 2 - Tran Hung Dao Riverside Hub',NULL,'2026-11-15 15:13:06.831440','ACTIVE','2026-11-15 15:13:06.831440','0905123456',3,1),
(103,'2026-11-15 15:13:06.831440','2026-11-15 15:13:06.831440','Khu Đô Thị FPT City, Phường Hòa Hải, Quận Ngũ Hành Sơn, TP. Đà Nẵng',850.00,'INSTANT','SERVICED_OFFICE','Đà Nẵng','Không gian phức hợp văn phòng làm việc quy mô lớn tại Khu Đô Thị Công Nghệ FPT City. Tích hợp trung tâm đào tạo, hội thảo 50 người, phòng lab trải nghiệm công nghệ AI/IoT và cụm bàn làm việc dành cho các nhóm dự án công nghệ dài hạn.','Quận Ngũ Hành Sơn','Tòa nhà FPT Enouvo Campus, bảo vệ hướng dẫn đỗ xe ô tô/xe máy rộng rãi. Quét mã tại quầy điều phối tầng 1.',NULL,NULL,15.98685000,108.26210000,'Enouvo Tech Campus - FPT City Hub',NULL,'2026-11-15 15:13:06.831440','ACTIVE','2026-11-15 15:13:06.831440','0905123456',3,1),
(104,'2026-11-15 15:13:06.831440','2026-11-15 15:13:06.831440','102 Ngô Quyền, Phường An Hải Bắc, Quận Sơn Trà, TP. Đà Nẵng',320.00,'INSTANT','CREATIVE_STUDIO','Đà Nẵng','Không gian thử nghiệm công nghệ sáng tạo, xưởng in 3D và studio làm việc cá nhân chuyên sâu cho các nhà sáng tạo nội dung số tại khu vực Sơn Trà.','Quận Sơn Trà','Không gian đang trong giai đoạn hoàn thiện nội thất và thử nghiệm hệ thống mạng.',NULL,NULL,16.07250000,108.23780000,'Enouvo Creative Lab (Chi nhánh 4)',NULL,NULL,'DRAFT',NULL,'0905123456',3,NULL),
(105,'2026-11-15 15:13:06.831440','2026-11-15 15:13:06.831440','36 Bạch Đằng, Phường Thạch Thang, Quận Hải Châu, TP. Đà Nẵng',720.00,'INSTANT','COWORKING_HUB','Đà Nẵng','Chuỗi không gian làm việc mang đậm phong cách kiến trúc Đông Dương hoài cổ kết hợp tiện nghi văn phòng hiện đại. Tọa lạc trên con đường Bạch Đằng danh giá hướng thẳng ra sông Hàn, thích hợp cho các buổi gặp gỡ đối tác cấp cao, giám đốc điều hành và chuyên gia sáng tạo.','Quận Hải Châu','Lối vào qua đại sảnh tầng trệt số 36 Bạch Đằng. Xuất trình đặt chỗ trên app NexSpace cho Concierge để nhận thẻ từ.',103,'2026-12-15 15:13:06.831440',16.06421000,108.22380000,'Toong Bach Dang Heritage Coworking',NULL,'2026-11-15 15:13:06.831440','ACTIVE','2026-11-15 15:13:06.831440','0988776655',4,1),
(106,'2026-11-15 15:13:06.831440','2026-11-15 15:13:06.831440','88 Duy Tân, Phường Hòa Cường Bắc, Quận Hải Châu, TP. Đà Nẵng',580.00,'INSTANT','BUSINESS_LOUNGE','Đà Nẵng','Trung tâm làm việc và kết nối đổi mới sáng tạo nằm trên trục đường công nghệ Duy Tân. Không gian bài trí cây xanh thanh lọc không khí, bàn làm việc nâng hạ Ergonomic, các buồng làm việc yên tĩnh riêng tư cho họp online và cabin gọi điện thoại cách âm.','Quận Hải Châu','Cách sân bay quốc tế Đà Nẵng 5 phút di chuyển. Bãi đỗ xe ô tô có trạm sạc xe điện ngầm.',NULL,NULL,16.03540000,108.21450000,'Toong Duy Tan Innovation Hub',NULL,'2026-11-15 15:13:06.831440','ACTIVE','2026-11-15 15:13:06.831440','0988776655',4,1),
(107,'2026-11-15 15:13:06.831440','2026-11-15 15:13:06.831440','45 Trần Phú, Phường Minh An, TP. Hội An, Tỉnh Quảng Nam',400.00,'INSTANT','CREATIVE_STUDIO','Quảng Nam','Điểm đến làm việc nghỉ dưỡng độc đáo giữa lòng di sản văn hóa thế giới Phố Cổ Hội An. Sự giao thoa tinh tế giữa kiến trúc nhà gỗ cổ truyền, sân vườn tĩnh lặng và đường truyền Internet vệ tinh tốc độ cao, lý tưởng cho kỳ làm việc workation thư thái.','TP. Hội An','Nằm trong khu phố đi bộ Hội An. Du khách đi bộ vào từ đường Hoàng Diệu hoặc gửi xe tại bãi xe đầu phố Trần Phú.',NULL,NULL,15.87720000,108.32860000,'Toong Hoi An Ancient Town Sanctuary',NULL,'2026-11-15 15:13:06.831440','ACTIVE','2026-11-15 15:13:06.831440','0988776655',4,1),
(108,'2026-11-15 15:13:06.831440','2026-11-15 15:13:06.831440','Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng',390.00,'INSTANT','COWORKING_HUB','Đà Nẵng','Dự án không gian làm việc sát biển Mỹ Khê đón gió biển mát lành và ánh sáng tự nhiên ngập tràn, đang được lắp đặt nội thất gỗ tự nhiên cao cấp.','Quận Sơn Trà','Đang trong quá trình hoàn thiện hạ tầng cáp quang và hệ thống điều hòa không khí.',NULL,NULL,16.06380000,108.24620000,'Toong My Khe Beachside Hub (Đang setup)',NULL,NULL,'DRAFT',NULL,'0988776655',4,NULL);

-- 4. FLOOR_PLAN (ID: 101..106)
INSERT INTO `floor_plan` (`id`, `created_at`, `updated_at`, `background_url`, `draft_layout_json`, `floor_number`, `layout_json`, `name`, `published_at`, `status`, `version`, `workspace_id`, `building_floor_id`, `usage_x`, `usage_y`, `usage_width`, `usage_height`, `occupancy_limit`) VALUES 
(101,'2026-11-15 15:13:06.843846','2026-11-15 15:13:06.843846',NULL,NULL,2,'{\"schema\": \"nexspace.resource-canvas.v1\", \"canvas\": {\"width\": 1200, \"height\": 800, \"unit\": \"px\", \"origin\": \"top-left\", \"rotationOrigin\": \"center\"}}','Sơ đồ Tầng 2 - Enouvo Dragon Bridge','2026-11-15 15:13:06.843846','PUBLISHED',1,101,101,0.00,0.00,1200.00,800.00,40),
(102,'2026-11-15 15:13:06.843846','2026-11-15 15:13:06.843846',NULL,NULL,2,'{\"schema\": \"nexspace.resource-canvas.v1\", \"canvas\": {\"width\": 1200, \"height\": 800, \"unit\": \"px\", \"origin\": \"top-left\", \"rotationOrigin\": \"center\"}}','Sơ đồ Tầng 2 - Enouvo Riverside','2026-11-15 15:13:06.843846','PUBLISHED',1,102,103,0.00,0.00,1400.00,900.00,50),
(103,'2026-11-15 15:13:06.843846','2026-11-15 15:13:06.843846',NULL,NULL,1,'{\"schema\": \"nexspace.resource-canvas.v1\", \"canvas\": {\"width\": 1200, \"height\": 800, \"unit\": \"px\", \"origin\": \"top-left\", \"rotationOrigin\": \"center\"}}','Sơ đồ Tầng 1 - Enouvo FPT Campus','2026-11-15 15:13:06.843846','PUBLISHED',1,103,104,0.00,0.00,1600.00,1000.00,60),
(104,'2026-11-15 15:13:06.843846','2026-11-15 15:13:06.843846',NULL,NULL,2,'{\"schema\": \"nexspace.resource-canvas.v1\", \"canvas\": {\"width\": 1200, \"height\": 800, \"unit\": \"px\", \"origin\": \"top-left\", \"rotationOrigin\": \"center\"}}','Sơ đồ Tầng 2 - Toong Bạch Đằng','2026-11-15 15:13:06.843846','PUBLISHED',1,105,105,0.00,0.00,1300.00,850.00,45),
(105,'2026-11-15 15:13:06.843846','2026-11-15 15:13:06.843846',NULL,NULL,2,'{\"schema\": \"nexspace.resource-canvas.v1\", \"canvas\": {\"width\": 1200, \"height\": 800, \"unit\": \"px\", \"origin\": \"top-left\", \"rotationOrigin\": \"center\"}}','Sơ đồ Tầng 2 - Toong Duy Tân','2026-11-15 15:13:06.843846','PUBLISHED',1,106,106,0.00,0.00,1200.00,800.00,35),
(106,'2026-11-15 15:13:06.843846','2026-11-15 15:13:06.843846',NULL,NULL,1,'{\"schema\": \"nexspace.resource-canvas.v1\", \"canvas\": {\"width\": 1200, \"height\": 800, \"unit\": \"px\", \"origin\": \"top-left\", \"rotationOrigin\": \"center\"}}','Sơ đồ Tầng 1 - Toong Hội An','2026-11-15 15:13:06.843846','PUBLISHED',1,107,107,0.00,0.00,1100.00,750.00,30);

-- 5. RESOURCE_TYPE (ID: 101..115)
INSERT INTO `resource_type` (`id`, `created_at`, `updated_at`, `is_active`, `capacity`, `category`, `description`, `name`, `price_per_day`, `price_per_hour`, `price_per_month`, `workspace_id`, `currency`, `usage_kind`, `standard_width_m`, `standard_length_m`) VALUES 
(101,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',1,'DESK','Chỗ ngồi làm việc tự do trong không gian mở năng động, trang bị ổ cắm đa năng và ghế công thái học Sihoo.','Bàn Linh Hoạt (Hot Desk)',180000.00,35000.00,2400000.00,101,'VND',NULL,NULL,NULL),
(102,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',1,'DESK','Bàn nâng hạ tự động cao cấp trang bị sẵn màn hình 27-inch 4K USB-C 90W và ghế Herman Miller Aeron.','Bàn Cố Định Ergonomic (Dedicated Desk)',280000.00,55000.00,3800000.00,101,'VND',NULL,NULL,NULL),
(103,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',10,'ROOM','Phòng họp kính cách âm 10 người, màn hình hội nghị 75-inch 4K, camera Polycom tracking thông minh và bảng kính viết bút lông.','Phòng Họp Điều Hành Dragon Bridge (Boardroom 10P)',1600000.00,250000.00,22000000.00,101,'VND',NULL,NULL,NULL),
(104,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',2,'ROOM','Cabin họp 1-1 cách âm tuyệt đối 38dB, thông gió tự động, thích hợp cho phỏng vấn và cuộc gọi quan trọng.','Buồng Họp / Phone Booth Riêng Tư (Focus Pod 2P)',500000.00,90000.00,NULL,101,'VND',NULL,NULL,NULL),
(105,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',1,'DESK','Bàn làm việc ven cửa sổ kính lớn phóng tầm mắt trọn vẹn ra sông Hàn và cầu Rồng.','Bàn Sáng Tạo View Sông Hàn (Riverside Creator Desk)',220000.00,40000.00,2800000.00,102,'VND',NULL,NULL,NULL),
(106,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',4,'ROOM','Studio tiêu âm chuyên nghiệp với 2 mic Shure SM7B, mixer Rodecaster Pro và đèn LED softbox Studio.','Studio Podcast & Livestream 4K',1800000.00,280000.00,NULL,102,'VND',NULL,NULL,NULL),
(107,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',14,'ROOM','Phòng hội nghị VIP nhìn ra bến du thuyền, phục vụ trà và cà phê tận phòng.','Phòng Họp Sông Hàn VIP (Meeting Suite 14P)',2400000.00,350000.00,32000000.00,102,'VND',NULL,NULL,NULL),
(108,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',1,'DESK','Chỗ ngồi rộng rãi với đường truyền mạng LAN gigabit riêng biệt cho kỹ sư phần mềm.','Bàn Kỹ Sư Công Nghệ (Tech Pro Desk)',160000.00,30000.00,2100000.00,103,'VND',NULL,NULL,NULL),
(109,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',30,'ROOM','Hội trường đào tạo 30 chỗ ngồi với máy chiếu laser 4K, micro không dây và hệ thống âm thanh vòm.','Hội Trường Hội Thảo & Demo Day (Seminar Arena 30P)',3800000.00,600000.00,NULL,103,'VND',NULL,NULL,NULL),
(110,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',1,'DESK','Bàn làm việc chất liệu gỗ tự nhiên trong không gian nghệ thuật Đông Dương thanh lịch.','Bàn Di Sản Đông Dương (Heritage Indochine Desk)',260000.00,50000.00,3500000.00,105,'VND',NULL,NULL,NULL),
(111,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',8,'ROOM','Phòng họp riêng biệt 8 người, phong cách ấm cúng với máy pha espresso riêng.','Phòng Họp Thạch Thang Suite (Meeting Suite 8P)',1500000.00,220000.00,20000000.00,105,'VND',NULL,NULL,NULL),
(112,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',1,'DESK','Chỗ ngồi tại trung tâm công nghệ Duy Tân gần sân bay Đà Nẵng.','Bàn Làm Việc Linh Hoạt (Agile Workspace Desk)',200000.00,38000.00,2600000.00,106,'VND',NULL,NULL,NULL),
(113,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',6,'ROOM','Phòng làm việc nhóm khép kín cho 6 thành viên, trang bị bảng trắng toàn bức tường.','Phòng Họp Nhóm Dự Án (Project Team Room 6P)',1200000.00,180000.00,16000000.00,106,'VND',NULL,NULL,NULL),
(114,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',1,'DESK','Bàn làm việc yên tĩnh nhìn ra sân vườn xanh mát của ngôi nhà cổ Hội An.','Bàn Làm Việc Yên Tĩnh Phố Cổ (Ancient Town Desk)',240000.00,45000.00,3200000.00,107,'VND',NULL,NULL,NULL),
(115,'2026-11-15 15:13:06.850056','2026-11-15 15:13:06.850056',b'1',6,'ROOM','Phòng họp phong cách thiền tĩnh lặng, phục vụ trà thảo mộc Cù Lao Chàm.','Phòng Trà Thảo Mộc & Họp Chiến Lược (Zen Suite 6P)',1300000.00,200000.00,NULL,107,'VND',NULL,NULL,NULL);

-- 6. BOOKABLE_RESOURCE (ID: 101..119)
INSERT INTO `bookable_resource` (`id`, `created_at`, `updated_at`, `capacity_override`, `description`, `height`, `label`, `noise_level`, `pos_x`, `pos_y`, `price_per_hour`, `rotation`, `status`, `width`, `zone_name`, `floor_plan_id`, `resource_type_id`, `name`, `parent_room_id`) VALUES 
(101,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',1,NULL,50.00,'HD-01','MODERATE',120.00,180.00,35000.00,0.00,'ACTIVE',80.00,'Khu Vực Bàn Năng Động (Zone A)',101,101,'Bàn Hot Desk 01 (Khu Vực Cửa Sổ)',NULL),
(102,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',1,NULL,50.00,'HD-02','MODERATE',220.00,180.00,35000.00,0.00,'ACTIVE',80.00,'Khu Vực Bàn Năng Động (Zone A)',101,101,'Bàn Hot Desk 02 (Khu Vực Cửa Sổ)',NULL),
(103,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',1,NULL,60.00,'DD-01','QUIET',120.00,320.00,55000.00,0.00,'ACTIVE',90.00,'Khu Tập Trung Cao Độ (Zone B)',101,102,'Bàn Cố Định Màn Hình Đôi 01',NULL),
(104,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',1,NULL,60.00,'DD-02','QUIET',230.00,320.00,55000.00,0.00,'ACTIVE',90.00,'Khu Tập Trung Cao Độ (Zone B)',101,102,'Bàn Cố Định Màn Hình Đôi 02',NULL),
(105,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',10,NULL,200.00,'MR-DRAGON','QUIET',450.00,150.00,250000.00,0.00,'ACTIVE',280.00,'Khu Vực Phòng Họp (Zone C)',101,103,'Phòng Họp Điều Hành Dragon Bridge',NULL),
(106,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',2,NULL,100.00,'POD-01','QUIET',450.00,400.00,90000.00,0.00,'ACTIVE',120.00,'Khu Buồng Kín (Zone D)',101,104,'Buồng Tập Trung Focus Pod 01',NULL),
(107,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',1,NULL,50.00,'RIV-01','MODERATE',150.00,200.00,40000.00,0.00,'ACTIVE',80.00,'Riverside Deck (Zone A)',102,105,'Bàn View Sông Hàn 01',NULL),
(108,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',1,NULL,50.00,'RIV-02','MODERATE',250.00,200.00,40000.00,0.00,'ACTIVE',80.00,'Riverside Deck (Zone A)',102,105,'Bàn View Sông Hàn 02',NULL),
(109,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',4,NULL,180.00,'PODCAST-01','QUIET',450.00,180.00,280000.00,0.00,'ACTIVE',200.00,'Creative Media Studio (Zone B)',102,106,'Studio Thu Âm & Podcast 4K',NULL),
(110,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',14,NULL,220.00,'MR-RIVER-VIP','QUIET',700.00,180.00,350000.00,0.00,'ACTIVE',320.00,'Executive Suite (Zone C)',102,107,'Phòng Họp VIP Sông Hàn 14P',NULL),
(111,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',1,NULL,60.00,'TECH-01','QUIET',150.00,220.00,30000.00,0.00,'ACTIVE',90.00,'Tech Lab Arena',103,108,'Bàn Kỹ Sư Công Nghệ 01',NULL),
(112,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',30,NULL,300.00,'SEMINAR-30','MODERATE',500.00,200.00,600000.00,0.00,'ACTIVE',400.00,'Grand Seminar Hall',103,109,'Hội Trường Seminar Arena 30P',NULL),
(113,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',1,NULL,55.00,'TOONG-BD-01','QUIET',140.00,190.00,50000.00,0.00,'ACTIVE',85.00,'Khu Đông Dương (Zone A)',104,110,'Bàn Gỗ Di Sản 01',NULL),
(114,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',1,NULL,55.00,'TOONG-BD-02','QUIET',240.00,190.00,50000.00,0.00,'ACTIVE',85.00,'Khu Đông Dương (Zone A)',104,110,'Bàn Gỗ Di Sản 02',NULL),
(115,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',8,NULL,180.00,'MR-TOONG-8P','QUIET',480.00,160.00,220000.00,0.00,'ACTIVE',240.00,'Heritage Suite (Zone B)',104,111,'Phòng Họp Thạch Thang Suite 8P',NULL),
(116,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',1,NULL,50.00,'AGILE-01','MODERATE',160.00,210.00,38000.00,0.00,'ACTIVE',80.00,'Innovation Open Floor',105,112,'Bàn Linh Hoạt Agile 01',NULL),
(117,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',6,NULL,160.00,'ROOM-TEAM-6','QUIET',460.00,190.00,180000.00,0.00,'ACTIVE',210.00,'Project Hub Rooms',105,113,'Phòng Dự Án Project Team 6P',NULL),
(118,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',1,NULL,50.00,'HOIAN-DESK-01','QUIET',150.00,190.00,45000.00,0.00,'ACTIVE',80.00,'Khu Sân Vườn Cổ Điển',106,114,'Bàn Gỗ Sân Vườn Hội An 01',NULL),
(119,'2026-11-15 15:13:06.857431','2026-11-15 15:13:06.857431',6,NULL,170.00,'ZEN-SUITE-6','QUIET',450.00,180.00,200000.00,0.00,'ACTIVE',220.00,'Thiền Trà Sanctuary',106,115,'Phòng Họp Thiền Trà Zen Suite 6P',NULL);

-- 7. WORKSPACE_OPERATING_HOUR
INSERT INTO `workspace_operating_hour` (`day_of_week`, `close_time`, `is_closed`, `open_time`, `workspace_id`) VALUES 
(1,'21:30:00.000000',b'0','07:30:00.000000',101),
(1,'22:00:00.000000',b'0','07:30:00.000000',102),
(1,'19:00:00.000000',b'0','08:00:00.000000',103),
(1,'21:00:00.000000',b'0','08:00:00.000000',105),
(1,'20:00:00.000000',b'0','08:00:00.000000',106),
(1,'21:00:00.000000',b'0','08:00:00.000000',107),
(2,'21:30:00.000000',b'0','07:30:00.000000',101),
(2,'22:00:00.000000',b'0','07:30:00.000000',102),
(2,'19:00:00.000000',b'0','08:00:00.000000',103),
(2,'21:00:00.000000',b'0','08:00:00.000000',105),
(2,'20:00:00.000000',b'0','08:00:00.000000',106),
(2,'21:00:00.000000',b'0','08:00:00.000000',107),
(3,'21:30:00.000000',b'0','07:30:00.000000',101),
(3,'22:00:00.000000',b'0','07:30:00.000000',102),
(3,'19:00:00.000000',b'0','08:00:00.000000',103),
(3,'21:00:00.000000',b'0','08:00:00.000000',105),
(3,'20:00:00.000000',b'0','08:00:00.000000',106),
(3,'21:00:00.000000',b'0','08:00:00.000000',107),
(4,'21:30:00.000000',b'0','07:30:00.000000',101),
(4,'22:00:00.000000',b'0','07:30:00.000000',102),
(4,'19:00:00.000000',b'0','08:00:00.000000',103),
(4,'21:00:00.000000',b'0','08:00:00.000000',105),
(4,'20:00:00.000000',b'0','08:00:00.000000',106),
(4,'21:00:00.000000',b'0','08:00:00.000000',107),
(5,'21:30:00.000000',b'0','07:30:00.000000',101),
(5,'22:00:00.000000',b'0','07:30:00.000000',102),
(5,'19:00:00.000000',b'0','08:00:00.000000',103),
(5,'21:00:00.000000',b'0','08:00:00.000000',105),
(5,'20:00:00.000000',b'0','08:00:00.000000',106),
(5,'21:00:00.000000',b'0','08:00:00.000000',107),
(6,'20:00:00.000000',b'0','08:00:00.000000',101),
(6,'22:00:00.000000',b'0','08:00:00.000000',102),
(6,'17:00:00.000000',b'0','08:00:00.000000',103),
(6,'20:00:00.000000',b'0','08:30:00.000000',105),
(6,'18:00:00.000000',b'0','08:30:00.000000',106),
(6,'21:00:00.000000',b'0','08:30:00.000000',107),
(7,'20:00:00.000000',b'0','08:00:00.000000',101),
(7,'22:00:00.000000',b'0','08:00:00.000000',102),
(7,'17:00:00.000000',b'1','08:00:00.000000',103),
(7,'20:00:00.000000',b'0','08:30:00.000000',105),
(7,'18:00:00.000000',b'0','08:30:00.000000',106),
(7,'21:00:00.000000',b'0','08:30:00.000000',107);

-- 8. WORKSPACE_AMENITY (ID: 201..243)
INSERT INTO `workspace_amenity` (`id`, `created_at`, `updated_at`, `addon_price_per_hour`, `amenity_id`, `resource_id`, `workspace_id`) VALUES 
(201,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,1,NULL,101),
(202,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,2,NULL,101),
(203,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,3,NULL,101),
(204,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',15000.00,4,NULL,101),
(205,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,5,NULL,101),
(206,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,6,NULL,101),
(207,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,7,NULL,101),
(208,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,12,NULL,101),
(209,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,13,NULL,101),
(210,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,14,NULL,101),
(211,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,1,NULL,102),
(212,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,2,NULL,102),
(213,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,3,NULL,102),
(214,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,6,NULL,102),
(215,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',20000.00,9,NULL,102),
(216,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,12,NULL,102),
(217,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,15,NULL,102),
(218,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,1,NULL,103),
(219,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,4,NULL,103),
(220,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,5,NULL,103),
(221,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,7,NULL,103),
(222,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,10,NULL,103),
(223,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,11,NULL,103),
(224,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,13,NULL,103),
(225,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,1,NULL,105),
(226,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,2,NULL,105),
(227,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,6,NULL,105),
(228,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',10000.00,8,NULL,105),
(229,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,12,NULL,105),
(230,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,13,NULL,105),
(231,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,14,NULL,105),
(232,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,1,NULL,106),
(233,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,2,NULL,106),
(234,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,3,NULL,106),
(235,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,5,NULL,106),
(236,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,7,NULL,106),
(237,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,12,NULL,106),
(238,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,1,NULL,107),
(239,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,6,NULL,107),
(240,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,10,NULL,107),
(241,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,12,NULL,107),
(242,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,13,NULL,107),
(243,'2026-11-15 15:13:06.867700','2026-11-15 15:13:06.867700',0.00,15,NULL,107);

-- 9. MEDIA (ID: 201..223)
INSERT INTO `media` (`id`, `created_at`, `updated_at`, `is_cover`, `display_order`, `media_type`, `url`, `resource_id`, `workspace_id`) VALUES 
(201,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'1',0,'IMAGE','https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',NULL,101),
(202,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',1,'IMAGE','https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',NULL,101),
(203,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',2,'IMAGE','https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',NULL,101),
(204,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',3,'IMAGE','https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',NULL,101),
(205,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'1',0,'IMAGE','https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80',NULL,102),
(206,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',1,'IMAGE','https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',NULL,102),
(207,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',2,'IMAGE','https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',NULL,102),
(208,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',3,'IMAGE','https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',NULL,102),
(209,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'1',0,'IMAGE','https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80',NULL,103),
(210,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',1,'IMAGE','https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',NULL,103),
(211,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',2,'IMAGE','https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&w=1200&q=80',NULL,103),
(212,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'1',0,'IMAGE','https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',NULL,104),
(213,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'1',0,'IMAGE','https://images.unsplash.com/photo-1582653291997-079a1c04e50f?auto=format&fit=crop&w=1200&q=80',NULL,105),
(214,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',1,'IMAGE','https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',NULL,105),
(215,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',2,'IMAGE','https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',NULL,105),
(216,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',3,'IMAGE','https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',NULL,105),
(217,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'1',0,'IMAGE','https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80',NULL,106),
(218,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',1,'IMAGE','https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',NULL,106),
(219,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',2,'IMAGE','https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&w=1200&q=80',NULL,106),
(220,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'1',0,'IMAGE','https://images.unsplash.com/photo-1582653291997-079a1c04e50f?auto=format&fit=crop&w=1200&q=80',NULL,107),
(221,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',1,'IMAGE','https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',NULL,107),
(222,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'0',2,'IMAGE','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',NULL,107),
(223,'2026-11-15 15:13:06.875049','2026-11-15 15:13:06.875049',b'1',0,'IMAGE','https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',NULL,108);

-- 10. WORKSPACE_ASSET (ID: 101..105)
INSERT INTO `workspace_asset` (`id`, `created_at`, `updated_at`, `asset_code`, `name`, `next_maintenance_date`, `note`, `purchase_date`, `purchase_price`, `quantity`, `status`, `warranty_until`, `amenity_id`, `resource_id`, `workspace_id`) VALUES 
(101,'2026-11-15 15:13:06.893340','2026-11-15 15:13:06.893340','AST-HM-01','Lô ghế công thái học Herman Miller Aeron Size B','2026-12-15','Bảo dưỡng vệ sinh bánh xe và piston định kỳ 6 tháng','2025-06-15',360000000.00,20,'IN_USE','2030-06-15',NULL,NULL,101),
(102,'2026-11-15 15:13:06.893340','2026-11-15 15:13:06.893340','AST-DEL-02','Lô màn hình Dell UltraSharp U2723QE 4K USB-C 90W','2027-02-10','Cung cấp tại các bàn Dedicated Desk và phòng họp','2025-08-10',210000000.00,15,'IN_USE','2028-08-10',NULL,NULL,101),
(103,'2026-11-15 15:13:06.893340','2026-11-15 15:13:06.893340','AST-POLY-03','Hệ thống Camera hội nghị trực tuyến Poly Studio 4K','2026-11-30','Lắp đặt tại phòng họp Dragon Bridge','2025-09-01',48500000.00,2,'IN_USE','2027-09-01',NULL,NULL,101),
(104,'2026-11-15 15:13:06.893340','2026-11-15 15:13:06.893340','AST-SHURE-01','Cặp Micro thu âm Shure SM7B kèm chân boom tay đòn','2026-12-01','Phục vụ studio podcast phòng Riverside','2025-10-05',42000000.00,4,'IN_USE','2027-10-05',NULL,NULL,102),
(105,'2026-11-15 15:13:06.893340','2026-11-15 15:13:06.893340','AST-BREV-01','Máy pha cà phê chuyên nghiệp Breville Dual Boiler BES920','2026-12-20','Tại quầy Bar di sản Toong Bạch Đằng','2025-07-20',38000000.00,1,'IN_USE','2027-07-20',NULL,NULL,105);

-- 11. WORKSPACE_CANCELLATION_RULE (ID: 101..118)
INSERT INTO `workspace_cancellation_rule` (`id`, `created_at`, `updated_at`, `min_hours_before_start`, `refund_percent`, `workspace_id`) VALUES 
(101,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',24,100.00,101),
(102,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',6,50.00,101),
(103,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',0,0.00,101),
(104,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',24,100.00,102),
(105,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',6,50.00,102),
(106,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',0,0.00,102),
(107,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',48,100.00,103),
(108,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',12,50.00,103),
(109,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',0,0.00,103),
(110,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',24,100.00,105),
(111,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',8,50.00,105),
(112,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',0,0.00,105),
(113,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',24,100.00,106),
(114,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',6,50.00,106),
(115,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',0,0.00,106),
(116,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',48,100.00,107),
(117,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',12,50.00,107),
(118,'2026-11-15 15:13:06.886890','2026-11-15 15:13:06.886890',0,0.00,107);

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

