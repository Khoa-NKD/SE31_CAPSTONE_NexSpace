# Quy tắc viết API mới — NexSpace BE (spring-starter)

Mọi API mới phải theo đúng mẫu của `feature/auth`. Đọc `AuthController`, `AdminUserController`,
`UserServiceImpl` trước khi viết module đầu tiên.

---

## 1. Cấu trúc thư mục

Mỗi nghiệp vụ là một package `feature/<module>`. Tên module viết thường, số ít: `organizer`, `workspace`,
`booking`, `payment`...

```
base.api
├── feature/<module>/
│   ├── controller/      <Tên>Controller, Admin<Tên>Controller
│   ├── dto/request/     Create<Tên>Dto, Update<Tên>Dto, ...
│   ├── dto/response/    <Tên>Dto, <Tên>DetailDto
│   ├── mapper/          <Tên>Mapper (static, không state)
│   ├── repository/      I<Tên>Repository
│   └── service/         I<Tên>Service
│       └── impl/        <Tên>ServiceImpl
└── shared/
    ├── entity/<nhóm>/   <Tên>Model   (đã map đủ 42 bảng — KHÔNG tạo entity trong feature/)
    ├── enums/           enum dùng chung
    ├── exception/       BadRequest / NotFound / Conflict / Forbidden / Unauthorized
    └── base/            BaseAPIController
```

- Repository của một entity chỉ đặt **một chỗ**, trong module "chủ" của bảng đó. Module khác cần dùng thì inject service hoặc repository của module chủ, không tạo repository thứ hai cho cùng entity.
- File > 400 dòng thì tách ra (VD: `WorkspaceServiceImpl` và `WorkspaceReviewServiceImpl`).

## 2. Đặt tên URL

| Loại | Quy tắc | Ví dụ |
|---|---|---|
| Prefix | `/api/...` | `/api/workspaces` |
| Tài nguyên | danh từ số nhiều, kebab-case | `/api/floor-plans`, `/api/resource-types` |
| Tài nguyên con | lồng tối đa 2 cấp | `/api/workspaces/{id}/operating-hours` |
| Của user hiện tại | `/me` | `/api/organizer-profile/me` |
| Admin | `/api/admin/...` (SecurityConfig đã chặn chỉ ADMIN) | `/api/admin/workspaces` |
| Hành động đổi trạng thái | `POST /{id}/<động-từ>` | `POST /api/admin/workspaces/{id}/approve` |

| Method | Dùng cho | Trả về |
|---|---|---|
| GET | đọc, có phân trang nếu là danh sách | `success(...)` / `successPage(...)` |
| POST | tạo mới | `created(..., "Tạo ... thành công")` → **201** |
| PUT | cập nhật toàn bộ | `success(..., "Cập nhật ... thành công")` |
| PATCH | cập nhật 1 phần / 1 trường | `success(...)` |
| DELETE | xoá | `success(null, "Xoá ... thành công")` |

## 3. Controller

```java
@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ORGANIZER')")
@Tag(name = "Organizer - Workspaces", description = "Quản lý không gian của Organizer")
public class WorkspaceController extends BaseAPIController {

    private final IWorkspaceService workspaceService;

    @Operation(summary = "Danh sách không gian của tôi")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponseDTO<WorkspaceDto>>> getMine(
            @ModelAttribute PageRequestDTO pageRequest,
            @RequestParam(required = false) WorkspaceStatus status) {
        return successPage(workspaceService.getMyWorkspaces(getCurrentUserId(), pageRequest, status));
    }

    @Operation(summary = "Tạo không gian (nháp)")
    @PostMapping
    public ResponseEntity<ApiResponse<WorkspaceDto>> create(@Valid @RequestBody CreateWorkspaceDto dto) {
        return created(workspaceService.create(getCurrentUserId(), dto), "Tạo không gian thành công");
    }
}
```

Quy tắc:
- **Luôn** `extends BaseAPIController` và trả `ResponseEntity<ApiResponse<T>>` qua `success` / `created` / `successPage`.
  Không tự `new ApiResponse`, không trả entity.
- Controller **không có logic nghiệp vụ**: nhận request, gọi service, trả kết quả. Không inject repository vào controller.
- Lấy user hiện tại bằng `getCurrentUserId()`. **Không bao giờ** nhận `userId` / `organizerId` của người gọi
  từ body hay query.
