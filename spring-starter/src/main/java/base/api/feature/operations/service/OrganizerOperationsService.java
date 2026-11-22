package base.api.feature.operations.service;

import base.api.feature.operations.dto.OperationsDtos.*;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.pricing.repository.IPricingRuleRepository;
import base.api.feature.resource.repository.*;
import base.api.feature.resource.service.IResourceLockService;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.pricing.PricingRuleModel;
import base.api.shared.entity.resource.*;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly=true)
public class OrganizerOperationsService {
    private final IWorkspaceRepository workspaces;
    private final IBookableResourceRepository resources;
    private final IResourceTypeRepository types;
    private final IPricingRuleRepository rules;
    private final IResourceBlockedSlotRepository blocks;
    private final IResourceLockService locks;
    private final IUserRepository users;
    private final IAuditService audit;

    private WorkspaceModel owned(Long actor, Long workspaceId) {
        return workspaces.findByIdAndOrganizerId(workspaceId, actor)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy workspace thuộc quyền quản lý."));
    }
    private WorkspaceModel ownedForUpdate(Long actor, Long workspaceId) {
        return workspaces.findOwnedForResourceUpdate(workspaceId, actor)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy workspace thuộc quyền quản lý."));
    }
    private BookableResourceModel resource(Long id, Long workspaceId) {
        return resources.findDetailedById(id).filter(r -> r.getFloorPlan() != null
                && r.getFloorPlan().getWorkspace().getId().equals(workspaceId))
                .orElseThrow(() -> new NotFoundException("Ghế/phòng không thuộc workspace này."));
    }
    private static String money(BigDecimal value) { return value == null ? null : value.toPlainString(); }

