package base.api.feature.operations.service;

import base.api.feature.operations.dto.MaintenanceDtos.*;
import base.api.feature.operations.dto.OperationsDtos.BlockInput;
import base.api.feature.resource.repository.*;
import base.api.feature.resource.service.*;
import base.api.feature.workspace.repository.*;
import base.api.feature.governance.service.IAuditService;
import base.api.shared.entity.resource.*;
import base.api.shared.entity.workspace.AssetMaintenanceLogModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor @Transactional(readOnly=true)
public class MaintenanceScheduleService {
    private final IWorkspaceRepository workspaces;
    private final IFloorPlanRepository floors;
    private final IBookableResourceRepository resources;
    private final IWorkspaceAssetRepository assets;
    private final IAssetMaintenanceLogRepository logs;
    private final IDecorationMaintenanceRepository decorations;
    private final IResourceBlockedSlotRepository blocks;
    private final IResourceLockService locks;
    private final OrganizerOperationsService operations;
    private final base.api.feature.auth.repository.IUserRepository users;
    private final IAuditService audit;

    private void owned(Long actor,Long workspaceId) {
        workspaces.findById(workspaceId).filter(w -> w.getOrganizer().getId().equals(actor))
            .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian."));
    }
    public List<Target> targets(Long actor,Long workspaceId) {
        owned(actor,workspaceId);
        var result=new ArrayList<Target>();
        for(var floor:floors.findByWorkspaceIdOrderByFloorNumberAsc(workspaceId)) {
            var all=resources.findByFloorPlanId(floor.getId());
            for(var r:all) if(r.getStatus()!=BookableResourceStatus.ARCHIVED) result.add(new Target("RESOURCE:"+r.getId(),
                r.getName()==null?r.getLabel():r.getName(),r.getResourceType().getCategory().name(),floor.getFloorNumber(),r.getId(),
                r.getParentRoom()==null?null:r.getParentRoom().getId()));
            for(var d:ResourceCanvas.decorations(floor,true)) {
                var parent=DecorationRoom.parent(d,all,floor,false);
                result.add(new Target("DECORATION:"+floor.getId()+":"+d.id(),d.label(),"DECORATION",floor.getFloorNumber(),null,parent==null?null:parent.getId()));
            }
        }
        for(var asset:assets.findByWorkspaceId(workspaceId)) {
            var resource=asset.getResource();
            result.add(new Target("ASSET:"+asset.getId(),asset.getName(),"ASSET",resource==null?null:resource.getFloorPlan().getFloorNumber(),
                resource==null?null:resource.getId(),resource==null?null:resource.getResourceType().getCategory()==ResourceCategory.ROOM?resource.getId():resource.getParentRoom()==null?null:resource.getParentRoom().getId()));
        }
        return result;
    }
    public List<Schedule> list(Long actor,Long workspaceId,LocalDateTime from,LocalDateTime to) {
        owned(actor,workspaceId);validateRange(from,to);
        var result=new ArrayList<Schedule>();
        for(var b:blocks.findForWorkspace(workspaceId,from,to)) if(b.getBlockType()==ResourceBlockType.MAINTENANCE) {
            var r=b.getResource();result.add(new Schedule("RESOURCE:"+b.getId(),"RESOURCE:"+r.getId(),r.getName()==null?r.getLabel():r.getName(),
                r.getResourceType().getCategory().name(),r.getFloorPlan().getFloorNumber(),b.getStartTime(),b.getEndTime(),b.getReason()));
        }
        for(var log:logs.findByAssetWorkspaceIdOrderByCreatedAtDesc(workspaceId)) {
            if(log.getStatus()!=MaintenanceStatus.SCHEDULED&&log.getStatus()!=MaintenanceStatus.IN_PROGRESS)continue;
            var start=log.getStartedAt()!=null?log.getStartedAt():log.getScheduledAt()!=null?log.getScheduledAt():log.getCreatedAt();
            var end=log.getPlannedEndAt();
            if(start!=null&&start.isBefore(to)&&(end==null||end.isAfter(from)))result.add(new Schedule("ASSET:"+log.getId(),"ASSET:"+log.getAsset().getId(),log.getAsset().getName(),"ASSET",
                log.getAsset().getResource()==null?null:log.getAsset().getResource().getFloorPlan().getFloorNumber(),start,end,log.getDescription()));
        }
        var names=targets(actor,workspaceId).stream().collect(Collectors.toMap(Target::key,t -> t.name()==null?"Đồ bố trí":t.name()));
        for(var d:decorations.overlapping(workspaceId,from,to)) {
            var key="DECORATION:"+d.getFloorPlan().getId()+":"+d.getDecorationId();
            result.add(new Schedule("DECORATION:"+d.getId(),key,names.getOrDefault(key,"Đồ bố trí"),"DECORATION",d.getFloorPlan().getFloorNumber(),d.getStartTime(),d.getEndTime(),d.getReason()));
        }
        result.sort(Comparator.comparing(Schedule::startTime));return result;
    }
    private static void validateRange(LocalDateTime start,LocalDateTime end) {
        if(start==null||end==null||!end.isAfter(start)||Duration.between(start,end).toDays()>366)
            throw new BadRequestException("Chọn khoảng bảo trì hợp lệ, tối đa 366 ngày.");
    }
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public List<Schedule> create(Long actor,Long workspaceId,Input input) {
        workspaces.findOwnedForResourceUpdate(workspaceId, actor).orElseThrow(() -> new NotFoundException("Không tìm thấy không gian."));
        validateRange(input.startTime(),input.endTime());
        if(input.startTime().isBefore(LocalDateTime.now().minusMinutes(2)))throw new BadRequestException("Không tạo bảo trì trong quá khứ.");
        var catalog=targets(actor,workspaceId).stream().collect(Collectors.toMap(Target::key,t->t));
        var selected=input.targetKeys().stream().distinct().map(key->{var t=catalog.get(key);if(t==null)throw new BadRequestException("Đối tượng bảo trì không thuộc không gian.");return t;}).toList();
        var lockIds=selected.stream().map(t->t.resourceId()!=null?t.resourceId():t.parentRoomId()).filter(Objects::nonNull).distinct().sorted().toList();
        if(!lockIds.isEmpty())locks.acquireResourcesLock(lockIds,input.startTime(),input.endTime(),null);
        var existing=list(actor,workspaceId,input.startTime(),input.endTime());
        if(selected.stream().anyMatch(t->existing.stream().anyMatch(s->s.targetKey().equals(t.key()))))throw new ConflictException("Đối tượng đã có lịch bảo trì trùng giờ.");
        var resourceIds=selected.stream().filter(t->t.key().startsWith("RESOURCE:")).map(Target::resourceId).toList();
        if(!resourceIds.isEmpty())operations.createBlocks(actor,workspaceId,new BlockInput(resourceIds,input.startTime(),input.endTime(),ResourceBlockType.MAINTENANCE,input.reason()));
        var reporter=users.getReferenceById(actor);
        for(var target:selected) {
            if(target.key().startsWith("ASSET:")) {
                var asset=assets.findByIdAndWorkspaceId(Long.valueOf(target.key().substring(6)),workspaceId).orElseThrow(()->new NotFoundException("Không tìm thấy tài sản."));
                var log=new AssetMaintenanceLogModel();log.setAsset(asset);log.setMaintenanceType(MaintenanceType.REPAIR);log.setStatus(MaintenanceStatus.SCHEDULED);
                log.setScheduledAt(input.startTime());log.setPlannedEndAt(input.endTime());log.setDescription(input.reason().trim());log.setReportedBy(reporter);logs.save(log);
            } else if(target.key().startsWith("DECORATION:")) {
                var parts=target.key().split(":",3);var d=new DecorationMaintenanceSlotModel();d.setFloorPlan(floors.getReferenceById(Long.valueOf(parts[1])));d.setDecorationId(parts[2]);
                d.setStartTime(input.startTime());d.setEndTime(input.endTime());d.setReason(input.reason().trim());decorations.save(d);
            }
        }
        audit.log(reporter,"MAINTENANCE","CREATE","Workspace",workspaceId,"Tạo lịch bảo trì cho "+selected.size()+" đối tượng.");
        return list(actor,workspaceId,input.startTime(),input.endTime());
    }
    @Transactional public void remove(Long actor,Long workspaceId,String key) {
        workspaces.findOwnedForResourceUpdate(workspaceId, actor).orElseThrow(() -> new NotFoundException("Không tìm thấy không gian."));
        var parts=key.split(":",2);long id;
        try {id=Long.parseLong(parts[1]);}catch(Exception e){throw new BadRequestException("Mã lịch bảo trì không hợp lệ.");}
        switch(parts[0]) {
            case "RESOURCE" -> operations.deleteBlock(actor,workspaceId,id);
            case "ASSET" -> {
                var log=logs.findById(id).filter(l->l.getAsset().getWorkspace().getId().equals(workspaceId)).orElseThrow(()->new NotFoundException("Không tìm thấy lịch."));
                // Keep historical evidence; cancel the overlay without changing inventory activation.
                log.setStatus(MaintenanceStatus.CANCELLED);logs.save(log);
                if(log.getPlannedEndAt()==null&&log.getAsset().getStatus()==AssetStatus.UNDER_MAINTENANCE)log.getAsset().setStatus(AssetStatus.IN_USE);
            }
            case "DECORATION" -> {
                var d=decorations.findById(id).filter(l->l.getFloorPlan().getWorkspace().getId().equals(workspaceId)).orElseThrow(()->new NotFoundException("Không tìm thấy lịch."));decorations.delete(d);
            }
            default -> throw new BadRequestException("Mã lịch bảo trì không hợp lệ.");
        }
        audit.log(users.getReferenceById(actor),"MAINTENANCE","REMOVE","Workspace",workspaceId,key);
    }
}