- Body luôn có `@Valid @RequestBody`. Path id là `Long`.
- **Phân quyền:**
  - đặt `@PreAuthorize("hasRole('ORGANIZER')")` / `hasRole('ADMIN')` / `hasRole('USER')` ở class hoặc method;
  - role hiện có: `USER` (Customer), `ORGANIZER`, `ADMIN`.
- **Endpoint public** (không cần JWT), phải làm cả 2 bước:
  1. thêm path vào `SecurityConfig.PUBLIC_ENDPOINTS`;
  2. gắn `@SecurityRequirements` để Swagger không đòi token.
- **Swagger:**
  - `@Tag` một cái cho mỗi controller, đặt tên dạng `"<Vai trò> - <Nghiệp vụ>"`;
  - `@Operation(summary = ...)` viết tiếng Việt;
  - endpoint public thì ghi `**Public.**` ở đầu `description`.
- Message thành công viết tiếng Việt, dạng "<Hành động> ... thành công".

## 4. DTO

**Request** (`dto/request`): dùng `@Data`, có validation, message lỗi bằng tiếng Việt.

```java
@Data
public class CreateWorkspaceDto {
    @NotBlank(message = "Tên không gian không được để trống")
    @Size(max = 255, message = "Tên không gian tối đa 255 ký tự")
    private String name;

    @NotNull(message = "Loại không gian không được để trống")
    private WorkspaceCategory category;

    @DecimalMin(value = "0", inclusive = false, message = "Diện tích phải lớn hơn 0")
    private BigDecimal areaSqm;
}
```

**Response** (`dto/response`): dùng `@Value @Builder` (bất biến), giống `UserDto`.

```java
@Value
@Builder
public class WorkspaceDto {
    Long id;
    String name;
    WorkspaceCategory category;
    WorkspaceStatus status;
    LocalDateTime createdAt;
}
```

Quy tắc:
- Request DTO **không chứa** `id`, `status`, `createdAt`, `organizerId`, `reviewedBy`. Các trường này do server quyết định.
- **Mỗi hành động một DTO riêng** (`CreateXxxDto`, `UpdateXxxDto`, `RejectXxxDto`). Không dùng chung một DTO cho mọi việc.
- **Response không lộ dữ liệu nhạy cảm:** `password`, `*_hash`, `two_factor_secret`; số tài khoản ngân hàng chỉ hiện 4 số cuối
  (trừ màn duyệt của Admin).
- Danh sách trả DTO gọn (`XxxDto`); màn chi tiết trả `XxxDetailDto` kèm dữ liệu con.
- Tiền dùng `BigDecimal`, thời gian dùng `LocalDateTime` / `LocalDate` / `LocalTime`.

## 5. Mapper

```java
public final class WorkspaceMapper {
    private WorkspaceMapper() {
    }

    public static WorkspaceDto toDto(WorkspaceModel w) {
        if (w == null) {
            return null;
        }
        return WorkspaceDto.builder()
                .id(w.getId())
                .name(w.getName())
                .category(w.getCategory())
                .status(w.getStatus())
                .createdAt(w.getCreatedAt())
                .build();
    }
}
```

- `final class` + constructor private + method `static`. Không inject bean và không gọi repository trong mapper.
- Trong mapper chỉ đụng tới quan hệ LAZY đã được fetch sẵn (`JOIN FETCH` / `@EntityGraph`), nếu không sẽ bị N+1
  hoặc `LazyInitializationException`.

## 6. Service

```java
public interface IWorkspaceService {
    Page<WorkspaceDto> getMyWorkspaces(Long organizerId, PageRequestDTO pageRequest, WorkspaceStatus status);
    WorkspaceDto create(Long organizerId, CreateWorkspaceDto dto);
    WorkspaceDto submit(Long organizerId, Long workspaceId);
}

@Service
@RequiredArgsConstructor
public class WorkspaceServiceImpl implements IWorkspaceService {

    private static final Set<String> SORTABLE_FIELDS = Set.of("id", "name", "createdAt", "status");

    private final IWorkspaceRepository workspaceRepository;
    private final IUserRepository userRepository;

    @Override
    @Transactional
    public WorkspaceDto submit(Long organizerId, Long workspaceId) {
        WorkspaceModel ws = findOwned(organizerId, workspaceId);
        if (ws.getStatus() != WorkspaceStatus.DRAFT && ws.getStatus() != WorkspaceStatus.REJECTED) {
            throw new ConflictException("Chỉ nộp được không gian ở trạng thái Nháp hoặc Bị từ chối");
        }
        ws.setStatus(WorkspaceStatus.PENDING_REVIEW);
        ws.setSubmittedAt(LocalDateTime.now());
        return WorkspaceMapper.toDto(ws);
    }

    private WorkspaceModel findOwned(Long organizerId, Long workspaceId) {
        WorkspaceModel ws = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian"));
        if (!ws.getOrganizer().getId().equals(organizerId)) {
            throw new NotFoundException("Không tìm thấy không gian"); // không tiết lộ là của người khác
        }
        return ws;
    }
}
```