    public Pricing pricing(Long actor, Long workspaceId) {
        owned(actor, workspaceId);
        var rateTypes = types.findByWorkspaceId(workspaceId).stream().map(t -> new RateType(t.getId(),
                t.getName(), t.getCategory(), t.getCurrency(), money(t.getPricePerHour()),
                money(t.getPricePerDay()), money(t.getPricePerMonth()), t.isActive())).toList();
        var inventory = resources.findByFloorPlanWorkspaceId(workspaceId)
                .stream().sorted(Comparator.comparing(BookableResourceModel::getId)).map(r -> {
                    var t = r.getResourceType();
                    return new Resource(r.getId(), r.getLabel(), r.getName(), t.getId(), t.getName(),
                            t.getCategory(), r.getFloorPlan().getFloorNumber(), r.getStatus(),
                            r.getParentRoom() == null ? null : r.getParentRoom().getId(), t.getCurrency(),
                            money(r.getPricePerHour() == null ? t.getPricePerHour() : r.getPricePerHour()),
                            money(t.getPricePerDay()));
                }).toList();
        return new Pricing(rateTypes, inventory, rules.findByWorkspaceId(workspaceId).stream()
                .sorted(Comparator.comparing(PricingRuleModel::getId)).map(OrganizerOperationsService::rule).toList());
    }
    private static Rule rule(PricingRuleModel r) {
        return new Rule(r.getId(), r.getName(), r.getResourceType() == null ? null : r.getResourceType().getId(),
                r.getResource() == null ? null : r.getResource().getId(), r.getModifierType(), r.getStartDate(),
                r.getEndDate(), r.getStartTime(), r.getEndTime(), money(r.getMultiplier()),
                money(r.getFixedAmount()), r.getPriority(), r.isActive());
    }
    public static void validateRule(RuleInput input) {
        if (input.resourceId() != null && input.resourceTypeId() != null)
            throw new BadRequestException("Chọn một phạm vi: loại chỗ hoặc ghế/phòng cụ thể.");
        if ((input.startDate() == null) != (input.endDate() == null)
                || input.startDate() != null && input.endDate().isBefore(input.startDate()))
            throw new BadRequestException("Ngày áp dụng phải đủ hai mốc và ngày kết thúc không trước ngày bắt đầu.");
        if ((input.startTime() == null) != (input.endTime() == null)
                || input.startTime() != null && !input.endTime().isAfter(input.startTime()))
            throw new BadRequestException("Khung giờ phải đủ hai mốc và kết thúc sau bắt đầu trong cùng ngày.");
        if (input.modifierType() == PricingModifierType.PEAK_HOUR && input.startTime() == null)
            throw new BadRequestException("Quy tắc giờ cao điểm cần có khung giờ.");
        if (input.modifierType() == PricingModifierType.HOLIDAY && input.startDate() == null)
            throw new BadRequestException("Quy tắc ngày lễ cần có ngày áp dụng cụ thể.");
        if (input.name() == null || input.name().isBlank()) throw new BadRequestException("Tên quy tắc không được để trống.");
        if (input.multiplier() == null || input.multiplier().compareTo(BigDecimal.ONE) < 0
                || input.fixedAmount() == null || input.fixedAmount().signum() < 0)
            throw new BadRequestException("Hệ số phải từ 1 và phụ thu không được âm.");
    }
    @Transactional
    public Rule saveRule(Long actor, Long workspaceId, Long id, RuleInput input) {
        validateRule(input);
        var workspace = ownedForUpdate(actor, workspaceId);
        var row = id == null ? new PricingRuleModel() : rules.findById(id)
                .filter(r -> r.getWorkspace().getId().equals(workspaceId))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy quy tắc giá."));
        var type = input.resourceTypeId() == null ? null : types.findById(input.resourceTypeId())
                .filter(t -> t.getWorkspace().getId().equals(workspaceId))
                .orElseThrow(() -> new NotFoundException("Loại chỗ không thuộc workspace này."));
        var target = input.resourceId() == null ? null : resource(input.resourceId(), workspaceId);
        // A workspace-wide monetary surcharge cannot mix VND and USD without an approved FX policy.
        var currencies = types.findByWorkspaceId(workspaceId).stream().filter(ResourceTypeModel::isActive)
                .map(ResourceTypeModel::getCurrency).distinct().count();
        if (type == null && target == null && input.fixedAmount().signum() > 0 && currencies > 1)
            throw new BadRequestException("Workspace có nhiều tiền tệ: chọn loại chỗ hoặc ghế/phòng khi phụ thu số tiền cố định.");
        row.setWorkspace(workspace); row.setResourceType(type); row.setResource(target);
        row.setName(input.name().trim()); row.setModifierType(input.modifierType());
        row.setStartDate(input.startDate()); row.setEndDate(input.endDate());
        row.setStartTime(input.startTime()); row.setEndTime(input.endTime());
        row.setMultiplier(input.multiplier()); row.setFixedAmount(input.fixedAmount());
        row.setPriority(input.priority()); row.setActive(input.active());
        row = rules.saveAndFlush(row);
        audit.log(workspace.getOrganizer(), "PRICING", id == null ? "CREATE" : "UPDATE", "PricingRule", row.getId(), row.getName());
        return rule(row);
    }
    @Transactional
    public void deleteRule(Long actor, Long workspaceId, Long id) {
        var workspace = ownedForUpdate(actor, workspaceId);
        var row = rules.findById(id).filter(r -> r.getWorkspace().getId().equals(workspaceId))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy quy tắc giá."));
        rules.delete(row);
        audit.log(workspace.getOrganizer(), "PRICING", "DELETE", "PricingRule", id, row.getName());
    }
    public List<Block> blocks(Long actor, Long workspaceId, LocalDateTime from, LocalDateTime to) {
        owned(actor, workspaceId);
        if (from == null || to == null || !from.isBefore(to) || Duration.between(from, to).toDays() > 366)
            throw new BadRequestException("Chọn khoảng thời gian hợp lệ, tối đa 366 ngày.");
        return blocks.findForWorkspace(workspaceId, from, to).stream().map(OrganizerOperationsService::block).toList();
    }
    private static Block block(ResourceBlockedSlotModel row) {
        var r = row.getResource();
        return new Block(row.getId(), r.getId(), r.getName() == null ? r.getLabel() : r.getName(),
                r.getFloorPlan().getFloorNumber(), r.getParentRoom() == null ? null : r.getParentRoom().getId(),
                row.getBlockType(), row.getStartTime(), row.getEndTime(), row.getReason());
    }
    // Read reservations committed while waiting for the ordered resource locks.
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public List<Block> createBlocks(Long actor, Long workspaceId, BlockInput input) {
        owned(actor, workspaceId);
        if (input.blockType() != ResourceBlockType.MAINTENANCE)
            throw new BadRequestException("Chỉ hỗ trợ tạo lịch bảo trì.");
        if (input.startTime() == null || input.endTime() == null || !input.startTime().isBefore(input.endTime())
                || input.startTime().isBefore(LocalDateTime.now().minusMinutes(2)) || input.reason() == null || input.reason().isBlank())
            throw new BadRequestException("Cần lý do và thời gian hợp lệ trong tương lai.");
        if (input.resourceIds() == null || input.resourceIds().isEmpty() || input.resourceIds().size() > 200)
            throw new BadRequestException("Chọn từ 1 đến 200 ghế/phòng.");
        var ids = input.resourceIds().stream().distinct().sorted().toList();
        var targets = ids.stream().map(id -> resource(id, workspaceId))
                .filter(r -> r.getParentRoom() == null || !ids.contains(r.getParentRoom().getId())).toList();
        // Use the same ordered room/desk locks as checkout; the entire batch succeeds or rolls back.
        locks.acquireResourcesLock(ids, input.startTime(), input.endTime(), null);
        var actorUser = users.getReferenceById(actor);
        var saved = targets.stream().map(r -> {
            var row = new ResourceBlockedSlotModel(); row.setResource(r); row.setCreatedBy(actorUser);
            row.setStartTime(input.startTime()); row.setEndTime(input.endTime());
            row.setReason(input.reason().trim()); row.setBlockType(input.blockType());
            return blocks.save(row);
        }).toList();
        blocks.flush();
        saved.forEach(r -> audit.log(actorUser, "BLOCKOUT", "CREATE", "ResourceBlockedSlot", r.getId(), r.getReason()));
        return saved.stream().map(OrganizerOperationsService::block).toList();
    }
    @Transactional
    public void deleteBlock(Long actor, Long workspaceId, Long id) {
        var workspace = owned(actor, workspaceId);
        var row = blocks.findById(id).filter(b -> b.getResource().getFloorPlan().getWorkspace().getId().equals(workspaceId))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch ngừng nhận đặt."));
        // Serializing on the blocked resource also serializes competing removals.
        resources.findByIdForUpdate(row.getResource().getId());
        blocks.delete(row);
        audit.log(workspace.getOrganizer(), "BLOCKOUT", "DELETE", "ResourceBlockedSlot", id, row.getReason());
    }
}