Quy tắc:
- **Interface và impl:** interface đặt tên `I<Tên>Service`, impl đặt trong `service/impl`. Inject bằng constructor
  (`@RequiredArgsConstructor` + `private final`), không dùng `@Autowired` cho field.
- **Transaction:**
  - method chỉ đọc dùng `@Transactional(readOnly = true)`;
  - method ghi dùng `@Transactional`;
  - một thao tác nghiệp vụ nằm trọn trong một transaction (VD: đặt chỗ = kiểm tra trùng + trừ quota + giữ mã KM).
- **Tham số:** người thực hiện luôn truyền vào dưới dạng `Long actorId` / `organizerId` / `customerId`,
  đặt làm tham số đầu tiên. Service không tự đọc SecurityContext.
- **Ownership:** Organizer chỉ được đụng tài nguyên của mình. Không phải của mình thì ném `NotFoundException`,
  giống như không tồn tại.
- **Chuyển trạng thái:** kiểm tra trạng thái hiện tại trước khi đổi; sai trạng thái thì `ConflictException`.
  Không cho client tự set `status` bằng PUT.
- **Audit:** thao tác nhạy cảm (duyệt, từ chối, khoá, huỷ, hoàn tiền, đổi cấu hình) phải ghi `audit_log`:
  người làm, trạng thái cũ và mới, lý do.
- **Cấu hình:** con số nghiệp vụ (thời gian giữ chỗ, % hoa hồng, số lần OTP...) lấy từ `platform_setting`,
  không hardcode. Hằng số kỹ thuật thì đặt `static final`.
- **Nhỏ gọn:** mỗi method dưới 50 dòng, logic dài thì tách method private.
- Tuyệt đối không `catch (Exception e)` rồi nuốt lỗi.

## 7. Repository

```java
@Repository
public interface IWorkspaceRepository extends JpaRepository<WorkspaceModel, Long> {

    @Query("""
            SELECT w FROM WorkspaceModel w
            WHERE w.organizer.id = :organizerId
              AND (:status IS NULL OR w.status = :status)
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<WorkspaceModel> searchByOrganizer(@Param("organizerId") Long organizerId,
                                           @Param("status") WorkspaceStatus status,
                                           @Param("search") String search,
                                           Pageable pageable);
}
```

- Tên interface `I<Tên>Repository`, `extends JpaRepository<<Tên>Model, Long>`.
- **Query:** query đơn giản thì dùng derived query (`findByOrganizerId`); query lọc nhiều điều kiện thì dùng `@Query`
  JPQL + `@Param`. Mẫu cho tham số tuỳ chọn là `(:x IS NULL OR ...)`.
- **Cấm** ghép chuỗi vào câu query, kể cả native query.
- **Phân trang:** danh sách luôn phân trang, dùng `pageRequest.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS)`.
  Mỗi service tự khai báo allowlist `SORTABLE_FIELDS`, để client không sort được theo cột tuỳ ý.
- **Tránh N+1:** DTO cần quan hệ con thì dùng `JOIN FETCH` / `@EntityGraph`.
- **Chống race condition** (đặt trùng chỗ, trừ quota, 2 admin cùng duyệt):
  - `@Lock(LockModeType.PESSIMISTIC_WRITE)` trên query lấy bản ghi;
  - hoặc `UPDATE ... WHERE <điều kiện>` rồi kiểm tra số dòng bị ảnh hưởng.

## 8. Lỗi và response

Response luôn có dạng (xem `ApiResponse`):

```json
{ "success": true, "data": { ... }, "message": "...", "statusCode": 200 }
```

Danh sách phân trang có `data` như sau (xem `PageResponseDTO`; `page` bắt đầu từ **1**):

```json
{ "listObjects": [], "pageNumber": 1, "pageSize": 20, "totalRecords": 0, "totalPages": 0, "hasNext": false, "hasPrevious": false }
```

Khi lỗi, chỉ cần `throw`; `GlobalExceptionHandler` tự trả response chuẩn.

| Tình huống | Exception | HTTP |
|---|---|---|
| Dữ liệu sai nghiệp vụ (VD: giờ kết thúc < giờ bắt đầu) | `BadRequestException` | 400 |
| Validation `@Valid` fail | (tự động) | 400 + `errors` theo field |
| Chưa đăng nhập | `UnauthorizedException` | 401 |
| Có đăng nhập nhưng không đủ quyền | `ForbiddenException` / `@PreAuthorize` | 403 |
| Không tồn tại / không phải của mình | `NotFoundException` | 404 |
| Sai trạng thái, trùng dữ liệu (MST, mã KM, trùng lịch) | `ConflictException` | 409 |

- Message lỗi viết tiếng Việt, dễ hiểu với người dùng. Không đưa vào message: stack trace, tên bảng, câu SQL, id nội bộ của người khác.
- Không trả `500` có chủ đích. Mọi lỗi dự đoán được phải map về một trong các exception ở bảng trên.

## 9. Entity và DB

Đã map sẵn 42 bảng trong `shared/entity`. Khi cần sửa hoặc thêm bảng thì theo các quy tắc sau.

- **Khoá và timestamp:** `extends BaseModel`, có sẵn `id` (BIGINT tự tăng), `created_at`, `updated_at`.
- **Tên:** `@Table(name = "snake_case_so_it")` theo tên trong thiết kế; tên cột viết snake_case.
- **Enum:** `@Enumerated(EnumType.STRING)` **+ `@JdbcTypeCode(SqlTypes.VARCHAR)`** + `length`. Nếu thiếu
  `@JdbcTypeCode`, Hibernate tạo kiểu `enum(...)` của MariaDB, và thêm giá trị mới sẽ phải ALTER bằng tay.
- **Kiểu dữ liệu:**
  - tiền dùng `BigDecimal`, `precision = 18, scale = 2`;
  - JSON / văn bản dài dùng `columnDefinition = "TEXT"` hoặc `"LONGTEXT"`.
- **Quan hệ:** mặc định `@ManyToOne(fetch = FetchType.LAZY)`. Xoá cha thì xoá con theo bằng
  `@OnDelete(action = OnDeleteAction.CASCADE)`. Ràng buộc dữ liệu dùng `@Check(name = "ck_...", constraints = "...")`.
- **Thêm cột `NOT NULL` vào bảng đã có dữ liệu:** bắt buộc kèm `@ColumnDefault(...)`.
- **Trước khi chạy lên DB server** (`ddl-auto=update` tự áp vào DB): chạy thử với MySQL local
  (`spring-starter-mysql`, cổng 3307) và xem DDL có lỗi không.
- **Đổi tên hoặc xoá cột:** `ddl-auto=update` **không** làm được việc này. Phải viết SQL migration và báo cả nhóm.

## 10. Test

- Mỗi service mới có unit test trong `src/test/java/...` cùng package, theo mẫu `UserServiceImplTest`:
  JUnit 5, Mockito mock repository, AssertJ.
- Tên test mô tả hành vi, VD: `submitThrowsConflictWhenWorkspaceAlreadyPending`.
- **Tối thiểu cần có:**
  - 1 case thành công;
  - mỗi nhánh lỗi nghiệp vụ (sai trạng thái, không phải chủ, trùng dữ liệu) có 1 case;
  - validate đầu vào quan trọng.
- Chạy `./mvnw test` phải xanh trước khi đẩy code.

## 11. Checklist trước khi coi là xong

- [ ] Đúng cấu trúc `feature/<module>/...`; controller không có logic, không inject repository
- [ ] Có `@PreAuthorize` đúng role; endpoint public đã thêm vào `PUBLIC_ENDPOINTS` + `@SecurityRequirements`
- [ ] Không nhận id người gọi từ client; đã kiểm tra ownership
- [ ] Request DTO có validation + message tiếng Việt; response không trả entity, không lộ dữ liệu nhạy cảm
- [ ] Danh sách có phân trang + allowlist sort
- [ ] Chuyển trạng thái có kiểm tra trạng thái hiện tại; thao tác nhạy cảm có ghi `audit_log`
- [ ] Không N+1 (đã `JOIN FETCH` khi mapper cần quan hệ con)
- [ ] Có unit test; `./mvnw test` pass
- [ ] Mở Swagger (`/swagger-ui.html`), gọi thử từng endpoint với đúng role và sai role
- [ ] Cập nhật bảng API trong `README.md`
